from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class Options:
    source_url: str
    target_url: str | None = None
    platform_schema: str = "public"
    tenants: list[str] = field(default_factory=list)
    execute: bool = False
    replace: bool = False
    allow_nonempty_platform: bool = False
    allow_same_database: bool = False
    confirm_target: str | None = None
    orphan_policy: str = "null"
    batch_size: int = 1000
    out_dir: Path = Path("migration_reports")
