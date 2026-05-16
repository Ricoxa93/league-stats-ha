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


IMAGE_DESCRIPTIONS = [
    {
        "key": "top_champion_icon_image",
        "name": "Top Champion Icon",
        "url_key": "icon",
        "content_type": "image/png",
    },
    {
        "key": "top_champion_splash_image",
        "name": "Top Champion Splash",
        "url_key": "splash",
        "content_type": "image/jpeg",
    },
    {
        "key": "top_champion_loading_image",
        "name": "Top Champion Loading",
        "url_key": "loading",
        "content_type": "image/jpeg",
    },
]


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
        LeagueChampionImage(coordinator, description)
        for description in IMAGE_DESCRIPTIONS
    ])


class LeagueChampionImage(CoordinatorEntity, ImageEntity):
    _attr_has_entity_name = False

    def __init__(self, coordinator, description):
        CoordinatorEntity.__init__(self, coordinator)
        ImageEntity.__init__(self, coordinator.hass)

        self.description = description

        account_slug = coordinator.data.get("account_slug", "league_account")

        self._attr_name = description["name"]
        self._attr_unique_id = (
            f"league_stats_{account_slug}_{description['key']}"
        )
        self._attr_content_type = description["content_type"]

    @property
    def available(self):
        return (
            self.coordinator.last_update_success
            and self.coordinator.data is not None
            and self.coordinator.data.get("top_champion", {}).get(
                self.description["url_key"]
            ) is not None
        )

    @property
    def image_url(self):
        return self.coordinator.data["top_champion"][self.description["url_key"]]

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
