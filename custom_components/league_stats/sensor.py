from datetime import timedelta
import logging
import re

from homeassistant.components.sensor import SensorEntity
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

    try:
        await coordinator.async_config_entry_first_refresh()
    except Exception as err:
        _LOGGER.error("League Stats update failed: %s", err)

    async_add_entities([
        LeagueUpdateStatusSensor(coordinator),

        LeagueTotalWinsSensor(coordinator),
        LeagueTotalLossesSensor(coordinator),
        LeagueTotalGamesSensor(coordinator),
        LeagueTotalWinRateSensor(coordinator),

        LeagueSoloRankSensor(coordinator),
        LeagueSoloLpSensor(coordinator),
        LeagueSoloWinsSensor(coordinator),
        LeagueSoloLossesSensor(coordinator),
        LeagueSoloGamesSensor(coordinator),
        LeagueSoloWinRateSensor(coordinator),

        LeagueFlexRankSensor(coordinator),
        LeagueFlexLpSensor(coordinator),
        LeagueFlexWinsSensor(coordinator),
        LeagueFlexLossesSensor(coordinator),
        LeagueFlexGamesSensor(coordinator),
        LeagueFlexWinRateSensor(coordinator),
    ])


def safe_slug(value):
    value = value.lower()
    value = value.replace("#", "_")
    value = re.sub(r"[^a-z0-9_]+", "_", value)
    value = re.sub(r"_+", "_", value)
    return value.strip("_")


def parse_queue(leagues, queue_type):
    queue = next(
        (entry for entry in leagues if entry.get("queueType") == queue_type),
        None
    )

    if not queue:
        return {
            "rank": "Unranked",
            "tier": None,
            "division": None,
            "lp": 0,
            "wins": 0,
            "losses": 0,
            "games": 0,
            "win_rate": 0,
        }

    wins = queue.get("wins", 0)
    losses = queue.get("losses", 0)
    games = wins + losses
    win_rate = round((wins / games) * 100, 1) if games > 0 else 0

    return {
        "rank": f"{queue.get('tier')} {queue.get('rank')}",
        "tier": queue.get("tier"),
        "division": queue.get("rank"),
        "lp": queue.get("leaguePoints", 0),
        "wins": wins,
        "losses": losses,
        "games": games,
        "win_rate": win_rate,
    }


async def fetch_lol_data(session, api_key, game_name, tag_line, platform, region):
    params = {"api_key": api_key}

    account_url = (
        f"https://{region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/"
        f"{game_name}/{tag_line}"
    )

    async with session.get(account_url, params=params) as resp:
        if resp.status != 200:
            text = await resp.text()
            _LOGGER.error("Riot Account API error %s: %s", resp.status, text)
            resp.raise_for_status()

        account = await resp.json()

    puuid = account["puuid"]
    account_name = f"{account.get('gameName')}#{account.get('tagLine')}"

    league_url = (
        f"https://{platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/"
        f"{puuid}"
    )

    async with session.get(league_url, params=params) as resp:
        if resp.status != 200:
            text = await resp.text()
            _LOGGER.error("Riot League API error %s: %s", resp.status, text)
            resp.raise_for_status()

        leagues = await resp.json()

    solo = parse_queue(leagues, "RANKED_SOLO_5x5")
    flex = parse_queue(leagues, "RANKED_FLEX_SR")

    total_wins = solo["wins"] + flex["wins"]
    total_losses = solo["losses"] + flex["losses"]
    total_games = total_wins + total_losses
    total_win_rate = (
        round((total_wins / total_games) * 100, 1)
        if total_games > 0 else 0
    )

    return {
        "account": account_name,
        "account_slug": safe_slug(account_name),
        "solo": solo,
        "flex": flex,
        "total": {
            "wins": total_wins,
            "losses": total_losses,
            "games": total_games,
            "win_rate": total_win_rate,
        },
    }


class LeagueBaseSensor(CoordinatorEntity, SensorEntity):
    _attr_has_entity_name = True

    def __init__(self, coordinator, sensor_key):
        super().__init__(coordinator)

        if coordinator.data:
            account_slug = coordinator.data.get(
                "account_slug",
                "league_account"
            )
        else:
            account_slug = "league_account"

        self._attr_unique_id = f"{account_slug}_{sensor_key}"

    @property
    def available(self):
        return (
            self.coordinator.last_update_success
            and self.coordinator.data is not None
        )

    @property
    def device_info(self):
        account = (
            self.coordinator.data.get("account", "League Account")
            if self.coordinator.data
            else "League Account"
        )

        return {
            "identifiers": {("league_stats", account)},
            "name": account,
            "manufacturer": "Ricoxa93",
            "model": "League of Legends Ranked Stats",
        }


class LeagueUpdateStatusSensor(LeagueBaseSensor):
    _attr_name = "Update Status"
    _attr_icon = "mdi:update"

    def __init__(self, coordinator):
        super().__init__(coordinator, "update_status")

    @property
    def native_value(self):
        return (
            "Up to date"
            if self.coordinator.last_update_success
            else "Error"
        )


class LeagueTotalWinsSensor(LeagueBaseSensor):
    _attr_name = "Ranked Wins"
    _attr_icon = "mdi:sword-cross"

    def __init__(self, coordinator):
        super().__init__(coordinator, "ranked_wins")

    @property
    def native_value(self):
        return self.coordinator.data["total"]["wins"]


class LeagueTotalLossesSensor(LeagueBaseSensor):
    _attr_name = "Ranked Losses"
    _attr_icon = "mdi:skull"

    def __init__(self, coordinator):
        super().__init__(coordinator, "ranked_losses")

    @property
    def native_value(self):
        return self.coordinator.data["total"]["losses"]


class LeagueTotalGamesSensor(LeagueBaseSensor):
    _attr_name = "Ranked Games"
    _attr_icon = "mdi:controller-classic"

    def __init__(self, coordinator):
        super().__init__(coordinator, "ranked_games")

    @property
    def native_value(self):
        return self.coordinator.data["total"]["games"]


class LeagueTotalWinRateSensor(LeagueBaseSensor):
    _attr_name = "Ranked Win Rate"
    _attr_icon = "mdi:percent"
    _attr_native_unit_of_measurement = "%"

    def __init__(self, coordinator):
        super().__init__(coordinator, "ranked_win_rate")

    @property
    def native_value(self):
        return self.coordinator.data["total"]["win_rate"]


class LeagueSoloRankSensor(LeagueBaseSensor):
    _attr_name = "Solo Queue Rank"
    _attr_icon = "mdi:trophy-outline"

    def __init__(self, coordinator):
        super().__init__(coordinator, "solo_queue_rank")

    @property
    def native_value(self):
        return self.coordinator.data["solo"]["rank"]

    @property
    def extra_state_attributes(self):
        return self.coordinator.data["solo"]


class LeagueSoloLpSensor(LeagueBaseSensor):
    _attr_name = "Solo Queue LP"
    _attr_icon = "mdi:star-circle"

    def __init__(self, coordinator):
        super().__init__(coordinator, "solo_queue_lp")

    @property
    def native_value(self):
        return self.coordinator.data["solo"]["lp"]


class LeagueSoloWinsSensor(LeagueBaseSensor):
    _attr_name = "Solo Queue Wins"
    _attr_icon = "mdi:sword-cross"

    def __init__(self, coordinator):
        super().__init__(coordinator, "solo_queue_wins")

    @property
    def native_value(self):
        return self.coordinator.data["solo"]["wins"]


class LeagueSoloLossesSensor(LeagueBaseSensor):
    _attr_name = "Solo Queue Losses"
    _attr_icon = "mdi:skull-outline"

    def __init__(self, coordinator):
        super().__init__(coordinator, "solo_queue_losses")

    @property
    def native_value(self):
        return self.coordinator.data["solo"]["losses"]


class LeagueSoloGamesSensor(LeagueBaseSensor):
    _attr_name = "Solo Queue Games"
    _attr_icon = "mdi:controller-classic-outline"

    def __init__(self, coordinator):
        super().__init__(coordinator, "solo_queue_games")

    @property
    def native_value(self):
        return self.coordinator.data["solo"]["games"]


class LeagueSoloWinRateSensor(LeagueBaseSensor):
    _attr_name = "Solo Queue Win Rate"
    _attr_icon = "mdi:percent-outline"
    _attr_native_unit_of_measurement = "%"

    def __init__(self, coordinator):
        super().__init__(coordinator, "solo_queue_win_rate")

    @property
    def native_value(self):
        return self.coordinator.data["solo"]["win_rate"]


class LeagueFlexRankSensor(LeagueBaseSensor):
    _attr_name = "Flex Queue Rank"
    _attr_icon = "mdi:account-group"

    def __init__(self, coordinator):
        super().__init__(coordinator, "flex_queue_rank")

    @property
    def native_value(self):
        return self.coordinator.data["flex"]["rank"]

    @property
    def extra_state_attributes(self):
        return self.coordinator.data["flex"]


class LeagueFlexLpSensor(LeagueBaseSensor):
    _attr_name = "Flex Queue LP"
    _attr_icon = "mdi:star-circle-outline"

    def __init__(self, coordinator):
        super().__init__(coordinator, "flex_queue_lp")

    @property
    def native_value(self):
        return self.coordinator.data["flex"]["lp"]


class LeagueFlexWinsSensor(LeagueBaseSensor):
    _attr_name = "Flex Queue Wins"
    _attr_icon = "mdi:account-multiple-check"

    def __init__(self, coordinator):
        super().__init__(coordinator, "flex_queue_wins")

    @property
    def native_value(self):
        return self.coordinator.data["flex"]["wins"]


class LeagueFlexLossesSensor(LeagueBaseSensor):
    _attr_name = "Flex Queue Losses"
    _attr_icon = "mdi:account-multiple-remove"

    def __init__(self, coordinator):
        super().__init__(coordinator, "flex_queue_losses")

    @property
    def native_value(self):
        return self.coordinator.data["flex"]["losses"]


class LeagueFlexGamesSensor(LeagueBaseSensor):
    _attr_name = "Flex Queue Games"
    _attr_icon = "mdi:controller-classic"

    def __init__(self, coordinator):
        super().__init__(coordinator, "flex_queue_games")

    @property
    def native_value(self):
        return self.coordinator.data["flex"]["games"]


class LeagueFlexWinRateSensor(LeagueBaseSensor):
    _attr_name = "Flex Queue Win Rate"
    _attr_icon = "mdi:percent"
    _attr_native_unit_of_measurement = "%"

    def __init__(self, coordinator):
        super().__init__(coordinator, "flex_queue_win_rate")

    @property
    def native_value(self):
        return self.coordinator.data["flex"]["win_rate"]
