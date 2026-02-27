from enum import Enum


class ExamStatus(str, Enum):
    draft = "draft"
    active = "active"
    published = "published"
    locked = "locked"
    finalized = "finalized"


class ExamNature(str, Enum):
    formative = "formative"
    summative = "summative"
    cumulative = "cumulative"
    custom = "custom"


class ExamLevel(str, Enum):
    pre_primary = "pre_primary"
    primary = "primary"
    upper_primary = "upper_primary"
    secondary = "secondary"
    inter = "inter"
    diploma = "diploma"
    btech = "btech"
    mtech = "mtech"
    iit = "iit"
    others = "others"


class ExamBoard(str, Enum):
    cbse = "CBSE"
    icse = "ICSE"
    state = "State"
    btech = "BTech"
    custom = "Custom"


class EntryType(str, Enum):
    """Component scoring type — marks-based or remarks/grade-based."""
    marks = "marks"
    remarks = "remarks"


class UploadMethod(str, Enum):
    """How marks were entered — online UI or Excel upload."""
    online = "online"
    excel_upload = "excel_upload"


class AuditAction(str, Enum):
    mark_entered = "mark_entered"
    mark_updated = "mark_updated"
    bulk_uploaded = "bulk_uploaded"
    exam_published = "exam_published"
    exam_unlocked = "exam_unlocked"
    grace_applied = "grace_applied"
    moderation_applied = "moderation_applied"
    result_withheld = "result_withheld"
    result_released = "result_released"


class IneligibilityReason(str, Enum):
    fee_pending = "FEE_PENDING"
    low_attendance = "LOW_ATTENDANCE"
    both = "BOTH"
