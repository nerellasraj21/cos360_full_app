import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import _target

_target.assert_safe_target()

import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=int(os.environ.get("QA_API_PORT", "8100")))
