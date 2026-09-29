from uuid import UUID

from pydantic import BaseModel


class NotificationRequest(BaseModel):
    notification_type: str  # hall_ticket_available | results_published | exam_schedule | custom
    message: str
    target_audience: str = "students"  # students | parents | all
    send_push: bool = True
    send_sms: bool = False
    send_email: bool = True


class NotificationResponse(BaseModel):
    exam_id: UUID
    notifications_queued: int
    notification_type: str
