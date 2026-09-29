"""
test_comm_endpoints.py

Integration test for the Communication module endpoints.
Tests:
  a. POST   /api/v1/communication/templates        - create template
  b. GET    /api/v1/communication/templates        - list templates
  c. GET    /api/v1/communication/templates/{id}   - get by ID
  d. PUT    /api/v1/communication/templates/{id}   - update body
  e. GET    /api/v1/communication/send/preview-count?target_type=all_staff
  f. GET    /api/v1/communication/logs             - list logs

Skips POST /send to avoid triggering Celery.
Run: python test_comm_endpoints.py
"""
import asyncio
import json
import sys

import httpx

from app.main import app
from app.tools.jwt_utils import create_access_token

ADMIN_USER_ID = "f8bf9cc9-8d5f-4aeb-bd6f-87695f8d75c3"
ADMIN_ROLE_ID = "2fe97570-0740-44c5-911f-9826e0258a9b"
CSCHEMA = "test_tenant"

TOKEN = create_access_token(
    {
        "sub": "TestStaff34b527d0",
        "id": ADMIN_USER_ID,
        "role": "Admin",
        "role_id": ADMIN_ROLE_ID,
        "client_name": CSCHEMA,
        "schema": "test_tenant_schema",
    }
)

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "cschema": CSCHEMA,
    "Content-Type": "application/json",
}

BASE_URL = "http://testserver"
PASS_SYMBOL = "[PASS]"
FAIL_SYMBOL = "[FAIL]"
SKIP_SYMBOL = "[SKIP]"


def print_result(label, status_code, body, expected_codes=(200, 201)):
    ok = status_code in expected_codes
    symbol = PASS_SYMBOL if ok else FAIL_SYMBOL
    print(f"\n{symbol} {label}")
    print(f"  Status: {status_code}")
    if isinstance(body, (dict, list)):
        formatted = json.dumps(body, indent=4, default=str)
        lines = formatted.splitlines()
        if len(lines) > 40:
            preview = "\n".join(lines[:40])
            print(f"  Response (truncated to 40 lines):\n{preview}\n  ... [{len(lines) - 40} more lines]")
        else:
            print(f"  Response:\n{formatted}")
    else:
        print(f"  Response: {body}")
    return ok


def make_client():
    return httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url=BASE_URL,
    )


async def run_tests():
    print("=" * 70)
    print("Communication Module - Endpoint Integration Tests")
    print("=" * 70)

    results = []
    created_template_id = None

    async with make_client() as client:

        # a. POST /communication/templates
        print("\n--- a. POST /api/v1/communication/templates ---")
        payload = {
            "channel": "sms",
            "name": "Test Alert",
            "body": "Hello {{name}}, your fee is due.",
        }
        r = await client.post(
            "/api/v1/communication/templates",
            headers=HEADERS,
            json=payload,
        )
        ct = r.headers.get("content-type", "")
        body = r.json() if "application/json" in ct else r.text
        ok = print_result("POST /communication/templates", r.status_code, body, expected_codes=(200, 201))
        results.append(("POST /templates", ok))

        if ok and isinstance(body, dict):
            created_template_id = body.get("id")
            print(f"  Created template ID: {created_template_id}")
        elif r.status_code == 400 and isinstance(body, dict) and "already exists" in body.get("detail", ""):
            print("  Template already exists from a prior run; ID will be fetched from list.")

        # b. GET /communication/templates
        print("\n--- b. GET /api/v1/communication/templates ---")
        r = await client.get("/api/v1/communication/templates", headers=HEADERS)
        ct = r.headers.get("content-type", "")
        body = r.json() if "application/json" in ct else r.text
        ok = print_result("GET /communication/templates", r.status_code, body, expected_codes=(200,))
        results.append(("GET /templates (list)", ok))

        if created_template_id is None and ok and isinstance(body, list):
            for tmpl in body:
                if tmpl.get("name") == "Test Alert" and tmpl.get("channel") == "sms":
                    created_template_id = tmpl.get("id")
                    print(f"  Recovered template ID from list: {created_template_id}")
                    break

        # c. GET /communication/templates/{id}
        print("\n--- c. GET /api/v1/communication/templates/{id} ---")
        if created_template_id:
            r = await client.get(
                f"/api/v1/communication/templates/{created_template_id}",
                headers=HEADERS,
            )
            ct = r.headers.get("content-type", "")
            body = r.json() if "application/json" in ct else r.text
            ok = print_result(
                f"GET /communication/templates/{created_template_id}",
                r.status_code, body, expected_codes=(200,),
            )
            results.append(("GET /templates/{id}", ok))
        else:
            print(f"  {SKIP_SYMBOL} Skipped - no template ID available.")
            results.append(("GET /templates/{id}", None))

        # d. PUT /communication/templates/{id}
        print("\n--- d. PUT /api/v1/communication/templates/{id} ---")
        if created_template_id:
            update_payload = {"body": "Hi {{name}}, urgent: {{message}}"}
            r = await client.put(
                f"/api/v1/communication/templates/{created_template_id}",
                headers=HEADERS,
                json=update_payload,
            )
            ct = r.headers.get("content-type", "")
            body = r.json() if "application/json" in ct else r.text
            ok = print_result(
                f"PUT /communication/templates/{created_template_id}",
                r.status_code, body, expected_codes=(200,),
            )
            results.append(("PUT /templates/{id}", ok))
        else:
            print(f"  {SKIP_SYMBOL} Skipped - no template ID available.")
            results.append(("PUT /templates/{id}", None))

        # e. GET /communication/send/preview-count
        print("\n--- e. GET /api/v1/communication/send/preview-count?target_type=all_staff ---")
        r = await client.get(
            "/api/v1/communication/send/preview-count",
            headers=HEADERS,
            params={"target_type": "all_staff"},
        )
        ct = r.headers.get("content-type", "")
        body = r.json() if "application/json" in ct else r.text
        ok = print_result(
            "GET /communication/send/preview-count (target_type=all_staff)",
            r.status_code, body, expected_codes=(200,),
        )
        results.append(("GET /send/preview-count", ok))

        # f. GET /communication/logs
        print("\n--- f. GET /api/v1/communication/logs ---")
        r = await client.get("/api/v1/communication/logs", headers=HEADERS)
        ct = r.headers.get("content-type", "")
        body = r.json() if "application/json" in ct else r.text
        ok = print_result("GET /communication/logs", r.status_code, body, expected_codes=(200,))
        results.append(("GET /logs", ok))

    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    passed = failed = skipped = 0
    for name, result in results:
        if result is True:
            print(f"  {PASS_SYMBOL}  {name}")
            passed += 1
        elif result is False:
            print(f"  {FAIL_SYMBOL}  {name}")
            failed += 1
        else:
            print(f"  {SKIP_SYMBOL}  {name}")
            skipped += 1

    print(f"\nTotal: {len(results)}  |  Passed: {passed}  |  Failed: {failed}  |  Skipped: {skipped}")
    print("=" * 70)
    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(run_tests())
