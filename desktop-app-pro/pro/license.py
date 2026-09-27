"""License / subscription architecture (spec items 30-32).

Phase 1: a local-only mock provider — no network calls, no payment.
Phase 2: RemoteLicenseProvider calls the real ipscans.com Next.js API
(`/api/license/*`, backed by Vercel Blob) for activation/validation.
CachingLicenseProvider wraps it so the last successful server response is
cached locally via Database, keeping the app usable offline for a grace
period (spec item 32) — network failures fall back to that cache instead
of locking the user out.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Protocol

from pro.database import Database
from pro.remote_api import RemoteAPIError, post_json


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
    license_key: str | None = None

    @property
    def is_active(self) -> bool:
        if self.status not in ("ACTIVE", "TRIAL"):
            return False
        # Client-side backstop: even a stale cached "active" record stops
        # counting as active once its own expiry has passed, so an offline
        # machine can't use a long-expired cache forever.
        if self.expires_at:
            try:
                if datetime.fromisoformat(self.expires_at) < datetime.now(timezone.utc):
                    return False
            except ValueError:
                pass
        return True

    def has_feature(self, feature: str) -> bool:
        return self.is_active and self.plan in FEATURE_PLANS.get(feature, set())


class LicenseProvider(Protocol):
    def get_status(self) -> LicenseStatus: ...
    def activate(self, email: str, license_key: str) -> LicenseStatus: ...


def _row_to_status(row) -> LicenseStatus:
    if row is None:
        return LicenseStatus(plan=Plan.FREE, status="INACTIVE", email=None, expires_at=None)
    return LicenseStatus(
        plan=row["plan"], status=row["status"], email=row["email"],
        expires_at=row["expires_at"], license_key=row["license_key"],
    )


class MockLicenseProvider:
    """Local-only stand-in used by tests and as an offline fallback: any
    non-empty key "activates" a 30-day PRO trial. No network call is made.
    """

    def __init__(self, db: Database) -> None:
        self._db = db

    def get_status(self) -> LicenseStatus:
        return _row_to_status(self._db.get_license())

    def activate(self, email: str, license_key: str) -> LicenseStatus:
        if not license_key.strip():
            return LicenseStatus(plan=Plan.FREE, status="INACTIVE", email=email, expires_at=None)
        expires = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(timespec="seconds")
        self._db.save_license(plan=Plan.PRO, status="TRIAL", email=email, expires_at=expires, license_key=license_key)
        return self.get_status()


class RemoteLicenseProvider:
    """Calls the real ipscans.com license API. `activate` only needs an
    email in Phase 1 (the server mints and returns the trial key); paid
    key entry will be added alongside Stripe checkout in Phase 2.2.
    """

    def __init__(self, db: Database) -> None:
        self._db = db

    def get_status(self) -> LicenseStatus:
        cached = self._db.get_license()
        if cached is None or not cached["email"] or not cached["license_key"]:
            return _row_to_status(cached)
        try:
            data = post_json(
                "/license/validate",
                {"email": cached["email"], "key": cached["license_key"]},
            )
        except RemoteAPIError:
            return _row_to_status(cached)  # offline grace (spec item 32)

        if not data.get("valid"):
            return _row_to_status(cached)

        license_data = data["license"]
        self._db.save_license(
            plan=license_data["plan"], status=license_data["status"],
            email=license_data["email"], expires_at=license_data["expiresAt"],
            license_key=license_data["key"],
        )
        return self.get_status_from_cache_only()

    def get_status_from_cache_only(self) -> LicenseStatus:
        return _row_to_status(self._db.get_license())

    def activate(self, email: str, license_key: str) -> LicenseStatus:
        try:
            data = post_json("/license/activate", {"email": email})
        except RemoteAPIError:
            return _row_to_status(self._db.get_license())

        if "license" not in data:
            return _row_to_status(self._db.get_license())

        license_data = data["license"]
        self._db.save_license(
            plan=license_data["plan"], status=license_data["status"],
            email=license_data["email"], expires_at=license_data["expiresAt"],
            license_key=license_data["key"],
        )
        return self.get_status_from_cache_only()
