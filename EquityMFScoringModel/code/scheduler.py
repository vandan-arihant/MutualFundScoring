"""
The once-a-day refresh, run in-process by APScheduler.

A cron trigger (default 06:30 Asia/Kolkata) rather than a 24-hour interval: the
refresh lands at the same predictable wall-clock time every day and doesn't drift
every time the server restarts. `coalesce` + `misfire_grace_time` mean a machine
that was asleep or down through one or more fire times runs a single catch-up on
wake, not a backlog of queued refreshes.

Configuration (all optional, read from the same .env data_sources loads):
    REFRESH_HOUR    0-23        (default 6)
    REFRESH_MINUTE  0-59        (default 30)
    REFRESH_TZ      IANA name   (default Asia/Kolkata)

Rejected alternatives: a raw `while True: sleep(86400)` thread reimplements the
misfire handling and error isolation APScheduler already provides; an OS-level
cron job adds an external moving part while the hosting target is still
undecided. If this service ever moves to a serverless platform -- where an
in-process thread won't survive scale-to-zero -- the replacement is an external
scheduler calling POST /api/refresh, and only this module goes away.
"""

import logging
import os
import threading
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from data_sources import _env_number
from cache_store import is_stale, refresh_cache

log = logging.getLogger(__name__)

JOB_ID = "daily_refresh"
DEFAULT_HOUR = 6
DEFAULT_MINUTE = 30
DEFAULT_TZ = "Asia/Kolkata"
STALE_AFTER_HOURS = 24

_scheduler = None


def _resolve_tz():
    name = (os.getenv("REFRESH_TZ") or "").strip() or DEFAULT_TZ
    try:
        ZoneInfo(name)
        return name
    except (ZoneInfoNotFoundError, ValueError):
        # A typo in REFRESH_TZ shouldn't stop the server from booting.
        log.warning("REFRESH_TZ=%r is not a known timezone -- falling back to %s", name, DEFAULT_TZ)
        return DEFAULT_TZ


def _config():
    hour = int(_env_number("REFRESH_HOUR", DEFAULT_HOUR, int)) % 24
    minute = int(_env_number("REFRESH_MINUTE", DEFAULT_MINUTE, int)) % 60
    return hour, minute, _resolve_tz()


def start():
    """Start the background scheduler and, if the cache is missing or stale,
    kick off one immediate catch-up refresh."""
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        return _scheduler

    hour, minute, tz = _config()
    _scheduler = BackgroundScheduler(timezone=tz)
    _scheduler.add_job(
        refresh_cache,
        CronTrigger(hour=hour, minute=minute, timezone=tz),
        id=JOB_ID,
        name="daily fund score refresh",
        max_instances=1,        # never two refreshes in flight
        coalesce=True,          # missed fire times collapse into one run
        misfire_grace_time=3600,
    )
    _scheduler.start()
    log.info("scheduler started -- daily refresh at %02d:%02d %s (next run: %s)",
             hour, minute, tz, next_run_time())

    _startup_catch_up()
    return _scheduler


def _startup_catch_up():
    if not is_stale(STALE_AFTER_HOURS):
        log.info("cached data is under %sh old -- no startup refresh needed", STALE_AFTER_HOURS)
        return
    # On a worker thread so uvicorn binds its port immediately: /api/funds serves
    # the disk cache and /api/status reports refresh_in_progress while the first
    # fetch-and-score (tens of seconds) is still running.
    log.info("cached data missing or older than %sh -- refreshing now", STALE_AFTER_HOURS)
    threading.Thread(target=refresh_cache, args=("startup",), name="startup-refresh", daemon=True).start()


def next_run_time():
    """ISO 8601 timestamp of the next scheduled refresh, or None if the
    scheduler isn't running.

    Served as `next_refresh_at`, and it is what lets the dashboard avoid
    pointless traffic: knowing the deadline, the browser can skip a refetch
    entirely until it passes, then arm one precise timer for the moment it does.
    """
    if _scheduler is None:
        return None
    job = _scheduler.get_job(JOB_ID)
    if job is None or job.next_run_time is None:
        return None
    return job.next_run_time.isoformat()


def shutdown(wait=False):
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown(wait=wait)
        log.info("scheduler stopped")
    _scheduler = None
