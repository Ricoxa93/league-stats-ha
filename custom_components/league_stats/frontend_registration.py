"""Serve and register the League Stats Lovelace card."""

from __future__ import annotations

import inspect
import logging
from pathlib import Path
from urllib.parse import urlsplit

from homeassistant.components.http import StaticPathConfig

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

FRONTEND_URL = "/league_stats_frontend/league-stats-last-match-card.js"
FRONTEND_PATH = Path(__file__).parent / "frontend" / "league-stats-last-match-card.js"
_REGISTERED = "frontend_registered"
VERSION = "0.4.1"


def _resources(hass):
    data = hass.data.get("lovelace")
    if isinstance(data, dict):
        return data.get("resources")
    return getattr(data, "resources", None)


async def _items(resources):
    result = resources.async_items()
    return await result if inspect.isawaitable(result) else result


async def async_register_frontend(hass) -> None:
    """Register the static bundle and its storage-mode Lovelace resource once."""
    domain_data = hass.data.setdefault(DOMAIN, {})
    if domain_data.get(_REGISTERED):
        return

    await hass.http.async_register_static_paths([
        StaticPathConfig(FRONTEND_URL, str(FRONTEND_PATH), cache_headers=True),
    ])

    resources = _resources(hass)
    if resources is None or not all(hasattr(resources, method) for method in ("async_create_item", "async_update_item")):
        _LOGGER.warning(
            "Lovelace resources are not available (possibly YAML mode). Add %s manually as a module.",
            FRONTEND_URL,
        )
        domain_data[_REGISTERED] = True
        return

    if not getattr(resources, "loaded", True):
        await resources.async_load()

    resource_url = f"{FRONTEND_URL}?v={VERSION}"
    existing = next((item for item in await _items(resources)
                     if urlsplit(item.get("url", "")).path == FRONTEND_URL), None)
    payload = {"res_type": "module", "url": resource_url}
    if existing is None:
        await resources.async_create_item(payload)
    elif existing.get("url") != resource_url or existing.get("res_type") != "module":
        await resources.async_update_item(existing["id"], payload)

    domain_data[_REGISTERED] = True
