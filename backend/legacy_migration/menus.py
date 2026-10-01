from dataclasses import dataclass, field
from typing import Any
import uuid


def _norm_url(url: str | None) -> str | None:
    if not url or not str(url).strip():
        return None
    return str(url).strip().lower().rstrip("/") or "/"


def _norm_text(value: str | None) -> str:
    return (value or "").strip().lower()


@dataclass
class CatalogResult:
    rows: list[dict[str, Any]]
    mapping: dict[str, dict[str, uuid.UUID]]
    stats: dict[str, Any]
    name_variants: dict[str, list[str]] = field(default_factory=dict)


def _menu_keys(menus: list[dict[str, Any]]) -> dict[str, tuple]:
    by_id = {str(m["id"]): m for m in menus}
    cache: dict[str, tuple] = {}

    def key_for(menu_id: str, seen: frozenset = frozenset()) -> tuple:
        if menu_id in cache:
            return cache[menu_id]
        menu = by_id[menu_id]
        url = _norm_url(menu.get("url"))
        if url:
            key: tuple = ("url", url)
        else:
            parent_id = menu.get("parent_id")
            parent_key: tuple = ()
            if parent_id and str(parent_id) in by_id and str(parent_id) not in seen:
                parent_key = key_for(str(parent_id), seen | {menu_id})
            key = ("group", _norm_text(menu.get("name")), _norm_text(menu.get("level")), parent_key)
        cache[menu_id] = key
        return key

    return {mid: key_for(mid) for mid in by_id}


def build_catalog(platform_menus: list[dict[str, Any]], tenant_menus: dict[str, list[dict[str, Any]]]) -> CatalogResult:
    """Merge the platform menus and every tenant's menu copy into one shared catalog.

    Platform menus keep their ids. A tenant menu matches a catalog menu by url, or by name, level and
    parent for menus without a url. A tenant menu with no match is added to the catalog, with a new id
    when its own id is already taken.
    """
    catalog: dict[tuple, dict[str, Any]] = {}
    used_ids: set[str] = set()
    variants: dict[tuple, set[str]] = {}

    platform_keys = _menu_keys(platform_menus)
    for menu in sorted(platform_menus, key=lambda m: _norm_text(m.get("level"))):
        key = platform_keys[str(menu["id"])]
        if key in catalog:
            continue
        catalog[key] = {
            "id": menu["id"],
            "name": menu.get("name"),
            "url": menu.get("url"),
            "level": menu.get("level"),
            "parent_id": menu.get("parent_id"),
            "display_order": menu.get("display_order") or 0,
        }
        used_ids.add(str(menu["id"]))
        variants.setdefault(key, set()).add(str(menu.get("name")))

    for row in catalog.values():
        parent = row["parent_id"]
        if parent is None:
            continue
        parent_key = platform_keys.get(str(parent))
        row["parent_id"] = catalog[parent_key]["id"] if parent_key in catalog else None

    mapping: dict[str, dict[str, uuid.UUID]] = {}
    matched = created = 0
    for client_name, menus in tenant_menus.items():
        keys = _menu_keys(menus)
        local: dict[str, uuid.UUID] = {}
        for menu in sorted(menus, key=lambda m: _norm_text(m.get("level"))):
            mid = str(menu["id"])
            key = keys[mid]
            variants.setdefault(key, set()).add(str(menu.get("name")))
            existing = catalog.get(key)
            if existing is not None:
                matched += 1
                if (not existing["display_order"]) and menu.get("display_order"):
                    existing["display_order"] = menu["display_order"]
                local[mid] = existing["id"]
                continue
            new_id = menu["id"] if mid not in used_ids else uuid.uuid4()
            used_ids.add(str(new_id))
            parent = menu.get("parent_id")
            catalog[key] = {
                "id": new_id,
                "name": menu.get("name"),
                "url": menu.get("url"),
                "level": menu.get("level"),
                "parent_id": local.get(str(parent)) if parent else None,
                "display_order": menu.get("display_order") or 0,
            }
            local[mid] = new_id
            created += 1
        mapping[client_name] = local

    rows = sorted(catalog.values(), key=lambda r: (_norm_text(r["level"]), str(r["name"])))
    name_variants = {
        "|".join(str(part) for part in key[:2]): sorted(names) for key, names in variants.items() if len(names) > 1
    }
    stats = {
        "platform_menus": len(platform_menus),
        "tenant_menus": sum(len(m) for m in tenant_menus.values()),
        "catalog_menus": len(rows),
        "tenant_menus_matched": matched,
        "tenant_menus_added_to_catalog": created,
        "menus_with_name_variants": len(name_variants),
    }
    return CatalogResult(rows=rows, mapping=mapping, stats=stats, name_variants=name_variants)
