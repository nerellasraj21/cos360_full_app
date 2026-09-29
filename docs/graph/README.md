# COS360 Knowledge Graph

The graph half of the project memory. It holds **why decisions were made**, **how multi-step features flow**, **where features are implemented**, and **domain concepts**, as connected nodes. Rules and conventions stay in the `CLAUDE.md` files and `docs/*.md`.

| File | What it is |
|---|---|
| `graph.jsonl` | The source of truth. One JSON object per line: entities (nodes with observations) and relations (directed edges). Reviewed in git like code. |
| `SCHEMA.md` | Allowed node types, relation types, naming, and observation rules. |
| `views/` | Generated per-module pages with Mermaid diagrams. Never edit by hand. |

## How Claude uses it

The `knowledge-graph` MCP server (declared in `/.mcp.json`, launched by `scripts/graph/memory-server.mjs`) exposes the graph as tools:

- Read: `search_nodes` (substring match on names, types, observations), `open_nodes` (exact names plus their relations), `read_graph`.
- Write: `create_entities`, `create_relations`, `add_observations`, `delete_entities`, `delete_observations`, `delete_relations`.

Before working on a feature, search the graph for the module or feature (for example `search_nodes("feature:fee")`) and open the related flow and decisions. After changing behaviour, update the graph in the same change (see "When to write" in `SCHEMA.md`).

The first time the server is used, Claude Code asks you to approve the project MCP server. Write tools also ask for approval each time unless you allow them, so you see every graph change.

## Checks

```bash
python scripts/graph/kg_lint.py            # validate against SCHEMA.md
python scripts/graph/kg_lint.py --format   # then rewrite graph.jsonl in canonical order
python scripts/graph/kg_render.py          # regenerate docs/graph/views/
```

CI (`.github/workflows/knowledge-graph.yml`) runs the lint and fails if `views/` is out of date.

## Exploring in Neo4j

`graph.jsonl` stays the source of truth; Neo4j is a disposable copy for querying and visualising. Each load replaces all `:KG` nodes.

Neo4j is optional. Nothing else in this setup needs it, and nothing needs Docker.

1. Start Neo4j only when you want to explore, either:
   - Neo4j Desktop (a normal Windows app): create a local database, press Start, and set `NEO4J_USER` / `NEO4J_PASSWORD` in your shell. Stop it when you're done.
   - Neo4j AuraDB Free (hosted, nothing to install): set `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` from the Aura console. The graph is then stored on Neo4j's servers.
2. Load: `pip install neo4j` once, then `python scripts/graph/kg_neo4j.py`. Without the driver, `python scripts/graph/kg_neo4j.py --print` emits a script to paste into Neo4j Browser.
3. Open Neo4j Browser (Desktop: http://localhost:7474, Aura: from its console) and try:

```cypher
// Everything about one module
MATCH (n:KG {module: "fee"})-[r]-(m) RETURN n, r, m;

// The steps of a flow, and every component it touches
MATCH (f:Flow {name: "flow:fee/collect-payment"})-[:USES]->(c) RETURN f.steps, collect(c.name);

// Why is this table the way it is?
MATCH (d:Decision)-[:SHAPES]->(t:Table {name: "table:fee_transactions"}) RETURN d.summary, d.why;

// Impact analysis: which features and flows break if this endpoint changes?
MATCH (e:Endpoint {name: "endpoint:POST /fee/collection/pay"})<-[:USES|IMPLEMENTED_BY|CALLS]-(x)
OPTIONAL MATCH (x)-[:IMPLEMENTS]->(feat)
RETURN x.name, labels(x), feat.name;

// Cross-module dependencies
MATCH (a:Feature)-[:DEPENDS_ON]->(b:Feature) WHERE a.module <> b.module RETURN a.name, b.name;

// Decisions that were later reversed
MATCH (new:Decision)-[:SUPERSEDES]->(old:Decision) RETURN new.name, old.name, new.why;
```

Node labels are the entity types (`Module`, `Feature`, `Flow`, `Decision`, `Concept`, `Endpoint`, `Service`, `Table`, `WebPage`, `MobileScreen`, `Job`) plus `KG`. Properties: `name`, `module`, `observations`, `summary`, `why`, `steps`. Relationship types are the relation names in upper case.
