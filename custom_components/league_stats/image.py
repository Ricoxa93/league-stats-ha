import logging

from homeassistant.components.image import ImageEntity
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import CoordinatorEntity, DataUpdateCoordinator

from .sensor import fetch_lol_data, fetch_live_data, SCAN_INTERVAL, LIVE_SCAN_INTERVAL
from .const import CONF_API_KEY, CONF_GAME_NAME, CONF_TAG_LINE, CONF_PLATFORM, CONF_REGION

_LOGGER = logging.getLogger(__name__)


TOP_IMAGES = [
    {"key": "top_champion_icon_image", "name": "Top Champion Icon", "path": ("top_champion", "icon"), "content_type": "image/png"},
    {"key": "top_champion_splash_image", "name": "Top Champion Splash", "path": ("top_champion", "splash"), "content_type": "image/jpeg"},
    {"key": "top_champion_loading_image", "name": "Top Champion Loading", "path": ("top_champion", "loading"), "content_type": "image/jpeg"},
]


LIVE_IMAGES = [
    {"key": "live_champion_icon_image", "name": "Live Champion Icon", "path": ("live", "current_champion", "icon"), "content_type": "image/png"},
    {"key": "live_champion_splash_image", "name": "Live Champion Splash", "path": ("live", "current_champion", "splash"), "content_type": "image/jpeg"},
    {"key": "live_champion_loading_image", "name": "Live Champion Loading", "path": ("live", "current_champion", "loading"), "content_type": "image/jpeg"},
]


async def async_setup_entry(hass, entry, async_add_entities):
    config = entry.data
    session = async_get_clientsession(hass)

    top_coordinator = DataUpdateCoordinator(
        hass,
        _LOGGER,
        name="league_stats_image",
        update_method=lambda: fetch_lol_data(session, config[CONF_API_KEY], config[CONF_GAME_NAME], config[CONF_TAG_LINE], config[CONF_PLATFORM], config[CONF_REGION]),
        update_interval=SCAN_INTERVAL,
    )

    live_coordinator = DataUpdateCoordinator(
        hass,
        _LOGGER,
        name="league_stats_live_image",
        update_method=lambda: fetch_live_data(session, config[CONF_API_KEY], config[CONF_GAME_NAME], config[CONF_TAG_LINE], config[CONF_PLATFORM], config[CONF_REGION]),
        update_interval=LIVE_SCAN_INTERVAL,
    )

    await top_coordinator.async_config_entry_first_refresh()
    await live_coordinator.async_config_entry_first_refresh()

    async_add_entities(
        [LeagueImage(top_coordinator, d) for d in TOP_IMAGES]
        + [LeagueImage(live_coordinator, d) for d in LIVE_IMAGES]
    )


class LeagueImage(CoordinatorEntity, ImageEntity):
    _attr_has_entity_name = False

    def __init__(self, coordinator, description):
        CoordinatorEntity.__init__(self, coordinator)
        ImageEntity.__init__(self, coordinator.hass)

        self.description = description

        account_slug = coordinator.data.get("account_slug", "league_account")

        self._attr_name = description["name"]
        self._attr_unique_id = f"league_stats_{account_slug}_{description['key']}"
        self._attr_content_type = description["content_type"]

    def _url_from_path(self):
        data = self.coordinator.data

        for part in self.description["path"]:
            if data is None:
                return None
            data = data.get(part)

        return data

    @property
    def available(self):
        return (
            self.coordinator.last_update_success
            and self.coordinator.data is not None
            and self._url_from_path() is not None
        )

    @property
    def image_url(self):
        return self._url_from_path()

    @property
    def device_info(self):
        account = self.coordinator.data.get("account", "League Account")
        account_slug = self.coordinator.data.get("account_slug", "league_account")

        return {
            "identifiers": {("league_stats", account_slug)},
            "name": f"League Stats - {account}",
            "manufacturer": "Ricoxa93",
            "model": "League of Legends Ranked Stats",
        }
