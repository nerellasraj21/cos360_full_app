#!/usr/bin/env python3
"""
Script to start Celery worker for background report generation
"""

import os
import sys

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))

from app.celery_app import celery_app

if __name__ == "__main__":
    # Start Celery worker
    celery_app.worker_main(["worker", "--loglevel=info", "--concurrency=2", "--hostname=cos360-worker@%h"])
