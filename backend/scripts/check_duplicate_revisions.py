"""
Check for duplicate revision IDs in Alembic migrations
Prevents migration chain corruption
"""
import os
import re
import sys
from pathlib import Path
from collections import defaultdict

def check_duplicate_revisions():
    """Check for duplicate revision IDs in migration files"""

    migrations_dir = Path("migrations/versions")

    if not migrations_dir.exists():
        print(f"ERROR: Migrations directory not found: {migrations_dir}")
        return 1

    revision_pattern = re.compile(r'^revision:\s*str\s*=\s*[\'"]([a-f0-9]+)[\'"]', re.MULTILINE)

    revisions = defaultdict(list)

    # Scan all Python migration files
    for filepath in migrations_dir.glob("*.py"):
        if filepath.name == "__init__.py":
            continue

        try:
            content = filepath.read_text(encoding='utf-8')

            # Find revision ID
            match = revision_pattern.search(content)
            if match:
                revision_id = match.group(1)
                revisions[revision_id].append(filepath.name)

        except Exception as e:
            print(f"WARNING: Could not read {filepath.name}: {e}")

    # Check for duplicates
    duplicates = {rev: files for rev, files in revisions.items() if len(files) > 1}

    if duplicates:
        print("=" * 70)
        print("DUPLICATE REVISION IDs DETECTED")
        print("=" * 70)
        print()

        for revision_id, files in duplicates.items():
            print(f"Revision ID: {revision_id}")
            print(f"Found in {len(files)} files:")
            for filename in files:
                print(f"  - {filename}")
            print()

        print("=" * 70)
        print("ACTION REQUIRED")
        print("=" * 70)
        print("Fix duplicates before proceeding:")
        print("1. Choose which file to keep original revision ID")
        print("2. Rename other file(s) with new unique revision IDs")
        print("3. Update 'revision' variable in renamed files")
        print()
        print("Example:")
        print("  mv migrations/versions/abc123_old.py migrations/versions/xyz789_old.py")
        print("  # Then edit xyz789_old.py and change:")
        print("  # revision: str = 'xyz789'")
        print()

        return 1

    else:
        print("=" * 70)
        print("MIGRATION REVISION CHECK")
        print("=" * 70)
        print(f"Total migration files: {len(revisions)}")
        print(f"Unique revision IDs: {len(revisions)}")
        print()
        print("[OK] No duplicate revision IDs found")
        print("=" * 70)

        return 0

if __name__ == "__main__":
    sys.exit(check_duplicate_revisions())
