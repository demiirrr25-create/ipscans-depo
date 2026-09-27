"""License / subscription architecture (spec items 30-32).

Phase 1 (now): a local-only mock provider — no network calls, no payment.
Phase 2 (planned): RemoteLicenseProvider will call the ipscans.com Next.js
API (new `/api/license/*` routes backed by the site's existing Vercel
deployment) for real activation/validation, with the last successful
response cached locally via Database so the app still works offline for a
grace period (spec item 32). The Database.get_license/save_license methods
already used here are the same ones that cache will use, so swapping the
provider later requires no schema changes.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Protocol

from pro.database import Database


class Plan:
    FREE = "FREE"
    PRO = "PRO"
    BUSINESS = "BUSINESS"
    ENTERPRISE = "ENTERPRISE"


# Feature gating table — the UI checks `plan in FEATURE_PLANS[feature]`
# rather than hardcoding plan names throughout, so limits can move to a
# remote config later without touching call sites.
FEATURE_PLANS = {
    "continuous_monitoring": {Plan.PRO, Plan.BUSINESS, Plan.ENTERPRISE},
    "pdf_export": {Plan.BUSINESS, Plan.ENTERPRISE},
    "multi_site": {Plan.ENTERPRISE},
}


@dataclass
class LicenseStatus:
    plan: str
    status: str  # ACTIVE | INACTIVE | EXPIRED | TRIAL
    email: str | None
    expires_at: str | None

    @property
    def is_active(self) -> bool:
        return self.status in ("ACTIVE", "TRIAL")

    def has_feature(self, feature: str) -> bool:
        return self.is_active and self.plan in FEATURE_PLANS.get(feature, set())


class LicenseProvider(Protocol):
    def get_status(self) -> LicenseStatus: ...
    def activate(self, email: str, license_key: str) -> LicenseStatus: ...


class MockLicenseProvider:
    """Phase 1 stand-in: any non-empty key "activates" a 30-day PRO trial,
    persisted locally. No network call is made — this exists purely so the
    rest of the app (feature gating, license panel UI) can be built and
    tested against a real interface before the backend exists.
    """

    def __init__(self, db: Database) -> None:
        self._db = db

    def get_status(self) -> LicenseStatus:
        row = self._db.get_license()
        if row is None:
            return LicenseStatus(plan=Plan.FREE, status="INACTIVE", email=None, expires_at=None)
        return LicenseStatus(
            plan=row["plan"], status=row["status"], email=row["email"], expires_at=row["expires_at"],
        )

    def activate(self, email: str, license_key: str) -> LicenseStatus:
        if not license_key.strip():
            return LicenseStatus(plan=Plan.FREE, status="INACTIVE", email=email, expires_at=None)
        expires = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(timespec="seconds")
        self._db.save_license(plan=Plan.PRO, status="TRIAL", email=email, expires_at=expires)
        return self.get_status()
