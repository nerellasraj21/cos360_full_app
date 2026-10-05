from collections.abc import Iterable


def attendance_percentage(present: int, half_day: int, total: int) -> float:
    if total <= 0:
        return 0.0
    return round((present + 0.5 * half_day) / total * 100, 2)


def attendance_percentage_from_statuses(statuses: Iterable[str | None]) -> float | None:
    normalized = [(status or "").strip().lower() for status in statuses]
    if not normalized:
        return None
    return attendance_percentage(normalized.count("present"), normalized.count("half_day"), len(normalized))
