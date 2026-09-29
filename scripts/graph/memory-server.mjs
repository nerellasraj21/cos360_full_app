import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.env.CLAUDE_PROJECT_DIR || path.resolve(here, "..", "..");
const env = { ...process.env, MEMORY_FILE_PATH: path.join(root, "docs", "graph", "graph.jsonl") };

const child = spawn("npx", ["-y", "@modelcontextprotocol/server-memory@2026.8.31"], {
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => process.exit(signal ? 1 : code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
