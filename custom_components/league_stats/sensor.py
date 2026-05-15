from datetime import timedelta
import logging

from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, CoordinatorEntity

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
        _LOGGER.error("League Stats konnte nicht aktualisiert werden: %s", err)

    async_add_entities([
        LeagueTotalRankSensor(coordinator),
        LeagueTotalWinsSensor(coordinator),
        LeagueTotalLossesSensor(coordinator),
        LeagueTotalGamesSensor(coordinator),
        LeagueTotalWinrateSensor(coordinator),

        LeagueSoloRankSensor(coordinator),
        LeagueSoloLpSensor(coordinator),
        LeagueSoloWinsSensor(coordinator),
        LeagueSoloLossesSensor(coordinator),
        LeagueSoloGamesSensor(coordinator),
        LeagueSoloWinrateSensor(coordinator),

        LeagueFlexRankSensor(coordinator),
        LeagueFlexLpSensor(coordinator),
        LeagueFlexWinsSensor(coordinator),
        LeagueFlexLossesSensor(coordinator),
        LeagueFlexGamesSensor(coordinator),
        LeagueFlexWinrateSensor(coordinator),
    ])


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
            "winrate": 0,
        }

    wins = queue.get("wins", 0)
    losses = queue.get("losses", 0)
    games = wins + losses
    winrate = round((wins / games) * 100, 1) if games > 0 else 0

    return {
        "rank": f"{queue.get('tier')} {queue.get('rank')}",
        "tier": queue.get("tier"),
        "division": queue.get("rank"),
        "lp": queue.get("leaguePoints", 0),
        "wins": wins,
        "losses": losses,
        "games": games,
        "winrate": winrate,
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
            _LOGGER.error("Riot Account API Fehler %s: %s", resp.status, text)
            resp.raise_for_status()

        account = await resp.json()

    puuid = account["puuid"]

    league_url = (
        f"https://{platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/"
        f"{puuid}"
    )

    async with session.get(league_url, params=params) as resp:
        if resp.status != 200:
            text = await resp.text()
            _LOGGER.error("Riot League API Fehler %s: %s", resp.status, text)
            resp.raise_for_status()

        leagues = await resp.json()

    solo = parse_queue(leagues, "RANKED_SOLO_5x5")
    flex = parse_queue(leagues, "RANKED_FLEX_SR")

    total_wins = solo["wins"] + flex["wins"]
    total_losses = solo["losses"] + flex["losses"]
    total_games = total_wins + total_losses
    total_winrate = round((total_wins / total_games) * 100, 1) if total_games > 0 else 0

    return {
        "solo": solo,
        "flex": flex,
        "total": {
            "rank": solo["rank"],
            "wins": total_wins,
            "losses": total_losses,
            "games": total_games,
            "winrate": total_winrate,
        }
    }


class LeagueBaseSensor(CoordinatorEntity, SensorEntity):
    def __init__(self, coordinator):
        super().__init__(coordinator)

    @property
    def available(self):
        return self.coordinator.last_update_success and self.coordinator.data is not None


class LeagueTotalRankSensor(LeagueBaseSensor):
    _attr_name = "League of Legends Rang"
    _attr_unique_id = "league_of_legends_rank_total"

    @property
    def native_value(self):
        return self.coordinator.data["total"]["rank"]

    @property
    def extra_state_attributes(self):
        return {
            "wins_gesamt": self.coordinator.data["total"]["wins"],
            "losses_gesamt": self.coordinator.data["total"]["losses"],
            "spiele_gesamt": self.coordinator.data["total"]["games"],
            "winrate_gesamt": self.coordinator.data["total"]["winrate"],
            "solo_rank": self.coordinator.data["solo"]["rank"],
            "solo_lp": self.coordinator.data["solo"]["lp"],
            "flex_rank": self.coordinator.data["flex"]["rank"],
            "flex_lp": self.coordinator.data["flex"]["lp"],
        }


class LeagueTotalWinsSensor(LeagueBaseSensor):
    _attr_name = "League of Legends Wins Gesamt"
    _attr_unique_id = "league_of_legends_wins_total"

    @property
    def native_value(self):
        return self.coordinator.data["total"]["wins"]


class LeagueTotalLossesSensor(LeagueBaseSensor):
    _attr_name = "League of Legends Losses Gesamt"
    _attr_unique_id = "league_of_legends_losses_total"

    @property
    def native_value(self):
        return self.coordinator.data["total"]["losses"]


class LeagueTotalGamesSensor(LeagueBaseSensor):
    _attr_name = "League of Legends Spiele Gesamt"
    _attr_unique_id = "league_of_legends_games_total"

    @property
    def native_value(self):
        return self.coordinator.data["total"]["games"]


class LeagueTotalWinrateSensor(LeagueBaseSensor):
    _attr_name = "League of Legends Winrate Gesamt"
    _attr_unique_id = "league_of_legends_winrate_total"
    _attr_native_unit_of_measurement = "%"

    @property
    def native_value(self):
        return self.coordinator.data["total"]["winrate"]


class LeagueSoloRankSensor(LeagueBaseSensor):
    _attr_name = "League of Legends SoloQ Rang"
    _attr_unique_id = "league_of_legends_solo_rank"

    @property
    def native_value(self):
        return self.coordinator.data["solo"]["rank"]

    @property
    def extra_state_attributes(self):
        return self.coordinator.data["solo"]


class LeagueSoloLpSensor(LeagueBaseSensor):
    _attr_name = "League of Legends SoloQ LP"
    _attr_unique_id = "league_of_legends_solo_lp"

    @property
    def native_value(self):
        return self.coordinator.data["solo"]["lp"]


class LeagueSoloWinsSensor(LeagueBaseSensor):
    _attr_name = "League of Legends SoloQ Wins"
    _attr_unique_id = "league_of_legends_solo_wins"

    @property
    def native_value(self):
        return self.coordinator.data["solo"]["wins"]


class LeagueSoloLossesSensor(LeagueBaseSensor):
    _attr_name = "League of Legends SoloQ Losses"
    _attr_unique_id = "league_of_legends_solo_losses"

    @property
    def native_value(self):
        return self.coordinator.data["solo"]["losses"]


class LeagueSoloGamesSensor(LeagueBaseSensor):
    _attr_name = "League of Legends SoloQ Spiele"
    _attr_unique_id = "league_of_legends_solo_games"

    @property
    def native_value(self):
        return self.coordinator.data["solo"]["games"]


class LeagueSoloWinrateSensor(LeagueBaseSensor):
    _attr_name = "League of Legends SoloQ Winrate"
    _attr_unique_id = "league_of_legends_solo_winrate"
    _attr_native_unit_of_measurement = "%"

    @property
    def native_value(self):
        return self.coordinator.data["solo"]["winrate"]


class LeagueFlexRankSensor(LeagueBaseSensor):
    _attr_name = "League of Legends Flex Rang"
    _attr_unique_id = "league_of_legends_flex_rank"

    @property
    def native_value(self):
        return self.coordinator.data["flex"]["rank"]

    @property
    def extra_state_attributes(self):
        return self.coordinator.data["flex"]


class LeagueFlexLpSensor(LeagueBaseSensor):
    _attr_name = "League of Legends Flex LP"
    _attr_unique_id = "league_of_legends_flex_lp"

    @property
    def native_value(self):
        return self.coordinator.data["flex"]["lp"]


class LeagueFlexWinsSensor(LeagueBaseSensor):
    _attr_name = "League of Legends Flex Wins"
    _attr_unique_id = "league_of_legends_flex_wins"

    @property
    def native_value(self):
        return self.coordinator.data["flex"]["wins"]


class LeagueFlexLossesSensor(LeagueBaseSensor):
    _attr_name = "League of Legends Flex Losses"
    _attr_unique_id = "league_of_legends_flex_losses"

    @property
    def native_value(self):
        return self.coordinator.data["flex"]["losses"]


class LeagueFlexGamesSensor(LeagueBaseSensor):
    _attr_name = "League of Legends Flex Spiele"
    _attr_unique_id = "league_of_legends_flex_games"

    @property
    def native_value(self):
        return self.coordinator.data["flex"]["games"]


class LeagueFlexWinrateSensor(LeagueBaseSensor):
    _attr_name = "League of Legends Flex Winrate"
    _attr_unique_id = "league_of_legends_flex_winrate"
    _attr_native_unit_of_measurement = "%"

    @property
    def native_value(self):
        return self.coordinator.data["flex"]["winrate"]
