from datetime import timedelta
import logging
import re

from homeassistant.components.sensor import SensorEntity
from homeassistant.const import PERCENTAGE
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, CoordinatorEntity

from .const import CONF_API_KEY, CONF_GAME_NAME, CONF_TAG_LINE, CONF_PLATFORM, CONF_REGION

_LOGGER = logging.getLogger(__name__)

SCAN_INTERVAL = timedelta(minutes=30)
LIVE_SCAN_INTERVAL = timedelta(seconds=60)

CHAMPION_CACHE = {}
LATEST_DDRAGON_VERSION = None


QUEUE_NAMES = {
    400: "Normal Draft",
    420: "Ranked Solo",
    430: "Normal Blind",
    440: "Ranked Flex",
    450: "ARAM",
    490: "Quickplay",

    700: "Clash",
    720: "ARAM Clash",

    830: "Co-op vs AI Intro",
    840: "Co-op vs AI Beginner",
    850: "Co-op vs AI Intermediate",

    900: "URF",
    1020: "One for All",
    1300: "Nexus Blitz",
    1400: "Ultimate Spellbook",

    1700: "Arena",
    1710: "Arena",
}


OPGG_REGIONS = {
    "euw1": "euw",
    "eun1": "eune",
    "na1": "na",
    "kr": "kr",
    "br1": "br",
    "jp1": "jp",
    "la1": "lan",
    "la2": "las",
    "oc1": "oce",
    "tr1": "tr",
    "ru": "ru",
}


RANKED_SENSORS = [
    {"key": "update_status", "name": "Update Status", "icon": "mdi:update", "path": ("status",)},
    {"key": "ranked_wins", "name": "Ranked Wins", "icon": "mdi:sword-cross", "path": ("total", "wins")},
    {"key": "ranked_losses", "name": "Ranked Losses", "icon": "mdi:skull", "path": ("total", "losses")},
    {"key": "ranked_games", "name": "Ranked Games", "icon": "mdi:controller-classic", "path": ("total", "games")},
    {"key": "ranked_win_rate", "name": "Ranked Win Rate", "icon": "mdi:percent", "unit": PERCENTAGE, "path": ("total", "win_rate")},

    {"key": "soloq_rank", "name": "SoloQ Rank", "icon": "mdi:trophy-outline", "path": ("solo", "rank")},
    {"key": "soloq_lp", "name": "SoloQ LP", "icon": "mdi:star-circle", "path": ("solo", "lp")},
    {"key": "soloq_wins", "name": "SoloQ Wins", "icon": "mdi:sword-cross", "path": ("solo", "wins")},
    {"key": "soloq_losses", "name": "SoloQ Losses", "icon": "mdi:skull-outline", "path": ("solo", "losses")},
    {"key": "soloq_games", "name": "SoloQ Games", "icon": "mdi:controller-classic-outline", "path": ("solo", "games")},
    {"key": "soloq_win_rate", "name": "SoloQ Win Rate", "icon": "mdi:percent-outline", "unit": PERCENTAGE, "path": ("solo", "win_rate")},

    {"key": "flex_rank", "name": "Flex Rank", "icon": "mdi:account-group", "path": ("flex", "rank")},
    {"key": "flex_lp", "name": "Flex LP", "icon": "mdi:star-circle-outline", "path": ("flex", "lp")},
    {"key": "flex_wins", "name": "Flex Wins", "icon": "mdi:account-multiple-check", "path": ("flex", "wins")},
    {"key": "flex_losses", "name": "Flex Losses", "icon": "mdi:account-multiple-remove", "path": ("flex", "losses")},
    {"key": "flex_games", "name": "Flex Games", "icon": "mdi:controller-classic", "path": ("flex", "games")},
    {"key": "flex_win_rate", "name": "Flex Win Rate", "icon": "mdi:percent", "unit": PERCENTAGE, "path": ("flex", "win_rate")},

    {"key": "top_champion", "name": "Top Champion", "icon": "mdi:account-star", "path": ("top_champion", "name")},
    {"key": "top_champion_level", "name": "Top Champion Level", "icon": "mdi:chevron-up-circle", "path": ("top_champion", "level")},
    {"key": "top_champion_points", "name": "Top Champion Points", "icon": "mdi:star-four-points", "path": ("top_champion", "points")},
    {"key": "top_champion_icon", "name": "Top Champion Icon", "icon": "mdi:image", "path": ("top_champion", "icon")},
    {"key": "top_champion_splash", "name": "Top Champion Splash", "icon": "mdi:image-area", "path": ("top_champion", "splash")},
    {"key": "top_champion_loading", "name": "Top Champion Loading", "icon": "mdi:image-frame", "path": ("top_champion", "loading")},
]


LIVE_SENSORS = [
    {"key": "live_match", "name": "Live Match", "icon": "mdi:sword", "path": ("live", "status")},
    {"key": "live_queue", "name": "Live Queue", "icon": "mdi:format-list-bulleted", "path": ("live", "queue")},
    {"key": "live_timer", "name": "Live Timer", "icon": "mdi:timer-outline", "path": ("live", "timer")},
    {"key": "live_champion", "name": "Live Champion", "icon": "mdi:account-star-outline", "path": ("live", "current_champion", "name")},
    {"key": "live_champion_icon", "name": "Live Champion Icon", "icon": "mdi:image", "path": ("live", "current_champion", "icon")},
    {"key": "live_champion_splash", "name": "Live Champion Splash", "icon": "mdi:image-area", "path": ("live", "current_champion", "splash")},
    {"key": "live_champion_loading", "name": "Live Champion Loading", "icon": "mdi:image-frame", "path": ("live", "current_champion", "loading")},
]


async def async_setup_entry(hass, entry, async_add_entities):
    config = entry.data
    session = async_get_clientsession(hass)

    ranked_coordinator = DataUpdateCoordinator(
        hass,
        _LOGGER,
        name="league_stats",
        update_method=lambda: fetch_lol_data(session, config[CONF_API_KEY], config[CONF_GAME_NAME], config[CONF_TAG_LINE], config[CONF_PLATFORM], config[CONF_REGION]),
        update_interval=SCAN_INTERVAL,
    )

    live_coordinator = DataUpdateCoordinator(
        hass,
        _LOGGER,
        name="league_stats_live",
        update_method=lambda: fetch_live_data(session, config[CONF_API_KEY], config[CONF_GAME_NAME], config[CONF_TAG_LINE], config[CONF_PLATFORM], config[CONF_REGION]),
        update_interval=LIVE_SCAN_INTERVAL,
    )

    await ranked_coordinator.async_config_entry_first_refresh()
    await live_coordinator.async_config_entry_first_refresh()

    async_add_entities(
        [LeagueStatsSensor(ranked_coordinator, d) for d in RANKED_SENSORS]
        + [LeagueLiveSensor(live_coordinator, d) for d in LIVE_SENSORS]
    )


def safe_slug(value):
    value = str(value).lower().replace("#", "_")
    value = re.sub(r"[^a-z0-9_]+", "_", value)
    value = re.sub(r"_+", "_", value)
    return value.strip("_")


def format_seconds(seconds):
    seconds = int(seconds or 0)

    prefix = ""
    if seconds < 0:
        prefix = "Starting in "
        seconds = abs(seconds)

    minutes = seconds // 60
    rest_seconds = seconds % 60

    return f"{prefix}{minutes}:{rest_seconds:02d}"


def make_opgg_url(platform, game_name, tag_line):
    region = OPGG_REGIONS.get(platform.lower())
    if not region or not game_name or not tag_line:
        return None
    return f"https://www.op.gg/summoners/{region}/{game_name}-{tag_line}"


def parse_queue(leagues, queue_type):
    queue = next((entry for entry in leagues if entry.get("queueType") == queue_type), None)

    if not queue:
        return {"rank": "Unranked", "lp": 0, "wins": 0, "losses": 0, "games": 0, "win_rate": 0}

    wins = queue.get("wins", 0)
    losses = queue.get("losses", 0)
    games = wins + losses

    return {
        "rank": f"{queue.get('tier', '')} {queue.get('rank', '')}".strip(),
        "lp": queue.get("leaguePoints", 0),
        "wins": wins,
        "losses": losses,
        "games": games,
        "win_rate": round((wins / games) * 100, 1) if games > 0 else 0,
    }


async def get_latest_ddragon_version(session):
    global LATEST_DDRAGON_VERSION

    if LATEST_DDRAGON_VERSION:
        return LATEST_DDRAGON_VERSION

    async with session.get("https://ddragon.leagueoflegends.com/api/versions.json") as resp:
        resp.raise_for_status()
        versions = await resp.json()

    LATEST_DDRAGON_VERSION = versions[0]
    return LATEST_DDRAGON_VERSION


async def get_champion_data(session, champion_id):
    if champion_id is None:
        return {"name": "Unknown", "ddragon_id": None, "icon": None, "splash": None, "loading": None}

    if champion_id in CHAMPION_CACHE:
        return CHAMPION_CACHE[champion_id]

    latest_version = await get_latest_ddragon_version(session)

    champions_url = f"https://ddragon.leagueoflegends.com/cdn/{latest_version}/data/en_US/champion.json"

    async with session.get(champions_url) as resp:
        resp.raise_for_status()
        champions = await resp.json()

    for champion in champions["data"].values():
        champ_key = int(champion["key"])
        champ_id = champion["id"]

        CHAMPION_CACHE[champ_key] = {
            "name": champion["name"],
            "ddragon_id": champ_id,
            "icon": f"https://ddragon.leagueoflegends.com/cdn/{latest_version}/img/champion/{champ_id}.png",
            "splash": f"https://ddragon.leagueoflegends.com/cdn/img/champion/splash/{champ_id}_0.jpg",
            "loading": f"https://ddragon.leagueoflegends.com/cdn/img/champion/loading/{champ_id}_0.jpg",
        }

    return CHAMPION_CACHE.get(
        champion_id,
        {"name": f"Champion {champion_id}", "ddragon_id": None, "icon": None, "splash": None, "loading": None},
    )


async def fetch_top_champion(session, api_key, platform, puuid):
    url = f"https://{platform}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/{puuid}/top"

    async with session.get(url, params={"api_key": api_key, "count": 1}) as resp:
        resp.raise_for_status()
        mastery = await resp.json()

    if not mastery:
        return {"name": "Unknown", "level": 0, "points": 0, "champion_id": None, "ddragon_id": None, "icon": None, "splash": None, "loading": None}

    top = mastery[0]
    champion_id = top.get("championId")
    champion_data = await get_champion_data(session, champion_id)

    return {
        "name": champion_data["name"],
        "level": top.get("championLevel", 0),
        "points": top.get("championPoints", 0),
        "champion_id": champion_id,
        "ddragon_id": champion_data["ddragon_id"],
        "icon": champion_data["icon"],
        "splash": champion_data["splash"],
        "loading": champion_data["loading"],
    }


async def fetch_account(session, api_key, game_name, tag_line, region):
    url = f"https://{region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{game_name}/{tag_line}"

    async with session.get(url, params={"api_key": api_key}) as resp:
        resp.raise_for_status()
        account = await resp.json()

    return account


async def fetch_lol_data(session, api_key, game_name, tag_line, platform, region):
    account = await fetch_account(session, api_key, game_name, tag_line, region)

    puuid = account["puuid"]
    account_name = f"{account.get('gameName')}#{account.get('tagLine')}"
    account_slug = safe_slug(account_name)

    league_url = f"https://{platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/{puuid}"

    async with session.get(league_url, params={"api_key": api_key}) as resp:
        resp.raise_for_status()
        leagues = await resp.json()

    solo = parse_queue(leagues, "RANKED_SOLO_5x5")
    flex = parse_queue(leagues, "RANKED_FLEX_SR")
    top_champion = await fetch_top_champion(session, api_key, platform, puuid)

    total_wins = solo["wins"] + flex["wins"]
    total_losses = solo["losses"] + flex["losses"]
    total_games = total_wins + total_losses

    return {
        "account": account_name,
        "account_slug": account_slug,
        "status": "Up to date",
        "solo": solo,
        "flex": flex,
        "top_champion": top_champion,
        "total": {
            "wins": total_wins,
            "losses": total_losses,
            "games": total_games,
            "win_rate": round((total_wins / total_games) * 100, 1) if total_games > 0 else 0,
        },
    }


async def fetch_player_rank(session, api_key, platform, puuid):
    url = f"https://{platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/{puuid}"

    try:
        async with session.get(url, params={"api_key": api_key}) as resp:
            if resp.status != 200:
                return "Unranked"
            leagues = await resp.json()
    except Exception:
        return "Unknown"

    solo = next((q for q in leagues if q.get("queueType") == "RANKED_SOLO_5x5"), None)
    flex = next((q for q in leagues if q.get("queueType") == "RANKED_FLEX_SR"), None)

    selected = solo or flex

    if not selected:
        return "Unranked"

    queue = "SoloQ" if selected is solo else "Flex"
    return f"{queue}: {selected.get('tier', '')} {selected.get('rank', '')} {selected.get('leaguePoints', 0)} LP".strip()


def get_participant_name(participant, fallback_name=None, fallback_tag=None):
    game_name = participant.get("riotIdGameName") or participant.get("gameName") or fallback_name
    tag_line = participant.get("riotIdTagline") or participant.get("tagLine") or fallback_tag

    if game_name and tag_line:
        return game_name, tag_line, f"{game_name}#{tag_line}"

    summoner_name = participant.get("summonerName")

    if summoner_name:
        return summoner_name, None, summoner_name

    return "Unknown", None, "Unknown"


async def enrich_participant(session, api_key, platform, participant, own_puuid, own_game_name, own_tag_line):
    puuid = participant.get("puuid")
    champion_id = participant.get("championId")
    champion = await get_champion_data(session, champion_id)

    fallback_name = own_game_name if puuid == own_puuid else None
    fallback_tag = own_tag_line if puuid == own_puuid else None

    game_name, tag_line, display_name = get_participant_name(participant, fallback_name, fallback_tag)
    rank = await fetch_player_rank(session, api_key, platform, puuid) if puuid else "Unknown"

    return {
        "name": display_name,
        "game_name": game_name,
        "tag_line": tag_line,
        "champion": champion["name"],
        "champion_id": champion_id,
        "rank": rank,
        "team_id": participant.get("teamId"),
        "opgg": make_opgg_url(platform, game_name, tag_line),
        "icon": champion["icon"],
        "splash": champion["splash"],
        "loading": champion["loading"],
        "is_self": puuid == own_puuid,
    }


async def fetch_live_data(session, api_key, game_name, tag_line, platform, region):
    account = await fetch_account(session, api_key, game_name, tag_line, region)

    puuid = account["puuid"]
    account_name = f"{account.get('gameName')}#{account.get('tagLine')}"
    account_slug = safe_slug(account_name)

    live_url = f"https://{platform}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/{puuid}"

    async with session.get(live_url, params={"api_key": api_key}) as resp:
        if resp.status == 404:
            return {
                "account": account_name,
                "account_slug": account_slug,
                "live": {
                    "status": "Offline",
                    "queue": None,
                    "queue_id": None,
                    "timer": None,
                    "game_length": 0,
                    "current_champion": {"name": None, "icon": None, "splash": None, "loading": None},
                    "blue_team": [],
                    "red_team": [],
                    "opgg": make_opgg_url(platform, account.get("gameName"), account.get("tagLine")),
                },
            }

        resp.raise_for_status()
        game = await resp.json()

    participants = game.get("participants", [])
    current = next((p for p in participants if p.get("puuid") == puuid), None)

    blue_team = []
    red_team = []

    for participant in participants:
        player = await enrich_participant(
            session,
            api_key,
            platform,
            participant,
            puuid,
            account.get("gameName"),
            account.get("tagLine"),
        )

        if player["team_id"] == 100:
            blue_team.append(player)
        elif player["team_id"] == 200:
            red_team.append(player)

    current_champion = {"name": None, "icon": None, "splash": None, "loading": None}

    if current:
        champion = await get_champion_data(session, current.get("championId"))
        current_champion = champion

    game_length = game.get("gameLength", 0)
    queue_id = game.get("gameQueueConfigId")

    return {
        "account": account_name,
        "account_slug": account_slug,
        "live": {
            "status": "In Game",
            "queue": QUEUE_NAMES.get(queue_id, f"Custom Game ({queue_id})"),
            "queue_id": queue_id,
            "timer": format_seconds(game_length),
            "game_length": game_length,
            "game_mode": game.get("gameMode"),
            "game_type": game.get("gameType"),
            "map_id": game.get("mapId"),
            "current_champion": current_champion,
            "blue_team": blue_team,
            "red_team": red_team,
            "opgg": make_opgg_url(platform, account.get("gameName"), account.get("tagLine")),
        },
    }


class BaseLeagueEntity(CoordinatorEntity):
    _attr_has_entity_name = False

    def _value_from_path(self):
        data = self.coordinator.data

        for part in self.description["path"]:
            if data is None:
                return None
            data = data.get(part)

        return data

    @property
    def available(self):
        return self.coordinator.last_update_success and self.coordinator.data is not None

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


class LeagueStatsSensor(BaseLeagueEntity, SensorEntity):
    def __init__(self, coordinator, description):
        super().__init__(coordinator)
        self.description = description

        account_slug = coordinator.data.get("account_slug", "league_account")

        self._attr_name = description["name"]
        self._attr_unique_id = f"league_stats_{account_slug}_{description['key']}"
        self._attr_icon = description.get("icon")
        self._attr_native_unit_of_measurement = description.get("unit")

    @property
    def native_value(self):
        if self.description["key"] == "update_status":
            return "Up to date" if self.coordinator.last_update_success else "Error"

        return self._value_from_path()


class LeagueLiveSensor(BaseLeagueEntity, SensorEntity):
    def __init__(self, coordinator, description):
        super().__init__(coordinator)
        self.description = description

        account_slug = coordinator.data.get("account_slug", "league_account")

        self._attr_name = description["name"]
        self._attr_unique_id = f"league_stats_{account_slug}_{description['key']}"
        self._attr_icon = description.get("icon")

    @property
    def native_value(self):
        return self._value_from_path()

    @property
    def extra_state_attributes(self):
        if self.description["key"] != "live_match":
            return None

        live = self.coordinator.data.get("live", {})

        return {
            "queue": live.get("queue"),
            "queue_id": live.get("queue_id"),
            "timer": live.get("timer"),
            "game_length": live.get("game_length"),
            "game_mode": live.get("game_mode"),
            "game_type": live.get("game_type"),
            "map_id": live.get("map_id"),
            "current_champion": live.get("current_champion"),
            "blue_team": live.get("blue_team"),
            "red_team": live.get("red_team"),
            "opgg": live.get("opgg"),
        }
