#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
"""
COS360 Database Cleanup Script
================================
Removes junk/test records from test_tenant_schema only.
NO tables are dropped. Only row-level deletes.
All module functionality (APIs, endpoints, UI) remains intact.

Usage:
    # Preview — no changes made (default)
    DRY_RUN=true python scripts/cleanup_db.py

    # Execute cleanup
    DRY_RUN=false python scripts/cleanup_db.py

    # Target a different schema
    DRY_RUN=false CLEANUP_SCHEMA=cos360_masters python scripts/cleanup_db.py

What is removed:
    - Fee transactions (receipts, refunds, transaction records, student mappings)
    - Transport data (routes, vehicles, trips, assignments)
    - Exam transactional data (marks, results, audit — NOT grade schemes or configs)
    - Student junk (attendance, documents, homework, issued certificates)
    - Staff attendance
    - Expense transactions (types/categories kept)
    - All data tied to academic years OUTSIDE the 3 valid years
    - The old academic year rows themselves

What is NEVER touched:
    - users, roles, menus, permissions (auth layer)
    - students, staff, parents, student_parent_associations
    - castes, sub_castes, designations, certificate_types, subject_categories
    - exam_grade_schemes, exam_grade_bands, subject_grade_schemes, subject_grade_bands
    - remark_grade_sets, remark_grade_options
    - board_exam_patterns / board_pattern_exam_types  (valid years only)
    - fee_terms, fee_categories, fee_types, fee_class_mappings (valid years only)
    - classes, sections, subjects, student_admissions (valid years only)
    - timetables, holidays (valid years only)
    - exams and exam configs (valid years only — just marks/results wiped)
    - expense_types, expense_categories, expense_settings
    - Public schema — completely untouched
"""

import asyncio
import asyncpg
import os
import json
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# ── Configuration ───────────────────────────────────────────────────────────────
SCHEMA = os.getenv("CLEANUP_SCHEMA", "test_tenant_schema")
DATABASE_URL = os.getenv("DATABASE_URL", "")
DRY_RUN = os.getenv("DRY_RUN", "true").lower() == "true"  # Safe default: dry run

KEEP_ACADEMIC_YEARS = ["2024-25", "2025-26", "2026-2027"]

# Normalise URL for asyncpg (strip SQLAlchemy driver prefix if present)
if DATABASE_URL.startswith("postgresql+asyncpg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://", 1)

# ── Helpers ─────────────────────────────────────────────────────────────────────

# Pre-fetched set of tables that exist in the schema.
# Populated before the transaction starts so UndefinedTableError never fires
# inside a transaction (which would abort the whole transaction in PostgreSQL).
EXISTING_TABLES: set = set()


async def prefetch_tables(conn, schema: str) -> set:
    rows = await conn.fetch("SELECT tablename FROM pg_tables WHERE schemaname = $1", schema)
    return {r["tablename"] for r in rows}


async def row_count(conn, schema: str, table: str) -> int:
    if table not in EXISTING_TABLES:
        return -1
    return await conn.fetchval(f'SELECT COUNT(*) FROM "{schema}"."{table}"')


async def snapshot(conn, schema: str, tables: list) -> dict:
    result = {}
    for t in tables:
        result[t] = await row_count(conn, schema, t)
    return result


async def delete_all(conn, schema: str, table: str) -> int:
    """Delete every row in table. Skips gracefully if table not in schema."""
    if table not in EXISTING_TABLES:
        print(f"      {table}: table not in schema — skipped")
        return 0
    result = await conn.execute(f'DELETE FROM "{schema}"."{table}"')
    n = int(result.split()[-1])
    if n:
        print(f"      {table}: {n} rows removed")
    return n


async def delete_where(conn, schema: str, table: str, condition: str, note: str = "") -> int:
    """Delete rows matching condition. Skips gracefully if table not in schema."""
    if table not in EXISTING_TABLES:
        return 0
    result = await conn.execute(f'DELETE FROM "{schema}"."{table}" WHERE {condition}')
    n = int(result.split()[-1])
    if n:
        print(f"      {table}: {n} rows removed {note}")
    return n


async def update_where(conn, schema: str, table: str, set_clause: str, condition: str) -> int:
    if table not in EXISTING_TABLES:
        return 0
    result = await conn.execute(f'UPDATE "{schema}"."{table}" SET {set_clause} WHERE {condition}')
    n = int(result.split()[-1])
    if n:
        print(f"      {table}: {n} rows updated (NULLed stale FK refs)")
    return n


def ids(rows) -> list:
    return [str(r["id"]) for r in rows]


def in_clause(id_list: list) -> str:
    """Format list of UUIDs for SQL IN clause."""
    return ", ".join(f"'{i}'" for i in id_list)


# ── Main ─────────────────────────────────────────────────────────────────────────


async def main():
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is not set")

    bar = "=" * 65
    print(f"\n{bar}")
    print("  COS360 Database Cleanup Script")
    print(bar)
    print(f"  Schema      : {SCHEMA}")
    print(f"  Dry Run     : {DRY_RUN}")
    print(f"  Keep Years  : {', '.join(KEEP_ACADEMIC_YEARS)}")
    print(f"  Timestamp   : {datetime.utcnow().isoformat()}")
    print(bar)

    conn = await asyncpg.connect(DATABASE_URL)

    try:
        # ── Pre-fetch existing tables (prevents UndefinedTableError inside tx) ─
        global EXISTING_TABLES
        EXISTING_TABLES = await prefetch_tables(conn, SCHEMA)

        # ── Resolve academic year IDs ─────────────────────────────────────────
        all_ay = await conn.fetch(f'SELECT id, title FROM "{SCHEMA}".academic_years ORDER BY title')
        keep_ay_ids = ids([r for r in all_ay if r["title"] in KEEP_ACADEMIC_YEARS])
        old_ay_ids = ids([r for r in all_ay if r["title"] not in KEEP_ACADEMIC_YEARS])

        keep_ay_names = [r["title"] for r in all_ay if r["title"] in KEEP_ACADEMIC_YEARS]
        old_ay_names = [r["title"] for r in all_ay if r["title"] not in KEEP_ACADEMIC_YEARS]

        print(f"\n  Academic years found: {len(all_ay)}")
        print(f"  → KEEP  ({len(keep_ay_ids)}): {keep_ay_names}")
        print(f"  → PURGE ({len(old_ay_ids)}): {old_ay_names if old_ay_names else 'none'}")

        if len(keep_ay_ids) == 0:
            print("\n  ⚠  ABORT: None of the 3 valid academic years exist in this schema.")
            print("     Refusing to run to prevent accidental full data wipe.")
            return

        # ── Tables to snapshot ────────────────────────────────────────────────
        SNAPSHOT_TABLES = [
            # Fee transactional
            "fee_receipts",
            "fee_refunds",
            "fee_transaction_items",
            "fee_transactions",
            "fee_student_map_term_amounts",
            "fee_student_mappings",
            # Fee config (should be preserved for valid years)
            "fee_class_map_term_amounts",
            "fee_class_mappings",
            "fee_types",
            "fee_categories",
            "fee_terms",
            "fee_term_dates",
            # Transport
            "student_transport_assignments",
            "student_trips",
            "trips",
            "route_stops",
            "routes",
            "vehicles",
            "trip_types",
            "route_types",
            # Exam transactional
            "student_marks",
            "student_subject_results",
            "student_exam_results",
            "hall_ticket_eligibility",
            "exam_audit_log",
            "exam_mark_entry_permissions",
            # Exam structural
            "exam_subject_components",
            "exam_subject_config",
            "exam_class_sections",
            "exam_dates",
            "exam_streams",
            "exam_settings",
            "exams",
            "board_pattern_exam_types",
            "board_exam_patterns",
            # Masters junk
            "student_attendance",
            "staff_attendance",
            "student_documents",
            "student_certificates",
            "student_homework",
            # Timetable
            "timetable_subject_options",
            "timetable_slots",
            "slot_times",
            "timetables",
            # Academic structure
            "class_subject_mappings",
            "holidays",
            "student_admissions",
            "subjects",
            "sections",
            "classes",
            "academic_years",
            # Expense transactional
            "expense_transaction_items",
            "expense_attachments",
            "expense_audit_log",
            "expense_transactions",
            # Audit
            "profile_audit_logs",
            # ── PRESERVED (shown for verification only) ──
            "users",
            "roles",
            "menus",
            "role_menu_permissions",
            "resource_permissions",
            "students",
            "staff",
            "parents",
            "student_parent_associations",
            "castes",
            "sub_castes",
            "designations",
            "exam_grade_schemes",
            "exam_grade_bands",
            "subject_grade_schemes",
            "subject_grade_bands",
            "remark_grade_sets",
            "remark_grade_options",
            "expense_types",
            "expense_categories",
            "expense_settings",
        ]

        print("\n  Capturing row counts before cleanup...")
        before = await snapshot(conn, SCHEMA, SNAPSHOT_TABLES)

        if DRY_RUN:
            print("\n  ── DRY RUN MODE — No changes will be made ──")
            print(f"\n  {'Table':<48} {'Rows':>8}")
            print("  " + "-" * 58)
            for t, c in before.items():
                marker = ""
                if c > 0 and t not in (
                    "users",
                    "roles",
                    "menus",
                    "role_menu_permissions",
                    "resource_permissions",
                    "students",
                    "staff",
                    "parents",
                    "student_parent_associations",
                    "castes",
                    "sub_castes",
                    "designations",
                    "exam_grade_schemes",
                    "exam_grade_bands",
                    "subject_grade_schemes",
                    "subject_grade_bands",
                    "remark_grade_sets",
                    "remark_grade_options",
                    "expense_types",
                    "expense_categories",
                    "expense_settings",
                    "fee_terms",
                    "fee_term_dates",
                    "fee_categories",
                    "fee_types",
                    "fee_class_mappings",
                    "fee_class_map_term_amounts",
                    "classes",
                    "sections",
                    "subjects",
                    "student_admissions",
                    "timetables",
                    "timetable_slots",
                    "timetable_subject_options",
                    "slot_times",
                    "holidays",
                    "academic_years",
                    "exams",
                    "exam_subject_config",
                    "exam_subject_components",
                    "exam_class_sections",
                    "exam_dates",
                    "exam_streams",
                    "exam_settings",
                    "board_exam_patterns",
                    "board_pattern_exam_types",
                    "exam_mark_entry_permissions",
                ):
                    marker = "  ← will be cleared"
                if c >= 0:
                    print(f"  {t:<48} {c:>8}{marker}")
            print(f"\n  Set DRY_RUN=false to execute the cleanup.")
            return

        # ── Execute — single transaction (rollback on any failure) ────────────
        print("\n  Starting cleanup inside a single transaction...")
        print("  Any failure will roll back ALL changes automatically.\n")

        async with conn.transaction():

            # ─────────────────────────────────────────────────────────────────
            # [A] FEE TRANSACTIONS
            #     Removes all collected fee records.
            #     Keeps: fee_terms, fee_categories, fee_types, fee_class_mappings
            # ─────────────────────────────────────────────────────────────────
            print("  [A] Fee Transactions")
            await delete_all(conn, SCHEMA, "fee_receipts")
            await delete_all(conn, SCHEMA, "fee_refunds")
            await delete_all(conn, SCHEMA, "fee_transaction_items")
            await delete_all(conn, SCHEMA, "fee_transactions")
            await delete_all(conn, SCHEMA, "fee_student_map_term_amounts")
            await delete_all(conn, SCHEMA, "fee_student_mappings")

            # ─────────────────────────────────────────────────────────────────
            # [B] TRANSPORT
            #     Clears all test transport data. Tables remain intact.
            # ─────────────────────────────────────────────────────────────────
            print("  [B] Transport")
            await delete_all(conn, SCHEMA, "student_transport_assignments")
            await delete_all(conn, SCHEMA, "student_trips")  # may not exist — handled gracefully
            await delete_all(conn, SCHEMA, "trips")
            await delete_all(conn, SCHEMA, "route_stops")
            await delete_all(conn, SCHEMA, "routes")
            await delete_all(conn, SCHEMA, "vehicles")
            await delete_all(conn, SCHEMA, "trip_types")
            await delete_all(conn, SCHEMA, "route_types")

            # ─────────────────────────────────────────────────────────────────
            # [C] EXAM TRANSACTIONAL (all years)
            #     Removes marks, results, eligibility, audit.
            #     Keeps: exams, exam configs, grade schemes, remark sets.
            # ─────────────────────────────────────────────────────────────────
            print("  [C] Exam Transactional Records")
            await delete_all(conn, SCHEMA, "student_marks")
            await delete_all(conn, SCHEMA, "student_subject_results")
            await delete_all(conn, SCHEMA, "student_exam_results")
            await delete_all(conn, SCHEMA, "hall_ticket_eligibility")
            await delete_all(conn, SCHEMA, "exam_audit_log")

            # ─────────────────────────────────────────────────────────────────
            # [D] STUDENT JUNK DATA (student records themselves kept)
            # ─────────────────────────────────────────────────────────────────
            print("  [D] Student Junk Data")
            await delete_all(conn, SCHEMA, "student_attendance")
            await delete_all(conn, SCHEMA, "student_documents")
            await delete_all(conn, SCHEMA, "student_certificates")
            await delete_all(conn, SCHEMA, "student_homework")

            # ─────────────────────────────────────────────────────────────────
            # [E] STAFF JUNK DATA (staff records kept)
            # ─────────────────────────────────────────────────────────────────
            print("  [E] Staff Junk Data")
            await delete_all(conn, SCHEMA, "staff_attendance")

            # ─────────────────────────────────────────────────────────────────
            # [F] EXPENSE TRANSACTIONS (types/categories/settings kept)
            # ─────────────────────────────────────────────────────────────────
            print("  [F] Expense Transactions")
            await delete_all(conn, SCHEMA, "expense_transaction_items")
            await delete_all(conn, SCHEMA, "expense_attachments")
            await delete_all(conn, SCHEMA, "expense_audit_log")
            await delete_all(conn, SCHEMA, "expense_transactions")

            # ─────────────────────────────────────────────────────────────────
            # [G] PROFILE AUDIT LOGS
            # ─────────────────────────────────────────────────────────────────
            print("  [G] Audit Logs")
            await delete_all(conn, SCHEMA, "profile_audit_logs")

            # ─────────────────────────────────────────────────────────────────
            # [H] OLD ACADEMIC YEAR DATA
            #     Cascades through all tables linked to old academic years.
            #     Valid-year data (classes, subjects, exams, fees) is preserved.
            # ─────────────────────────────────────────────────────────────────
            if not old_ay_ids:
                print("  [H] Old Academic Year Data — none to remove")
            else:
                old_ay_in = in_clause(old_ay_ids)
                print(f"  [H] Old Academic Year Data ({len(old_ay_ids)} year(s) to purge)")

                # Resolve IDs for old-year entities
                old_class_rows = await conn.fetch(
                    f'SELECT id FROM "{SCHEMA}".classes WHERE academic_year_id IN ({old_ay_in})'
                )
                old_class_ids = ids(old_class_rows)

                # Old sections (needed before timetables — timetables link via section_id, not academic_year_id)
                old_section_ids = []
                if old_class_ids:
                    old_section_rows = await conn.fetch(
                        f'SELECT id FROM "{SCHEMA}".sections WHERE class_id IN ({in_clause(old_class_ids)})'
                    )
                    old_section_ids = ids(old_section_rows)

                old_exam_rows = await conn.fetch(
                    f'SELECT id FROM "{SCHEMA}".exams WHERE academic_year_id IN ({old_ay_in})'
                )
                old_exam_ids = ids(old_exam_rows)

                # Timetables: no academic_year_id column — resolve via old sections
                old_tt_ids = []
                if old_section_ids:
                    old_tt_rows = await conn.fetch(
                        f'SELECT id FROM "{SCHEMA}".timetables ' f"WHERE section_id IN ({in_clause(old_section_ids)})"
                    )
                    old_tt_ids = ids(old_tt_rows)

                old_term_rows = await conn.fetch(
                    f'SELECT id FROM "{SCHEMA}".fee_terms WHERE academic_year_id IN ({old_ay_in})'
                )
                old_term_ids = ids(old_term_rows)

                # H1 — Old exam configs
                if old_exam_ids:
                    old_exam_in = in_clause(old_exam_ids)
                    await delete_where(
                        conn, SCHEMA, "exam_mark_entry_permissions", f"exam_id IN ({old_exam_in})", "(old years)"
                    )
                    old_cfg_rows = await conn.fetch(
                        f'SELECT id FROM "{SCHEMA}".exam_subject_config WHERE exam_id IN ({old_exam_in})'
                    )
                    old_cfg_ids = ids(old_cfg_rows)
                    if old_cfg_ids:
                        await delete_where(
                            conn,
                            SCHEMA,
                            "exam_subject_components",
                            f"subject_config_id IN ({in_clause(old_cfg_ids)})",
                            "(old years)",
                        )
                    await delete_where(
                        conn, SCHEMA, "exam_subject_config", f"exam_id IN ({old_exam_in})", "(old years)"
                    )
                    await delete_where(
                        conn, SCHEMA, "exam_class_sections", f"exam_id IN ({old_exam_in})", "(old years)"
                    )
                    await delete_where(conn, SCHEMA, "exam_dates", f"exam_id IN ({old_exam_in})", "(old years)")
                    # exam_streams and exam_settings are standalone config (no exam_id FK) — kept
                    await delete_where(conn, SCHEMA, "exams", f"id IN ({old_exam_in})", "(old years)")

                # H2 — board_exam_patterns is standalone config (no academic_year_id)
                #       It is KEPT — nothing to delete here.

                # H3 — Old timetables
                #   timetable_subject_options.slot_id → timetable_slots.id
                #   slot_times.section_id → sections.id  (NOT linked to timetables)
                if old_tt_ids:
                    old_tt_in = in_clause(old_tt_ids)
                    old_slot_rows = await conn.fetch(
                        f'SELECT id FROM "{SCHEMA}".timetable_slots WHERE timetable_id IN ({old_tt_in})'
                    )
                    old_slot_ids = ids(old_slot_rows)
                    if old_slot_ids:
                        # Column is slot_id (not timetable_slot_id)
                        await delete_where(
                            conn,
                            SCHEMA,
                            "timetable_subject_options",
                            f"slot_id IN ({in_clause(old_slot_ids)})",
                            "(old years)",
                        )
                    await delete_where(conn, SCHEMA, "timetable_slots", f"timetable_id IN ({old_tt_in})", "(old years)")
                if old_section_ids:
                    # slot_times links via section_id (not timetable_id)
                    await delete_where(
                        conn, SCHEMA, "slot_times", f"section_id IN ({in_clause(old_section_ids)})", "(old years)"
                    )
                    await delete_where(
                        conn, SCHEMA, "timetables", f"section_id IN ({in_clause(old_section_ids)})", "(old years)"
                    )

                # H4 — Null out stale FK refs in VALID-year admissions
                #       student_admissions.admitted_class_id / admitted_section_id
                #       can point to a class from an old year (when student first joined).
                #       We null these out before deleting the old classes.
                if old_class_ids:
                    old_class_in = in_clause(old_class_ids)
                    await update_where(
                        conn,
                        SCHEMA,
                        "student_admissions",
                        "admitted_class_id = NULL, admitted_section_id = NULL",
                        f"admitted_class_id IN ({old_class_in})",
                    )

                # H5 — Old class-subject mappings and subjects
                if old_class_ids:
                    await delete_where(
                        conn,
                        SCHEMA,
                        "class_subject_mappings",
                        f"class_id IN ({in_clause(old_class_ids)})",
                        "(old years)",
                    )
                if old_ay_in:
                    await delete_where(
                        conn, SCHEMA, "class_subject_mappings", f"academic_year_id IN ({old_ay_in})", "(old years)"
                    )

                # H6 — Old holidays and admissions
                await delete_where(conn, SCHEMA, "holidays", f"academic_year_id IN ({old_ay_in})", "(old years)")
                await delete_where(
                    conn, SCHEMA, "student_admissions", f"academic_year_id IN ({old_ay_in})", "(old years)"
                )

                # H7 — Old fee class mappings
                if old_class_ids:
                    old_fmap_rows = await conn.fetch(
                        f'SELECT id FROM "{SCHEMA}".fee_class_mappings '
                        f"WHERE class_id IN ({in_clause(old_class_ids)})"
                    )
                    old_fmap_ids = ids(old_fmap_rows)
                    if old_fmap_ids:
                        await delete_where(
                            conn,
                            SCHEMA,
                            "fee_class_map_term_amounts",
                            f"fee_class_mapping_id IN ({in_clause(old_fmap_ids)})",
                            "(old years)",
                        )
                        await delete_where(
                            conn,
                            SCHEMA,
                            "fee_class_mappings",
                            f"class_id IN ({in_clause(old_class_ids)})",
                            "(old years)",
                        )
                await delete_where(
                    conn,
                    SCHEMA,
                    "fee_class_mappings",
                    f"academic_year_id IN ({old_ay_in})",
                    "(old years — safety pass)",
                )

                # H8 — Old sections and classes
                if old_class_ids:
                    await delete_where(
                        conn, SCHEMA, "sections", f"class_id IN ({in_clause(old_class_ids)})", "(old years)"
                    )
                await delete_where(conn, SCHEMA, "classes", f"academic_year_id IN ({old_ay_in})", "(old years)")
                await delete_where(conn, SCHEMA, "subjects", f"academic_year_id IN ({old_ay_in})", "(old years)")

                # H9 — Old fee structure
                if old_term_ids:
                    old_term_in = in_clause(old_term_ids)
                    # fee_class_map_term_amounts has term_date_id → fee_term_dates.id
                    # Must clear those before deleting fee_term_dates
                    await delete_where(
                        conn,
                        SCHEMA,
                        "fee_class_map_term_amounts",
                        f"term_id IN ({old_term_in})",
                        "(old year terms — term_id pass)",
                    )
                    # Column is term_id (not fee_term_id)
                    await delete_where(conn, SCHEMA, "fee_term_dates", f"term_id IN ({old_term_in})", "(old years)")
                await delete_where(conn, SCHEMA, "fee_terms", f"academic_year_id IN ({old_ay_in})", "(old years)")
                await delete_where(conn, SCHEMA, "fee_categories", f"academic_year_id IN ({old_ay_in})", "(old years)")
                await delete_where(conn, SCHEMA, "fee_types", f"academic_year_id IN ({old_ay_in})", "(old years)")

                # H10 — Delete the old academic year rows themselves
                await delete_where(conn, SCHEMA, "academic_years", f"id IN ({old_ay_in})", "(purging old year rows)")

        # ── Snapshot AFTER ─────────────────────────────────────────────────────
        print("\n  Cleanup complete. Capturing row counts after...")
        after = await snapshot(conn, SCHEMA, SNAPSHOT_TABLES)

        # ── Summary report ─────────────────────────────────────────────────────
        print(f"\n{bar}")
        print("  CLEANUP SUMMARY")
        print(bar)
        print(f"  {'Table':<48} {'Before':>7} {'After':>7} {'Removed':>8}")
        print("  " + "-" * 75)

        total_removed = 0
        for t in SNAPSHOT_TABLES:
            b = before.get(t) or 0
            a = after.get(t) or 0
            removed = (b - a) if (b >= 0 and a >= 0) else 0
            total_removed += removed
            marker = "  ←" if removed > 0 else ""
            if b >= 0:
                print(f"  {t:<48} {b:>7} {a:>7} {removed:>8}{marker}")

        print("  " + "-" * 75)
        print(f"  {'TOTAL ROWS REMOVED':<48} {'':>7} {'':>7} {total_removed:>8}")

        # ── Sanity checks ─────────────────────────────────────────────────────
        print(f"\n  SANITY CHECKS")
        print("  " + "-" * 45)

        checks = {
            "users unchanged": after.get("users", 0) == before.get("users", 0),
            "roles unchanged": after.get("roles", 0) == before.get("roles", 0),
            "menus unchanged": after.get("menus", 0) == before.get("menus", 0),
            "role_menu_permissions unchanged": after.get("role_menu_permissions", 0)
            == before.get("role_menu_permissions", 0),
            "students unchanged": after.get("students", 0) == before.get("students", 0),
            "staff unchanged": after.get("staff", 0) == before.get("staff", 0),
            "parents unchanged": after.get("parents", 0) == before.get("parents", 0),
            "castes unchanged": after.get("castes", 0) == before.get("castes", 0),
            "academic_years = 3 max": after.get("academic_years", 0) <= 3,
            "fee_transactions = 0": after.get("fee_transactions", 0) == 0,
            "fee_receipts = 0": after.get("fee_receipts", 0) == 0,
            "trips = 0": after.get("trips", 0) == 0,
            "routes = 0": after.get("routes", 0) == 0,
            "student_marks = 0": after.get("student_marks", 0) == 0,
            "student_attendance = 0": after.get("student_attendance", 0) == 0,
            "staff_attendance = 0": after.get("staff_attendance", 0) == 0,
            "exam_grade_schemes preserved": after.get("exam_grade_schemes", 0) == before.get("exam_grade_schemes", 0),
            "expense_types preserved": after.get("expense_types", 0) == before.get("expense_types", 0),
        }

        all_pass = True
        for check, passed in checks.items():
            icon = "✓" if passed else "✗"
            if not passed:
                all_pass = False
            print(f"  {icon}  {check}")

        print()
        if all_pass:
            print(f"  ✓  All sanity checks PASSED")
        else:
            print(f"  ✗  Some sanity checks FAILED — review the output above")

        # ── Save JSON report ───────────────────────────────────────────────────
        report = {
            "timestamp": datetime.utcnow().isoformat(),
            "schema": SCHEMA,
            "kept_academic_years": KEEP_ACADEMIC_YEARS,
            "found_in_schema": keep_ay_names,
            "old_years_purged": old_ay_names,
            "total_rows_removed": total_removed,
            "all_sanity_checks_passed": all_pass,
            "before": {k: v for k, v in before.items() if v >= 0},
            "after": {k: v for k, v in after.items() if v >= 0},
        }
        ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        report_path = f"cleanup_report_{SCHEMA}_{ts}.json"
        with open(report_path, "w") as f:
            json.dump(report, f, indent=2, default=str)
        print(f"\n  Report saved: {report_path}\n")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
