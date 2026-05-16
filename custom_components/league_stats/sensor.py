from datetime import timedelta
import logging
import re

from homeassistant.components.sensor import SensorEntity
from homeassistant.const import PERCENTAGE
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import (
    DataUpdateCoordinator,
    CoordinatorEntity,
)

from .const import (
    CONF_API_KEY,
    CONF_GAME_NAME,
    CONF_TAG_LINE,
    CONF_PLATFORM,
    CONF_REGION,
)

_LOGGER = logging.getLogger(__name__)

SCAN_INTERVAL = timedelta(minutes=30)


SENSOR_DESCRIPTIONS = [
    {
        "key": "update_status",
        "name": "Update Status",
        "icon": "mdi:update",
        "path": ("status",),
    },

    {
        "key": "ranked_wins",
        "name": "Ranked Wins",
        "icon": "mdi:sword-cross",
        "path": ("total", "wins"),
    },
    {
        "key": "ranked_losses",
        "name": "Ranked Losses",
        "icon": "mdi:skull",
        "path": ("total", "losses"),
    },
    {
        "key": "ranked_games",
        "name": "Ranked Games",
        "icon": "mdi:controller-classic",
        "path": ("total", "games"),
    },
    {
        "key": "ranked_win_rate",
        "name": "Ranked Win Rate",
        "icon": "mdi:percent",
        "unit": PERCENTAGE,
        "path": ("total", "win_rate"),
    },

    {
        "key": "soloq_rank",
        "name": "SoloQ Rank",
        "icon": "mdi:trophy-outline",
        "path": ("solo", "rank"),
    },
    {
        "key": "soloq_lp",
        "name": "SoloQ LP",
        "icon": "mdi:star-circle",
        "path": ("solo", "lp"),
    },
    {
        "key": "soloq_wins",
        "name": "SoloQ Wins",
        "icon": "mdi:sword-cross",
        "path": ("solo", "wins"),
    },
    {
        "key": "soloq_losses",
        "name": "SoloQ Losses",
        "icon": "mdi:skull-outline",
        "path": ("solo", "losses"),
    },
    {
        "key": "soloq_games",
        "name": "SoloQ Games",
        "icon": "mdi:controller-classic-outline",
        "path": ("solo", "games"),
    },
    {
        "key": "soloq_win_rate",
        "name": "SoloQ Win Rate",
        "icon": "mdi:percent-outline",
        "unit": PERCENTAGE,
        "path": ("solo", "win_rate"),
    },

    {
        "key": "flex_rank",
        "name": "Flex Rank",
        "icon": "mdi:account-group",
        "path": ("flex", "rank"),
    },
    {
        "key": "flex_lp",
        "name": "Flex LP",
        "icon": "mdi:star-circle-outline",
        "path": ("flex", "lp"),
    },
    {
        "key": "flex_wins",
        "name": "Flex Wins",
        "icon": "mdi:account-multiple-check",
        "path": ("flex", "wins"),
    },
    {
        "key": "flex_losses",
        "name": "Flex Losses",
        "icon": "mdi:account-multiple-remove",
        "path": ("flex", "losses"),
    },
    {
        "key": "flex_games",
        "name": "Flex Games",
        "icon": "mdi:controller-classic",
        "path": ("flex", "games"),
    },
    {
        "key": "flex_win_rate",
        "name": "Flex Win Rate",
        "icon": "mdi:percent",
        "unit": PERCENTAGE,
        "path": ("flex", "win_rate"),
    },
]


async def async_setup_entry(hass, entry, async_add_entities):
    config = entry.data
    session = async_get_clientsession(hass)

    coordinator = DataUpdateCoordinator(
        hass,
        _LOGGER,
        name="league_stats",
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

    entities = [
        LeagueStatsSensor(coordinator, description)
        for description in SENSOR_DESCRIPTIONS
    ]

    async_add_entities(entities)


def safe_slug(value):
    value = str(value).lower()
    value = value.replace("#", "_")
    value = re.sub(r"[^a-z0-9_]+", "_", value)
    value = re.sub(r"_+", "_", value)
    return value.strip("_")


def parse_queue(leagues, queue_type):
    queue = next(
        (entry for entry in leagues if entry.get("queueType") == queue_type),
        None,
    )

    if not queue:
        return {
            "rank": "Unranked",
            "lp": 0,
            "wins": 0,
            "losses": 0,
            "games": 0,
            "win_rate": 0,
        }

    wins = queue.get("wins", 0)
    losses = queue.get("losses", 0)
    games = wins + losses

    tier = queue.get("tier", "")
    rank = queue.get("rank", "")

    return {
        "rank": f"{tier} {rank}".strip(),
        "lp": queue.get("leaguePoints", 0),
        "wins": wins,
        "losses": losses,
        "games": games,
        "win_rate": round((wins / games) * 100, 1) if games > 0 else 0,
    }


async def fetch_lol_data(
    session,
    api_key,
    game_name,
    tag_line,
    platform,
    region,
):
    params = {"api_key": api_key}

    account_url = (
        f"https://{region}.api.riotgames.com"
        f"/riot/account/v1/accounts/by-riot-id/"
        f"{game_name}/{tag_line}"
    )

    async with session.get(account_url, params=params) as resp:
        resp.raise_for_status()
        account = await resp.json()

    puuid = account["puuid"]

    account_name = f"{account.get('gameName')}#{account.get('tagLine')}"
    account_slug = safe_slug(account_name)

    league_url = (
        f"https://{platform}.api.riotgames.com"
        f"/lol/league/v4/entries/by-puuid/{puuid}"
    )

    async with session.get(league_url, params=params) as resp:
        resp.raise_for_status()
        leagues = await resp.json()

    solo = parse_queue(leagues, "RANKED_SOLO_5x5")
    flex = parse_queue(leagues, "RANKED_FLEX_SR")

    total_wins = solo["wins"] + flex["wins"]
    total_losses = solo["losses"] + flex["losses"]
    total_games = total_wins + total_losses

    return {
        "account": account_name,
        "account_slug": account_slug,
        "status": "Up to date",

        "solo": solo,
        "flex": flex,

        "total": {
            "wins": total_wins,
            "losses": total_losses,
            "games": total_games,
            "win_rate": (
                round((total_wins / total_games) * 100, 1)
                if total_games > 0
                else 0
            ),
        },
    }


class LeagueStatsSensor(CoordinatorEntity, SensorEntity):
    _attr_has_entity_name = False

    def __init__(self, coordinator, description):
        super().__init__(coordinator)

        self.description = description

        account_slug = coordinator.data.get(
            "account_slug",
            "league_account",
        )

        self._attr_name = description["name"]
        self._attr_unique_id = (
            f"league_stats_{account_slug}_{description['key']}"
        )

        self._attr_icon = description.get("icon")
        self._attr_native_unit_of_measurement = description.get("unit")

    @property
    def available(self):
        return (
            self.coordinator.last_update_success
            and self.coordinator.data is not None
        )

    @property
    def native_value(self):
        if self.description["key"] == "update_status":
            return (
                "Up to date"
                if self.coordinator.last_update_success
                else "Error"
            )

        data = self.coordinator.data

        for part in self.description["path"]:
            data = data.get(part)

            if data is None:
                return None

        return data

    @property
    def device_info(self):
        account = self.coordinator.data.get(
            "account",
            "League Account",
        )

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
