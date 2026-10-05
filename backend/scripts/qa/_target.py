import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, ROOT)
os.chdir(ROOT)

from dotenv import load_dotenv

load_dotenv(os.path.join(ROOT, ".env"))
load_dotenv(os.path.join(ROOT, ".env.test"), override=True)


def describe(url: str) -> str:
    match = re.match(r"^[a-z+0-9]+://([^:/@]+)(?::[^@]*)?@([^:/]+)(?::(\d+))?/([^?]+)", url or "")
    if not match:
        return "unparseable"
    user, host, port, db = match.groups()
    return f"user={user} host={host} port={port or '5432'} db={db}"


def assert_safe_target() -> None:
    database_url = os.environ.get("DATABASE_URL", "")
    migration_url = os.environ.get("MIGRATION_DATABASE_URL", "")
    for name, url in (("DATABASE_URL", database_url), ("MIGRATION_DATABASE_URL", migration_url)):
        if url and not re.search(r"@(localhost|127\.0\.0\.1)(:|/)", url):
            raise SystemExit(f"Refusing to run: {name} does not point at localhost ({describe(url)})")
    qa_tenant = os.environ.get("QA_TENANT", "")
    if not qa_tenant.startswith("qa_"):
        raise SystemExit("Refusing to run: QA_TENANT must start with qa_")
    if os.environ.get("TENANT_DEFAULT_NAME") != qa_tenant:
        raise SystemExit("Refusing to run: TENANT_DEFAULT_NAME must equal QA_TENANT")
    print("target:", describe(database_url), "| tenant:", qa_tenant)
