"""
Celery application configuration for background jobs
"""

from celery import Celery

from app.config import settings

# Create Celery app
celery_app = Celery(
    "cos360",
    broker=f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}",
    backend=f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}",
    include=[
        "app.tasks.report_tasks",
        "app.tasks.exam.excel_upload_task",
        "app.tasks.exam.pdf_generation_task",
        "app.tasks.exam.aggregate_compute_task",
        "app.tasks.exam.notification_task",
        "app.tasks.students.certificate_tasks",
        "app.tasks.communication.send_tasks",
    ],
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_disable_rate_limits=True,
)

# Optional configuration for better performance
celery_app.conf.update(
    result_expires=3600,  # 1 hour
    task_ignore_result=False,
    task_store_eager_result=True,
)

# Beat scheduler for periodic tasks
from celery.schedules import crontab

celery_app.conf.beat_schedule = {
    "cleanup-stale-files-daily": {
        "task": "cleanup_stale_files",
        "schedule": crontab(hour=2, minute=0),  # Daily at 2 AM UTC
        "options": {"expires": 60 * 60},  # Task expires after 1 hour if not executed
    },
}
