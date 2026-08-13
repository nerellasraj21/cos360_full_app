"""
MSG91 / DLT SMS template registry.

Single source of truth for every transactional SMS the school sends.

Each entry holds:
  - the exact DLT-registered body text (what the telco matches against)
  - the ordered variable list, which maps 1:1 onto MSG91's var1..varN
  - the env var names that will carry the MSG91 flow id and the DLT TE id

Per TRAI/DLT rules every distinct message wording needs its OWN registered
template — variables only vary the values, never the wording — so there is
one entry per approved template, not one shared template.

Template IDs are read from the environment at send time and are expected to
be blank until each template clears DLT approval. `is_registered()` tells a
caller whether a given template can actually be sent yet.
"""

import logging
import os
from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple

logger = logging.getLogger(__name__)

# DLT placeholder token. The registered body uses this marker wherever a
# value is substituted; MSG91 fills them positionally from var1..varN.
VAR = "{#var#}"


@dataclass(frozen=True)
class SmsTemplate:
    """One DLT-registered SMS template."""

    key: str
    name: str  # name as registered on the DLT portal
    body: Optional[str]  # exact registered text with VAR placeholders; None until drafted
    variables: Tuple[str, ...]  # ordered; position N -> "varN"
    msg91_env: str  # env var holding MSG91's flow template id
    dlt_env: str  # env var holding the 19-digit DLT TE id

    def is_defined(self) -> bool:
        """False for placeholder entries whose wording has not been drafted yet."""
        return bool(self.body)

    def build_variables(self, **values: Any) -> Dict[str, str]:
        """
        Map named values onto MSG91's positional var1..varN.

        Every variable declared on the template must be supplied — a missing
        one would shift every later value into the wrong slot and produce a
        message that no longer matches the registered template.
        """
        if not self.is_defined():
            raise ValueError(
                f"Template {self.key!r} has no body defined yet — cannot build variables"
            )

        missing = [name for name in self.variables if name not in values]
        if missing:
            raise ValueError(
                f"Template {self.key!r} is missing variable(s): {', '.join(missing)}"
            )

        extra = [name for name in values if name not in self.variables]
        if extra:
            raise ValueError(
                f"Template {self.key!r} does not declare variable(s): {', '.join(extra)}"
            )

        return {
            f"var{index}": "" if values[name] is None else str(values[name])
            for index, name in enumerate(self.variables, start=1)
        }

    def render(self, **values: Any) -> str:
        """
        Substitute values into the body for the human-readable audit copy
        stored in NotificationQueue.rendered_message / NotificationLog.message.
        This is for our records only — MSG91 renders the real text from the
        registered template.
        """
        if not self.is_defined():
            raise ValueError(f"Template {self.key!r} has no body defined yet — cannot render")

        rendered = self.body
        for name in self.variables:
            value = values.get(name)
            rendered = rendered.replace(VAR, "" if value is None else str(value), 1)
        return rendered

    def template_id(self) -> Optional[str]:
        """MSG91 flow template id, or None if not yet configured."""
        return os.environ.get(self.msg91_env, "").strip() or None

    def dlt_te_id(self) -> Optional[str]:
        """19-digit DLT TE id, or None if not yet configured."""
        return os.environ.get(self.dlt_env, "").strip() or None

    def is_registered(self) -> bool:
        """
        True once the template is sendable: body drafted, MSG91 flow id set,
        and DLT id set. The DLT id is not optional — a send without it is
        rejected on Indian routes — so it counts towards readiness.
        """
        return self.is_defined() and self.template_id() is not None and self.dlt_te_id() is not None


TEMPLATES: Dict[str, SmsTemplate] = {
    "welcome": SmsTemplate(
        key="welcome",
        name="Welcome",
        body=(
            f"Dear {VAR}, we welcome {VAR}, admission no {VAR} "
            f"{VAR}, {VAR}"
        ),
        variables=("father_name", "student_name", "admission_no", "school_name", "location"),
        msg91_env="MSG91_TEMPLATE_ID_ADMISSION",
        dlt_env="MSG91_DLT_TE_ID_ADMISSION",
    ),
    "student_absentee": SmsTemplate(
        key="student_absentee",
        name="Student Absentees",
        body=f"Dear parent, your {VAR}({VAR}) is absent today {VAR}, {VAR}",
        variables=("student_name", "absence_date", "school_name", "location"),
        msg91_env="MSG91_TEMPLATE_ID_ABSENTEE",
        dlt_env="MSG91_DLT_TE_ID_ABSENTEE",
    ),
    "staff_recruiting": SmsTemplate(
        key="staff_recruiting",
        name="Staff recruiting",
        body=(
            f"Dear candidate, Congratulations {VAR}, we warmly welcoming you to the team "
            f"and wishing you all the best thank you {VAR}, {VAR}"
        ),
        variables=("staff_name", "school_name", "location"),
        msg91_env="MSG91_TEMPLATE_ID_STAFF_RECRUITING",
        dlt_env="MSG91_DLT_TE_ID_STAFF_RECRUITING",
    ),
    "staff_attendance": SmsTemplate(
        key="staff_attendance",
        name="Staff Attendance",
        body=(
            f"Dear {VAR}, your attendance is marked as leave or absent today({VAR}) "
            f"{VAR}, {VAR}"
        ),
        variables=("staff_name", "attendance_date", "school_name", "location"),
        msg91_env="MSG91_TEMPLATE_ID_STAFF_ATTENDANCE",
        dlt_env="MSG91_DLT_TE_ID_STAFF_ATTENDANCE",
    ),
    "fee_collection": SmsTemplate(
        key="fee_collection",
        name="Fee Collection",
        body=(
            f"Dear parent we have received Payment of amount {VAR} {VAR} {VAR} {VAR} "
            f"Receipt no {VAR} Thank you for the payment {VAR}, {VAR}"
        ),
        variables=(
            "amount",
            "student_name",
            "class_name",
            "section",
            "receipt_no",
            "school_name",
            "location",
        ),
        msg91_env="MSG91_TEMPLATE_ID_FEE_RECEIPT",
        dlt_env="MSG91_DLT_TE_ID_FEE_RECEIPT",
    ),
    "exam_schedule": SmsTemplate(
        key="exam_schedule",
        name="Exam Schedule",
        body=(
            f"Dear {VAR}, the {VAR} exam for {VAR} begins on {VAR}. "
            f"Timetable on the app."
        ),
        variables=("parent_name", "exam_name", "student_name", "exam_date"),
        msg91_env="MSG91_TEMPLATE_ID_EXAM_SCHEDULE",
        dlt_env="MSG91_DLT_TE_ID_EXAM_SCHEDULE",
    ),
    "mark_entry": SmsTemplate(
        key="mark_entry",
        name="mark entry",
        body=(
            f"Dear parent results for {VAR} {VAR} ({VAR}) {VAR}, {VAR} "
            f"{VAR}, {VAR}"
        ),
        variables=(
            "student_name",
            "exam_name",
            "exam_code",
            "subject_code",
            "marks",
            "school_name",
            "location",
        ),
        msg91_env="MSG91_TEMPLATE_ID_RESULTS",
        dlt_env="MSG91_DLT_TE_ID_RESULTS",
    ),
    "holiday": SmsTemplate(
        key="holiday",
        name="Holiday",
        body=f"Dear parent school will be holiday on {VAR}",
        variables=("holiday_date",),
        msg91_env="MSG91_TEMPLATE_ID_HOLIDAY",
        dlt_env="MSG91_DLT_TE_ID_HOLIDAY",
    ),
    "homework": SmsTemplate(
        key="homework",
        name="Homework diary",
        body=f"Homework for {VAR} (Class {VAR}): {VAR} - {VAR}",
        variables=("student_name", "class_section", "subject", "exercise"),
        msg91_env="MSG91_TEMPLATE_ID_HOMEWORK",
        dlt_env="MSG91_DLT_TE_ID_HOMEWORK",
    ),
    "hall_ticket": SmsTemplate(
        key="hall_ticket",
        name="Hall Ticket",
        # Placeholder — wording not drafted yet (the row was blank on the
        # approved-template sheet). Fill in `body` and `variables` together,
        # then register with DLT. Until then is_defined() is False and the
        # hall-ticket call sites skip instead of sending.
        body=None,
        variables=(),
        msg91_env="MSG91_TEMPLATE_ID_HALL_TICKET",
        dlt_env="MSG91_DLT_TE_ID_HALL_TICKET",
    ),
}


def get_template(key: str) -> SmsTemplate:
    """Look up a template by key. Raises KeyError with the valid keys listed."""
    try:
        return TEMPLATES[key]
    except KeyError as exc:
        raise KeyError(
            f"Unknown SMS template {key!r}. Available: {', '.join(sorted(TEMPLATES))}"
        ) from exc


def build_target_ref(key: str, **values: Any) -> Dict[str, Any]:
    """
    Build the NotificationQueue.target_ref payload for a template.

    Returns the dict shape that _process_single() in send_tasks.py already
    reads: msg91_template_id + variables, plus the DLT TE id.
    """
    template = get_template(key)
    return {
        "msg91_template_id": template.template_id(),
        "dlt_te_id": template.dlt_te_id(),
        "variables": template.build_variables(**values),
    }
