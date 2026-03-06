#!/bin/bash
set -e

# Add debugging to see if script is running
echo "Starting COS360 application..."
echo "DATABASE_URL: ${DATABASE_URL:0:50}..."
echo "PYTHONPATH: $PYTHONPATH"

# Start the application
echo "Starting uvicorn server on 0.0.0.0:8000"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4 --log-level info --access-log