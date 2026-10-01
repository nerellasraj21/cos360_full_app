import importlib
from pathlib import Path

from app.db.base import scope_uniques_to_tenant

_MODELS_DIR = Path(__file__).resolve().parent


def load_all_models() -> None:
    for path in sorted(_MODELS_DIR.rglob("*.py")):
        if path.name in ("__init__.py", "load_all.py"):
            continue
        relative = path.relative_to(_MODELS_DIR.parent.parent).with_suffix("")
        importlib.import_module(".".join(relative.parts))
    scope_uniques_to_tenant()
