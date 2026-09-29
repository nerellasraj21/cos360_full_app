import argparse
import re
import sys
from pathlib import Path

from kg import (
    FILE_ROOTS,
    GRAPH,
    MODULE_DOCS,
    MODULE_SCOPED,
    NAME_PATTERNS,
    PREFIX,
    REF_PATTERN,
    RELATIONS,
    REQUIRED,
    ROOT,
    STEP_PATTERN,
    dump,
    load,
    module_of,
)

SECRETS = re.compile(
    r"npg_[A-Za-z0-9]{6,}|postgres(ql)?(\+\w+)?://[^\s:@/]+:[^\s@]+@|eyJ[A-Za-z0-9_-]{20,}"
    r"|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|(password|passwd|secret)\s*[:=]\s*\S{4,}",
    re.I,
)
NOISE = re.compile(r"\b(completed on|fixed (in|on)|as of \d|todo|wip)\b", re.I)
MAX_OBS = 400


def known_tables():
    tables = set()
    for path in (ROOT / "backend" / "app" / "models").rglob("*.py"):
        text = path.read_text(encoding="utf-8", errors="ignore")
        for name in re.findall(r"__tablename__\s*=\s*[\"']([a-z0-9_]+)[\"']", text):
            tables.add(name)
    return tables


def known_routes():
    routes = []
    for path in (ROOT / "backend" / "app" / "api").rglob("*.py"):
        text = path.read_text(encoding="utf-8", errors="ignore")
        prefixes = {
            var: (m.group(1) if (m := re.search(r"prefix\s*=\s*[\"']([^\"']*)[\"']", args)) else "")
            for var, args in re.findall(r"(\w+)\s*=\s*APIRouter\(([^)]*)\)", text, re.S)
        }
        for var, method, route in re.findall(r"@(\w+)\.(get|post|put|patch|delete)\(\s*[\"']([^\"']*)[\"']", text):
            routes.append((method.upper(), norm(prefixes.get(var, "") + route)))
    return routes


def norm(path):
    path = re.sub(r"\{[^}]*\}", "{}", path)
    return "/" + path.strip("/")


def lint(paths, fragment):
    entities, relations, errors = load(paths)
    warnings = []
    relaxed = warnings if fragment else errors
    module_slugs = {p.stem for p in MODULE_DOCS.glob("*.md")} | {"platform"}
    modules = {e["name"].split(":", 1)[1] for e in entities.values() if e["entityType"] == "Module"}
    tables = known_tables()
    routes = known_routes()

    for e in entities.values():
        name, kind, obs, where = e["name"], e["entityType"], e["observations"], e["where"]
        if e.get("duplicates"):
            (warnings if fragment else errors).append(f"{where}: {name} defined {e['duplicates']} times")
        if kind not in PREFIX:
            errors.append(f"{where}: unknown entityType {kind!r}")
            continue
        if not NAME_PATTERNS[kind].match(name):
            errors.append(f"{where}: name {name!r} does not match the {kind} format")
        mod = module_of(name)
        if kind == "Module" and mod not in module_slugs:
            errors.append(f"{where}: {name} has no docs/modules/{mod}.md (or use module:platform)")
        if kind in MODULE_SCOPED and mod not in modules:
            relaxed.append(f"{where}: {name} refers to module:{mod}, which is not in the graph")
        for prefix in REQUIRED.get(kind, []):
            if not any(o.startswith(prefix) for o in obs):
                errors.append(f"{where}: {name} is missing a '{prefix.strip()}' observation")
        if kind == "Flow":
            steps = [int(m.group(1)) for o in obs if (m := STEP_PATTERN.match(o))]
            if steps != list(range(1, len(steps) + 1)):
                errors.append(f"{where}: {name} steps must be numbered 1..n in order, got {steps}")
        if kind in FILE_ROOTS:
            target = ROOT / FILE_ROOTS[kind] / name.split(":", 1)[1]
            if not target.exists():
                errors.append(f"{where}: {name} points to a missing file {target.relative_to(ROOT)}")
        if kind == "Table":
            table = name.split(":", 1)[1].split(".")[-1]
            if table not in tables:
                warnings.append(f"{where}: {name} has no __tablename__ in backend/app/models")
        if kind == "Endpoint":
            method, path = name.split(":", 1)[1].split(" ", 1)
            target = norm(path)
            if not any(m == method and (target == r or target.endswith(r)) for m, r in routes):
                warnings.append(f"{where}: {name} not found among backend route decorators")
        if len(set(obs)) != len(obs):
            errors.append(f"{where}: {name} has duplicate observations")
        for o in obs:
            if not isinstance(o, str) or not o.strip():
                errors.append(f"{where}: {name} has an empty observation")
                continue
            if len(o) > MAX_OBS:
                errors.append(f"{where}: {name} observation longer than {MAX_OBS} chars: {o[:60]}...")
            if not o.isascii():
                errors.append(f"{where}: {name} observation is not plain ASCII: {o[:60]}...")
            if SECRETS.search(o):
                errors.append(f"{where}: {name} observation looks like a secret")
            if NOISE.search(o):
                warnings.append(f"{where}: {name} observation reads like status/history: {o[:60]}...")
            for ref in REF_PATTERN.findall(o):
                if ref not in entities:
                    relaxed.append(f"{where}: {name} references [{ref}], which is not in the graph")

    linked = set()
    seen = set()
    for r in relations:
        src, dst, rel, where = r["from"], r["to"], r["relationType"], r["where"]
        key = (src, rel, dst)
        if key in seen:
            errors.append(f"{where}: duplicate relation {src} -{rel}-> {dst}")
        seen.add(key)
        if src == dst:
            errors.append(f"{where}: self relation on {src}")
        if rel not in RELATIONS:
            errors.append(f"{where}: unknown relationType {rel!r}")
            continue
        missing = [n for n in (src, dst) if n not in entities]
        for n in missing:
            relaxed.append(f"{where}: relation {src} -{rel}-> {dst} points to unknown node {n}")
        if missing:
            continue
        allowed_from, allowed_to = RELATIONS[rel]
        if entities[src]["entityType"] not in allowed_from or entities[dst]["entityType"] not in allowed_to:
            errors.append(
                f"{where}: {rel} is not allowed from {entities[src]['entityType']} to {entities[dst]['entityType']} ({src} -> {dst})"
            )
        linked.update((src, dst))

    for e in entities.values():
        if e["entityType"] != "Module" and e["name"] not in linked:
            relaxed.append(f"{e['where']}: {e['name']} has no relations (orphan)")

    return entities, relations, errors, warnings


def main():
    parser = argparse.ArgumentParser(description="Validate the COS360 knowledge graph against docs/graph/SCHEMA.md.")
    parser.add_argument("paths", nargs="*", help="JSONL files to check (default: docs/graph/graph.jsonl)")
    parser.add_argument("--fragment", action="store_true", help="Treat cross-file references and orphans as warnings")
    parser.add_argument("--format", action="store_true", help="Rewrite graph.jsonl in canonical sorted order after a clean lint")
    parser.add_argument("--quiet", action="store_true", help="Hide warnings")
    args = parser.parse_args()
    paths = [Path(p) for p in args.paths] or [GRAPH]
    entities, relations, errors, warnings = lint(paths, args.fragment)
    if not args.quiet:
        for w in warnings:
            print(f"warning: {w}")
    for e in errors:
        print(f"error: {e}")
    counts = {}
    for e in entities.values():
        counts[e["entityType"]] = counts.get(e["entityType"], 0) + 1
    summary = ", ".join(f"{k} {v}" for k, v in sorted(counts.items()))
    print(f"{len(entities)} nodes ({summary}), {len(relations)} relations: {len(errors)} errors, {len(warnings)} warnings")
    if errors:
        sys.exit(1)
    if args.format:
        if paths != [GRAPH]:
            sys.exit("--format only applies to docs/graph/graph.jsonl")
        dump(entities, relations, GRAPH)
        print(f"formatted {GRAPH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
