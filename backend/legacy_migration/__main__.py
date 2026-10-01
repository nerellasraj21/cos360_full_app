import argparse
import os
from pathlib import Path
import sys

from dotenv import load_dotenv

from .migrate import MigrationError, run
from .options import Options

DESCRIPTION = """Move data from the legacy schema-per-tenant database into the shared-schema database.

The source is only ever read. `plan` needs no target and writes nothing except a report folder.
`migrate` needs --execute and --confirm-target <target database name>."""


def _url_from_env(name: str | None, label: str) -> str | None:
    if not name:
        return None
    value = os.getenv(name)
    if not value:
        raise SystemExit(f"Environment variable {name} ({label}) is not set")
    return value


def _summarise(report: dict) -> None:
    print(f"\nMode: {report['mode']}   ok: {report['ok']}")
    print(f"Report: {Path(report['quarantine_file']).parent / 'report.json'}")
    print(f"Quarantine (contains personal data, keep it out of git): {report['quarantine_file']}")
    menus = report["platform"].get("menus", {})
    if menus:
        print(
            f"Menus: {menus['platform_menus']} platform, {menus['tenant_menus']} tenant copies -> "
            f"{menus['catalog_menus']} in the shared catalog ({menus['tenant_menus_added_to_catalog']} added from tenants, "
            f"{menus['menus_with_name_variants']} with name variants)"
        )
    for name, entry in report["tenants"].items():
        tables = entry["tables"]
        source = sum(t["source_rows"] for t in tables.values())
        inserted = sum(t["inserted"] for t in tables.values())
        quarantined = sum(t["quarantined"] for t in tables.values())
        nulled = sum(t["nulled_foreign_keys"] for t in tables.values())
        dropped = sorted({c for t in tables.values() for c in t["dropped_columns"]})
        print(
            f"\n[{name}] {entry['status']}  source rows {source}, inserted {inserted}, quarantined {quarantined}, nulled FKs {nulled}"
        )
        if entry.get("remapped_ids"):
            print(f"  ids remapped after collisions: {entry['remapped_ids']}")
        if entry.get("source_only_tables"):
            print(f"  source tables that are not migrated: {entry['source_only_tables']}")
        if dropped:
            print(f"  source columns with no home in the new schema: {dropped}")
        if entry.get("error"):
            print(f"  error: {entry['error']}")
    if report["blockers"]:
        print("\nBlockers:")
        for blocker in report["blockers"]:
            print(f"  - {blocker}")
    totals = report["totals"]
    print(f"\nTotals: {totals}")


def main(argv: list[str] | None = None) -> int:
    load_dotenv()
    parser = argparse.ArgumentParser(prog="python -m legacy_migration", description=DESCRIPTION)
    parser.add_argument("command", choices=["plan", "migrate"])
    parser.add_argument(
        "--source-url-env", default="SOURCE_DATABASE_URL", help="env var holding the legacy database URL"
    )
    parser.add_argument(
        "--target-url-env", default="MIGRATION_DATABASE_URL", help="env var holding the owner URL of the new database"
    )
    parser.add_argument(
        "--platform-schema", default="public", help="schema in the source that holds tenants, plans, menus"
    )
    parser.add_argument(
        "--tenant", action="append", default=[], help="client_name to include (repeatable); default all"
    )
    parser.add_argument("--execute", action="store_true", help="actually write to the target (migrate only)")
    parser.add_argument("--confirm-target", help="the target database name, required with --execute")
    parser.add_argument(
        "--replace", action="store_true", help="delete and redo tenants that already exist in the target"
    )
    parser.add_argument("--allow-nonempty-platform", action="store_true", help="merge into non-empty platform tables")
    parser.add_argument("--orphan-policy", choices=["null", "quarantine"], default="null")
    parser.add_argument("--batch-size", type=int, default=1000)
    parser.add_argument("--out-dir", default="migration_reports")
    args = parser.parse_args(argv)

    if args.command == "plan" and args.execute:
        raise SystemExit("plan never writes; use the migrate command with --execute")

    options = Options(
        source_url=_url_from_env(args.source_url_env, "source") or "",
        target_url=_url_from_env(args.target_url_env, "target") if args.command == "migrate" else None,
        platform_schema=args.platform_schema,
        tenants=args.tenant,
        execute=args.command == "migrate" and args.execute,
        replace=args.replace,
        allow_nonempty_platform=args.allow_nonempty_platform,
        confirm_target=args.confirm_target,
        orphan_policy=args.orphan_policy,
        batch_size=args.batch_size,
        out_dir=Path(args.out_dir),
    )
    if args.command == "migrate" and not options.execute:
        print("migrate without --execute is a dry run: the source is read and nothing is written.")

    try:
        report = run(options)
    except MigrationError as exc:
        print(f"Refusing to continue: {exc}", file=sys.stderr)
        return 2
    _summarise(report)
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
