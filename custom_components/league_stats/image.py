import logging

from homeassistant.components.image import ImageEntity
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import (
    CoordinatorEntity,
    DataUpdateCoordinator,
)

from .sensor import fetch_lol_data, SCAN_INTERVAL
from .const import (
    CONF_API_KEY,
    CONF_GAME_NAME,
    CONF_TAG_LINE,
    CONF_PLATFORM,
    CONF_REGION,
)

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(hass, entry, async_add_entities):
    config = entry.data
    session = async_get_clientsession(hass)

    coordinator = DataUpdateCoordinator(
        hass,
        _LOGGER,
        name="league_stats_image",
        update_method=lambda: fetch_lol_data(
            session=session,
            api_key=config[CONF_API_KEY],
            game_name=config[CONF_GAME_NAME],
            tag_line=config[CONF_TAG_LINE],
            platform=config[CONF_PLATFORM],
            region=config[CONF_REGION],
        ),
        update_interval=SCAN_INTERVAL,
    )

    await coordinator.async_config_entry_first_refresh()

    async_add_entities([
        LeagueTopChampionImage(coordinator),
    ])


class LeagueTopChampionImage(CoordinatorEntity, ImageEntity):
    _attr_has_entity_name = False
    _attr_content_type = "image/png"

    def __init__(self, coordinator):
        CoordinatorEntity.__init__(self, coordinator)
        ImageEntity.__init__(self, coordinator.hass)

        account_slug = coordinator.data.get("account_slug", "league_account")

        self._attr_name = "Top Champion Image"
        self._attr_unique_id = (
            f"league_stats_{account_slug}_top_champion_image"
        )

    @property
    def available(self):
        return (
            self.coordinator.last_update_success
            and self.coordinator.data is not None
            and self.coordinator.data.get("top_champion", {}).get("icon") is not None
        )

    @property
    def image_url(self):
        return self.coordinator.data["top_champion"]["icon"]

    @property
    def device_info(self):
        account = self.coordinator.data.get("account", "League Account")
        account_slug = self.coordinator.data.get(
            "account_slug",
            "league_account",
        )

        return {
            "identifiers": {("league_stats", account_slug)},
            "name": f"League Stats - {account}",
            "manufacturer": "Ricoxa93",
            "model": "League of Legends Ranked Stats",
        }
