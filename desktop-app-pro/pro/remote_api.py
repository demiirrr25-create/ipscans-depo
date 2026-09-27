"""Thin HTTP client for the ipscans.com Next.js license/site API — stdlib
only (urllib), so no extra dependency is needed just to make a few small
JSON requests.
"""
from __future__ import annotations

import json
import urllib.error
import urllib.request

BASE_URL = "https://ipscans.com/api"
TIMEOUT_SEC = 6


class RemoteAPIError(Exception):
    """Raised for any network failure or non-2xx response — callers should
    catch this and fall back to the local cache (spec item 32).
    """


def post_json(path: str, payload: dict) -> dict:
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=body,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SEC) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        try:
            return json.loads(exc.read().decode("utf-8"))
        except Exception:
            raise RemoteAPIError(f"HTTP {exc.code}") from exc
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise RemoteAPIError(str(exc)) from exc


def get_json(path: str) -> dict:
    request = urllib.request.Request(f"{BASE_URL}{path}", method="GET")
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SEC) as response:
            return json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise RemoteAPIError(str(exc)) from exc
