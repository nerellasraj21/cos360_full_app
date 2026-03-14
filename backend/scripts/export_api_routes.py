"""
Export all FastAPI routes to a comprehensive JSON file.
Includes: module grouping, descriptions, parameters, request bodies, responses, and test hints.

Usage:  python scripts/export_api_routes.py
"""
import sys
from pathlib import Path

# Add project root to sys.path so 'app' is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import json
from app.main import app


def get_type_str(schema_obj):
    """Extract a readable type string from an OpenAPI schema object."""
    if not schema_obj:
        return "any"
    if "type" in schema_obj:
        t = schema_obj["type"]
        if t == "array" and "items" in schema_obj:
            inner = get_type_str(schema_obj["items"])
            return f"array<{inner}>"
        return t
    if "$ref" in schema_obj:
        return schema_obj["$ref"].split("/")[-1]
    if "anyOf" in schema_obj:
        types = [get_type_str(a) for a in schema_obj["anyOf"] if a.get("type") != "null"]
        return " | ".join(types) if types else "any"
    if "allOf" in schema_obj:
        types = [get_type_str(a) for a in schema_obj["allOf"]]
        return " & ".join(types) if types else "any"
    return "any"


def resolve_schema(ref_str, components):
    """Resolve a $ref string to the actual schema dict."""
    if not ref_str or not ref_str.startswith("#/"):
        return {}
    parts = ref_str.lstrip("#/").split("/")
    obj = components
    for p in parts[1:]:  # skip 'components'
        obj = obj.get(p, {})
    return obj


def extract_fields(schema_obj, components):
    """Extract fields from a schema, resolving $ref if needed."""
    if "$ref" in schema_obj:
        schema_obj = resolve_schema(schema_obj["$ref"], components)

    fields = {}
    required_list = schema_obj.get("required", [])
    for prop_name, prop_detail in schema_obj.get("properties", {}).items():
        field = {
            "type": get_type_str(prop_detail),
            "required": prop_name in required_list,
        }
        if prop_detail.get("description"):
            field["description"] = prop_detail["description"]
        if "default" in prop_detail and prop_detail["default"] is not None:
            field["default"] = prop_detail["default"]
        if prop_detail.get("enum"):
            field["enum"] = prop_detail["enum"]
        # Check for enum in anyOf
        if "anyOf" in prop_detail:
            for variant in prop_detail["anyOf"]:
                if "$ref" in variant:
                    resolved = resolve_schema(variant["$ref"], components)
                    if resolved.get("enum"):
                        field["enum"] = resolved["enum"]
        fields[prop_name] = field
    return fields


def main():
    openapi = app.openapi()
    components = openapi.get("components", {})

    modules = {}
    endpoint_count = 0

    for path, methods in openapi.get("paths", {}).items():
        for method, details in methods.items():
            if method in ("head", "options"):
                continue
            endpoint_count += 1

            tags = details.get("tags", ["Untagged"])
            tag = tags[0] if tags else "Untagged"

            if tag not in modules:
                modules[tag] = {"description": "", "endpoints": []}

            # --- Parameters ---
            params = []
            for p in details.get("parameters", []):
                param = {
                    "name": p.get("name"),
                    "in": p.get("in"),
                    "required": p.get("required", False),
                    "type": get_type_str(p.get("schema", {})),
                }
                if p.get("description"):
                    param["description"] = p["description"]
                if p.get("schema", {}).get("default") is not None:
                    param["default"] = p["schema"]["default"]
                if p.get("schema", {}).get("enum"):
                    param["enum"] = p["schema"]["enum"]
                params.append(param)

            # --- Request Body ---
            request_body = None
            rb = details.get("requestBody", {})
            if rb:
                for content_type, content_detail in rb.get("content", {}).items():
                    body_schema = content_detail.get("schema", {})
                    fields = extract_fields(body_schema, components)
                    if fields:
                        schema_name = ""
                        if "$ref" in body_schema:
                            schema_name = body_schema["$ref"].split("/")[-1]
                        request_body = {
                            "content_type": content_type,
                            "fields": fields,
                        }
                        if schema_name:
                            request_body["schema_name"] = schema_name

            # --- Responses ---
            responses = {}
            for status_code, resp_detail in details.get("responses", {}).items():
                resp = {"description": resp_detail.get("description", "")}
                # Get response schema name if available
                resp_content = resp_detail.get("content", {})
                for ct, ct_detail in resp_content.items():
                    rs = ct_detail.get("schema", {})
                    if "$ref" in rs:
                        resp["schema"] = rs["$ref"].split("/")[-1]
                    elif rs.get("type") == "array" and "items" in rs:
                        if "$ref" in rs["items"]:
                            resp["schema"] = f"array<{rs['items']['$ref'].split('/')[-1]}>"
                responses[status_code] = resp

            # --- Build endpoint ---
            description = details.get("summary", "") or details.get("description", "")

            endpoint = {
                "path": path,
                "method": method.upper(),
                "name": details.get("operationId", ""),
                "description": description,
                "responses": responses,
            }
            if params:
                endpoint["parameters"] = params
            if request_body:
                endpoint["request_body"] = request_body

            modules[tag]["endpoints"].append(endpoint)

    # Sort
    sorted_modules = {}
    for tag in sorted(modules.keys()):
        mod = modules[tag]
        mod["endpoint_count"] = len(mod["endpoints"])
        mod["endpoints"].sort(key=lambda e: (e["path"], e["method"]))
        sorted_modules[tag] = mod

    # Module summary
    module_summary = []
    for tag, mod in sorted_modules.items():
        methods_used = sorted(set(e["method"] for e in mod["endpoints"]))
        module_summary.append({
            "module": tag,
            "endpoint_count": mod["endpoint_count"],
            "http_methods": methods_used,
        })

    output = {
        "api_title": openapi.get("info", {}).get("title", "COS360 API"),
        "api_version": openapi.get("info", {}).get("version", "1.0.0"),
        "base_url": "http://localhost:8000",
        "auth_info": {
            "type": "Bearer JWT",
            "header": "Authorization: Bearer <token>",
            "tenant_header": "cschema: <tenant_name>",
            "note": "Most endpoints require both JWT token and tenant schema header"
        },
        "total_endpoints": endpoint_count,
        "total_modules": len(sorted_modules),
        "module_summary": module_summary,
        "modules": sorted_modules,
    }

    with open("api_routes.json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False, default=str)

    print(f"Total endpoints: {endpoint_count}")
    print(f"Total modules:   {len(sorted_modules)}")
    print("Written to api_routes.json")


if __name__ == "__main__":
    main()
