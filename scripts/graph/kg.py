import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GRAPH = ROOT / "docs" / "graph" / "graph.jsonl"
VIEWS = ROOT / "docs" / "graph" / "views"
MODULE_DOCS = ROOT / "docs" / "modules"

PREFIX = {
    "Module": "module:",
    "Feature": "feature:",
    "Flow": "flow:",
    "Decision": "decision:",
    "Concept": "concept:",
    "Endpoint": "endpoint:",
    "Service": "service:",
    "Table": "table:",
    "WebPage": "web:",
    "MobileScreen": "mobile:",
    "Job": "job:",
}
TYPE_BY_PREFIX = {v: k for k, v in PREFIX.items()}
ALL_TYPES = set(PREFIX)
COMPONENTS = {"Endpoint", "Service", "Table", "WebPage", "MobileScreen", "Job"}
FILE_ROOTS = {"Service": "backend", "Job": "backend", "WebPage": "web", "MobileScreen": "mobile"}
MODULE_SCOPED = {"Feature", "Flow", "Decision", "Concept"}

RELATIONS = {
    "part_of": ({"Feature", "Concept", "Flow"}, {"Module"}),
    "implements": ({"Flow"}, {"Feature"}),
    "implemented_by": ({"Feature"}, COMPONENTS),
    "uses": ({"Flow"}, COMPONENTS),
    "calls": ({"WebPage", "MobileScreen"}, {"Endpoint"}),
    "handled_by": ({"Endpoint"}, {"Service"}),
    "reads": ({"Service", "Job"}, {"Table"}),
    "writes": ({"Service", "Job"}, {"Table"}),
    "enqueues": ({"Endpoint", "Service"}, {"Job"}),
    "shapes": ({"Decision"}, ALL_TYPES - {"Decision"}),
    "supersedes": ({"Decision"}, {"Decision"}),
    "depends_on": ({"Feature", "Flow"}, {"Feature", "Flow"}),
    "relates_to": ({"Concept"}, ALL_TYPES),
}

REQUIRED = {
    "Module": ["Summary: ", "Doc: "],
    "Feature": ["Summary: "],
    "Flow": ["Step 1: "],
    "Decision": ["Decision: ", "Why: "],
    "Concept": ["Definition: "],
}

SLUG = r"[a-z0-9]+(?:-[a-z0-9]+)*"
NAME_PATTERNS = {
    "Module": re.compile(rf"^module:{SLUG}$"),
    "Feature": re.compile(rf"^feature:{SLUG}/{SLUG}$"),
    "Flow": re.compile(rf"^flow:{SLUG}/{SLUG}$"),
    "Decision": re.compile(rf"^decision:{SLUG}/{SLUG}$"),
    "Concept": re.compile(rf"^concept:{SLUG}/{SLUG}$"),
    "Endpoint": re.compile(r"^endpoint:(GET|POST|PUT|PATCH|DELETE) /[A-Za-z0-9_\-/{}.]*$"),
    "Service": re.compile(r"^service:app/\S+\.py$"),
    "Job": re.compile(r"^job:app/\S+\.py$"),
    "Table": re.compile(r"^table:(public\.)?[a-z][a-z0-9_]*$"),
    "WebPage": re.compile(r"^web:src/\S+\.(tsx|ts)$"),
    "MobileScreen": re.compile(r"^mobile:(app|src|components|contexts|hooks|services|utils|constants)/\S+\.(tsx|ts)$"),
}

REF_PATTERN = re.compile(r"\[((?:" + "|".join(p.rstrip(":") for p in PREFIX.values()) + r"):(?:[^\[\]]|\[[^\[\]]*\])+)\]")
STEP_PATTERN = re.compile(r"^Step (\d+): ")


def module_of(name):
    kind = TYPE_BY_PREFIX.get(name.split(":", 1)[0] + ":")
    if kind == "Module":
        return name.split(":", 1)[1]
    if kind in MODULE_SCOPED:
        return name.split(":", 1)[1].split("/", 1)[0]
    return None


def label(name):
    return name.split(":", 1)[1]


def load(paths):
    entities, relations, problems = {}, [], []
    for path in paths:
        text = Path(path).read_text(encoding="utf-8") if Path(path).exists() else ""
        for lineno, line in enumerate(text.splitlines(), 1):
            if not line.strip():
                continue
            where = f"{Path(path).name}:{lineno}"
            try:
                item = json.loads(line)
            except json.JSONDecodeError as exc:
                problems.append(f"{where}: invalid JSON ({exc.msg})")
                continue
            kind = item.get("type")
            if kind == "entity":
                if set(item) != {"type", "name", "entityType", "observations"}:
                    problems.append(f"{where}: entity keys must be type, name, entityType, observations")
                    continue
                name = item["name"]
                if name in entities:
                    existing = entities[name]
                    if existing["entityType"] != item["entityType"]:
                        problems.append(f"{where}: {name} redefined with a different entityType")
                    for obs in item["observations"]:
                        if obs not in existing["observations"]:
                            existing["observations"].append(obs)
                    existing["duplicates"] = existing.get("duplicates", 1) + 1
                    continue
                entities[name] = {
                    "name": name,
                    "entityType": item["entityType"],
                    "observations": list(item["observations"]),
                    "where": where,
                }
            elif kind == "relation":
                if set(item) != {"type", "from", "to", "relationType"}:
                    problems.append(f"{where}: relation keys must be type, from, to, relationType")
                    continue
                relations.append({**{k: item[k] for k in ("from", "to", "relationType")}, "where": where})
            else:
                problems.append(f"{where}: type must be entity or relation")
    return entities, relations, problems


def dump(entities, relations, path):
    lines = []
    order = list(PREFIX)
    for e in sorted(entities.values(), key=lambda e: (order.index(e["entityType"]) if e["entityType"] in order else 99, e["name"])):
        lines.append(json.dumps({"type": "entity", "name": e["name"], "entityType": e["entityType"], "observations": e["observations"]}, ensure_ascii=False))
    seen = set()
    for r in sorted(relations, key=lambda r: (r["from"], r["relationType"], r["to"])):
        key = (r["from"], r["relationType"], r["to"])
        if key in seen:
            continue
        seen.add(key)
        lines.append(json.dumps({"type": "relation", "from": r["from"], "to": r["to"], "relationType": r["relationType"]}, ensure_ascii=False))
    Path(path).write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
