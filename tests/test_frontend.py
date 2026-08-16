from pathlib import Path
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from custom_components.league_stats.frontend_registration import (
    FRONTEND_URL,
    VERSION,
    async_register_frontend,
)


def test_frontend_version_matches_manifest():
    manifest_path = Path(__file__).parents[1] / "custom_components" / "league_stats" / "manifest.json"
    assert VERSION == json.loads(manifest_path.read_text(encoding="utf-8"))["version"]


class Resources:
    def __init__(self, items=None):
        self.loaded = False
        self._items = list(items or [])
        self.async_load = AsyncMock(side_effect=self._load)
        self.async_create_item = AsyncMock(side_effect=self._create)
        self.async_update_item = AsyncMock(side_effect=self._update)

    async def _load(self):
        self.loaded = True

    async def _create(self, item):
        self._items.append({"id": "created", **item})

    async def _update(self, item_id, item):
        self._items = [{**old, **item} if old.get("id") == item_id else old for old in self._items]

    def async_items(self):
        return list(self._items)


class YAMLResources:
    loaded = True

    def async_items(self):
        return [{"url": "/yaml-card.js", "res_type": "module"}]


def hass_with(resources):
    return SimpleNamespace(
        data={"lovelace": {"resources": resources}},
        http=SimpleNamespace(async_register_static_paths=AsyncMock()),
    )


@pytest.mark.asyncio
async def test_registers_static_path_and_lovelace_resource():
    resources = Resources()
    hass = hass_with(resources)
    await async_register_frontend(hass)
    hass.http.async_register_static_paths.assert_awaited_once()
    config = hass.http.async_register_static_paths.await_args.args[0][0]
    assert config.url_path == FRONTEND_URL
    assert Path(config.path).name == "league-stats-last-match-card.js"
    resources.async_load.assert_awaited_once()
    resources.async_create_item.assert_awaited_once_with({
        "res_type": "module",
        "url": f"{FRONTEND_URL}?v=0.4.5",
    })


@pytest.mark.asyncio
async def test_registration_is_idempotent():
    resources = Resources()
    hass = hass_with(resources)
    await async_register_frontend(hass)
    await async_register_frontend(hass)
    hass.http.async_register_static_paths.assert_awaited_once()
    resources.async_create_item.assert_awaited_once()


@pytest.mark.asyncio
async def test_updates_existing_resource_version():
    resources = Resources([{
        "id": "league-card",
        "res_type": "module",
        "url": f"{FRONTEND_URL}?v=0.3.0",
    }])
    hass = hass_with(resources)
    await async_register_frontend(hass)
    resources.async_create_item.assert_not_awaited()
    resources.async_update_item.assert_awaited_once_with("league-card", {
        "res_type": "module",
        "url": f"{FRONTEND_URL}?v=0.4.5",
    })


@pytest.mark.asyncio
async def test_yaml_resources_use_documented_manual_fallback():
    hass = hass_with(YAMLResources())
    await async_register_frontend(hass)
    hass.http.async_register_static_paths.assert_awaited_once()
    assert hass.data["league_stats"]["frontend_registered"] is True
