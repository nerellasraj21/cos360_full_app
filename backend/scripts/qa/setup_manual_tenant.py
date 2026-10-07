import argparse
import asyncio
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import _target

MANUAL_TENANT = os.environ.get("QA_MANUAL_TENANT", "qa_manual")
if not MANUAL_TENANT.startswith("qa_") or MANUAL_TENANT == os.environ.get("QA_TENANT"):
    raise SystemExit("Refusing to run: QA_MANUAL_TENANT must start with qa_ and differ from QA_TENANT")
os.environ["QA_TENANT"] = MANUAL_TENANT
os.environ["TENANT_DEFAULT_NAME"] = MANUAL_TENANT
_target.assert_safe_target()

import setup_qa_tenant

API_URL = os.environ.get("QA_API_URL", "http://127.0.0.1:8100/api/v1")


def seed() -> int:
    env = dict(os.environ)
    env.update(
        DEMO_API_URL=API_URL,
        DEMO_TENANT=MANUAL_TENANT,
        DEMO_ADMIN_USERNAME=os.environ["QA_ADMIN_USER"],
        DEMO_ADMIN_PASSWORD=os.environ["QA_ADMIN_PASSWORD"],
    )
    return subprocess.call([sys.executable, os.path.join("scripts", "seed_demo_data.py")], env=env)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Provision and seed the manual-test tenant through the test API")
    parser.add_argument("--reset", action="store_true", help="drop and rebuild the manual-test tenant first")
    parser.add_argument("--no-seed", action="store_true", help="provision only, do not load the demo school data")
    args = parser.parse_args()
    asyncio.run(setup_qa_tenant.main(args.reset))
    if not args.no_seed:
        print(f"seeding {MANUAL_TENANT} through {API_URL}")
        sys.exit(seed())
