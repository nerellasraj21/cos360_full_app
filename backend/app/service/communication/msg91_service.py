"""
MSG91 SMS Service — Flow API (DLT-compliant transactional SMS).

Encapsulates: phone normalization, payload building, HTTP calls to MSG91.
Follows MSG91 Flow API spec: POST https://control.msg91.com/api/v5/flow/

Every send carries a DLT template id — it is mandatory for Indian
transactional SMS, so there is no code path that sends without one.
"""

import logging
import os
import re
from typing import Any, Dict, Optional

import httpx

logger = logging.getLogger(__name__)

MSG91_FLOW_URL = "https://control.msg91.com/api/v5/flow/"

# Indian mobile numbers are 10 digits and begin 6-9.
_INDIAN_MOBILE = re.compile(r"^[6-9]\d{9}$")


def normalize_phone(phone: str) -> str:
    """
    Normalize an Indian mobile number to MSG91's 91-prefixed form.

    Accepts the shapes that turn up in imported parent/staff data:
      "9876543210", "+91 98765 43210", "98765-43210", "09876543210",
      "919876543210", "0091 9876543210"
    Returns: "919876543210"

    Length decides whether a leading "91" is a country code. Testing the
    prefix first would misread valid 9-series mobiles such as 9199887766
    as country-coded and reject them.

    Raises ValueError if the number is not a valid Indian mobile.
    """
    if not phone:
        raise ValueError("Phone number is empty")

    digits = re.sub(r"\D", "", str(phone))
    if not digits:
        raise ValueError(f"Phone number contains no digits: {phone!r}")

    # Strip international / trunk prefixes before deciding on length.
    if len(digits) == 14 and digits.startswith("0091"):
        digits = digits[4:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]

    if len(digits) == 12 and digits.startswith("91"):
        national = digits[2:]
    elif len(digits) == 10:
        national = digits
    else:
        raise ValueError(
            f"Invalid Indian phone number: {phone!r} ({len(digits)} digits after cleaning)"
        )

    if not _INDIAN_MOBILE.match(national):
        raise ValueError(
            f"Not a valid Indian mobile: {phone!r} (need 10 digits starting 6-9)"
        )

    return f"91{national}"


def build_msg91_payload(
    template_id: str,
    phone: str,
    variables: Dict[str, Any],
    dlt_te_id: str,
    sender: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Build the MSG91 Flow API payload (no HTTP call; just constructs the dict).

    Args:
        template_id: MSG91 flow template id
        phone: recipient in E.164 form (91-prefixed), already normalized
        variables: positional template variables {var1: value, var2: value, ...}
        dlt_te_id: 19-digit DLT template id — mandatory for Indian routes
        sender: registered DLT header/sender id, if configured

    Note that template_id and dlt_te_id are different values: the first is
    MSG91's own flow identifier, the second is the template registered with
    the telecom operator.
    """
    if not template_id:
        raise ValueError("template_id is required")
    if not phone:
        raise ValueError("phone is required")
    if not dlt_te_id:
        raise ValueError("dlt_te_id is required — DLT template is mandatory")

    recipient: Dict[str, Any] = {"mobiles": phone}
    if variables:
        if "mobiles" in variables:
            raise ValueError("'mobiles' is reserved and cannot be used as a template variable")
        recipient.update(variables)

    payload: Dict[str, Any] = {
        "template_id": template_id,
        "DLT_TE_ID": dlt_te_id,
        "short_url": "0",
        "realTimeResponse": "1",
        "recipients": [recipient],
    }
    if sender:
        payload["sender"] = sender

    return payload


def send_sms_via_msg91(row_data: Dict[str, Any]) -> str:
    """
    Execute HTTP POST to MSG91 Flow API.

    Args:
        row_data: Dict with keys:
            - template_id: MSG91 flow template id
            - dlt_te_id: DLT template id (mandatory)
            - recipient_phone: phone in any format; normalized here
            - variables: template variables (optional)
            - rendered_message: human-readable audit text (for logging)

    Returns:
        request_id from MSG91 (for audit trail in NotificationLog)

    Raises:
        ValueError: on missing config, invalid phone, or any MSG91 failure.
    """
    # `or ""` rather than a .get() default: these keys are usually present
    # with a None value (unset env vars resolve to None), and None has no
    # .strip().
    auth_key = (os.environ.get("MSG91_AUTH_KEY") or "").strip()
    if not auth_key:
        raise ValueError("MSG91_AUTH_KEY not configured in environment")

    template_id = (row_data.get("template_id") or "").strip()
    if not template_id:
        raise ValueError("template_id not found in row_data")

    dlt_te_id = (row_data.get("dlt_te_id") or "").strip()
    if not dlt_te_id:
        raise ValueError("dlt_te_id not found in row_data — DLT template is mandatory")

    phone = (row_data.get("recipient_phone") or "").strip()
    if not phone:
        raise ValueError("recipient_phone not found in row_data")

    phone = normalize_phone(phone)
    variables = row_data.get("variables") or {}
    sender = (os.environ.get("MSG91_SENDER_ID") or "").strip() or None
    rendered_message = row_data.get("rendered_message") or ""

    payload = build_msg91_payload(template_id, phone, variables, dlt_te_id, sender)
    headers = {"authkey": auth_key, "Content-Type": "application/json"}

    logger.info(
        "Sending SMS via MSG91: to=%s, template_id=%s, dlt_te_id=%s, message=%.50s",
        phone,
        template_id,
        dlt_te_id,
        rendered_message,
    )

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(MSG91_FLOW_URL, json=payload, headers=headers)
    except httpx.RequestError as exc:
        logger.error("MSG91 request failed: %s", exc)
        raise ValueError(f"MSG91 request failed: {exc}") from exc

    # MSG91 puts the actual reason (bad authkey, template not approved,
    # insufficient credits) in the response body, so keep it in the error.
    if response.status_code >= 400:
        logger.error("MSG91 HTTP %s: %s", response.status_code, response.text[:500])
        raise ValueError(f"MSG91 HTTP {response.status_code}: {response.text[:500]}")

    try:
        data = response.json()
    except ValueError as exc:
        raise ValueError(f"MSG91 returned non-JSON response: {response.text[:500]}") from exc

    if data.get("type") == "error":
        error_msg = data.get("message", "Unknown MSG91 error")
        logger.error("MSG91 API error: %s", error_msg)
        raise ValueError(f"MSG91 error: {error_msg}")

    request_id = data.get("request_id") or data.get("message") or "sms_sent"
    logger.info("SMS sent successfully: request_id=%s", request_id)

    return request_id
