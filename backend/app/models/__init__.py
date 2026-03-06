# Import all models for proper discovery by Alembic

# Public schema models
# Authentication models
from .auth import *  # noqa: F403

# Exam module models
from .exam import *  # noqa: F403

# Expense models (new)
from .expense import *  # noqa: F403

# Fee models
from .fee import *  # noqa: F403

# Masters models
from .masters import *  # noqa: F403
from .public import *  # noqa: F403

# Student models
from .student import *  # noqa: F403
