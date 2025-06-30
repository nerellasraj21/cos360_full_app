#!/bin/bash
set -e
echo "Waiting for postgres..."
while ! nc -z $DB_HOST $DB_PORT; do
  sleep 0.1
done
echo "PostgreSQL started"

# migration file
alembic revision --autogenerate -m "Full schema for AY, classes, sections"

# applies all migrations to the DB
alembic -c /app/alembic.ini upgrade head

exec uvicorn app.main:app --host 0.0.0.0 --port 8000