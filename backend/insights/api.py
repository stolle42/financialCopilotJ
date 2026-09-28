from datetime import date, timedelta

from django.utils import timezone
from ninja import Query, Router

from insights.queries import insights_payload
from insights.schemas import InsightsOut

router = Router(tags=["insights"])


def _current_calendar_month() -> tuple[date, date]:
    today = timezone.localdate()
    start = today.replace(day=1)
    if today.month == 12:
        end = date(today.year, 12, 31)
    else:
        end = date(today.year, today.month + 1, 1) - timedelta(days=1)
    return start, end


@router.get("/insights", response=InsightsOut)
def get_insights(
    request,
    from_date: date | None = Query(None, alias="from"),
    to: date | None = None,
):
    if from_date is None or to is None:
        from_date, to = _current_calendar_month()
    return insights_payload(start=from_date, end=to)
