import argparse
import json
import os
import sys

from kg import GRAPH, STEP_PATTERN, load, module_of


def node_rows(entities):
    by_type = {}
    for e in entities.values():
        obs = e["observations"]
        row = {
            "name": e["name"],
            "module": module_of(e["name"]),
            "observations": obs,
            "summary": next((o.split(": ", 1)[1] for o in obs if o.split(": ", 1)[0] in ("Summary", "Decision", "Definition")), None),
            "why": next((o[5:] for o in obs if o.startswith("Why: ")), None),
            "steps": [STEP_PATTERN.sub("", o) for o in obs if STEP_PATTERN.match(o)],
        }
        by_type.setdefault(e["entityType"], []).append(row)
    return by_type


def rel_rows(relations):
    by_type = {}
    for r in relations:
        by_type.setdefault(r["relationType"].upper(), []).append({"from": r["from"], "to": r["to"]})
    return by_type


def statements(entities, relations):
    yield "CREATE CONSTRAINT kg_name IF NOT EXISTS FOR (n:KG) REQUIRE n.name IS UNIQUE", {}
    yield "MATCH (n:KG) DETACH DELETE n", {}
    for kind, rows in sorted(node_rows(entities).items()):
        yield (
            f"UNWIND $rows AS r CREATE (n:KG:{kind}) SET n.name = r.name, n.module = r.module, "
            "n.observations = r.observations, n.summary = r.summary, n.why = r.why, n.steps = r.steps",
            {"rows": rows},
        )
    for rel, rows in sorted(rel_rows(relations).items()):
        yield (
            f"UNWIND $rows AS r MATCH (a:KG {{name: r.from}}), (b:KG {{name: r.to}}) CREATE (a)-[:{rel}]->(b)",
            {"rows": rows},
        )


def as_cypher(query, params):
    if not params:
        return query + ";"
    return f":param rows => {json.dumps(params['rows'], ensure_ascii=True)};\n{query};"


def main():
    parser = argparse.ArgumentParser(
        description="Load docs/graph/graph.jsonl into Neo4j (replaces all :KG nodes). "
        "Connection from NEO4J_URI (default bolt://localhost:7687), NEO4J_USER, NEO4J_PASSWORD (omit both for NEO4J_AUTH=none)."
    )
    parser.add_argument("--print", action="store_true", help="Print a Cypher script for cypher-shell or Neo4j Browser instead of connecting")
    args = parser.parse_args()
    entities, relations, problems = load([GRAPH])
    if problems:
        sys.exit("graph has load errors; run scripts/graph/kg_lint.py first")
    stmts = list(statements(entities, relations))
    if args.print:
        print("\n\n".join(as_cypher(q, p) for q, p in stmts))
        return
    try:
        from neo4j import GraphDatabase
    except ImportError:
        sys.exit("The neo4j driver is not installed: pip install neo4j  (or use --print and paste into Neo4j Browser)")
    uri = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
    user, password = os.environ.get("NEO4J_USER"), os.environ.get("NEO4J_PASSWORD")
    auth = (user, password) if user and password else None
    with GraphDatabase.driver(uri, auth=auth) as driver:
        driver.verify_connectivity()
        with driver.session() as session:
            for query, params in stmts:
                session.run(query, params).consume()
            counts = session.run("MATCH (n:KG) WITH count(n) AS nodes MATCH (:KG)-[r]->(:KG) RETURN nodes, count(r) AS rels").single()
    print(f"loaded {counts['nodes']} nodes and {counts['rels']} relationships into {uri}")


if __name__ == "__main__":
    main()
