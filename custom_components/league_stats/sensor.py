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
LIVE_SCAN_INTERVAL = timedelta(seconds=60)
LAST_MATCH_SCAN_INTERVAL = timedelta(minutes=5)

CHAMPION_CACHE = {}
SUMMONER_SPELL_CACHE = {}
RUNE_CACHE = {}
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


LAST_MATCH_SENSORS = [
    {"key": "last_match", "name": "Last Match", "icon": "mdi:history", "path": ("last_match", "result")},
    {"key": "last_match_champion", "name": "Last Match Champion", "icon": "mdi:account-star", "path": ("last_match", "champion")},
    {"key": "last_match_role", "name": "Last Match Role", "icon": "mdi:account-switch", "path": ("last_match", "role")},
    {"key": "last_match_kda", "name": "Last Match KDA", "icon": "mdi:chart-line", "path": ("last_match", "kda")},
    {"key": "last_match_kills", "name": "Last Match Kills", "icon": "mdi:sword", "path": ("last_match", "kills")},
    {"key": "last_match_deaths", "name": "Last Match Deaths", "icon": "mdi:skull", "path": ("last_match", "deaths")},
    {"key": "last_match_assists", "name": "Last Match Assists", "icon": "mdi:handshake", "path": ("last_match", "assists")},
    {"key": "last_match_cs", "name": "Last Match CS", "icon": "mdi:grain", "path": ("last_match", "cs")},
    {"key": "last_match_gold", "name": "Last Match Gold", "icon": "mdi:gold", "path": ("last_match", "gold")},
    {"key": "last_match_damage", "name": "Last Match Damage", "icon": "mdi:fire", "path": ("last_match", "damage")},
    {"key": "last_match_vision", "name": "Last Match Vision Score", "icon": "mdi:eye", "path": ("last_match", "vision_score")},
    {"key": "last_match_duration", "name": "Last Match Duration", "icon": "mdi:timer", "path": ("last_match", "duration")},
    {"key": "last_match_queue", "name": "Last Match Queue", "icon": "mdi:format-list-bulleted", "path": ("last_match", "queue")},
    {"key": "last_match_blue_dragons", "name": "Last Match Blue Dragons", "icon": "mdi:dragon", "path": ("last_match", "blue_dragons")},
    {"key": "last_match_red_dragons", "name": "Last Match Red Dragons", "icon": "mdi:dragon", "path": ("last_match", "red_dragons")},
    {"key": "last_match_blue_barons", "name": "Last Match Blue Barons", "icon": "mdi:shield-crown", "path": ("last_match", "blue_barons")},
    {"key": "last_match_red_barons", "name": "Last Match Red Barons", "icon": "mdi:shield-crown", "path": ("last_match", "red_barons")},
    {"key": "last_match_blue_towers", "name": "Last Match Blue Towers", "icon": "mdi:tower-fire", "path": ("last_match", "blue_towers")},
    {"key": "last_match_red_towers", "name": "Last Match Red Towers", "icon": "mdi:tower-fire", "path": ("last_match", "red_towers")},
    {"key": "last_match_icon", "name": "Last Match Icon", "icon": "mdi:image", "path": ("last_match", "icon")},
    {"key": "last_match_splash", "name": "Last Match Splash", "icon": "mdi:image-area", "path": ("last_match", "splash")},
    {"key": "last_match_loading", "name": "Last Match Loading", "icon": "mdi:image-frame", "path": ("last_match", "loading")},
]


LAST_MATCH_PLAYER_SENSORS = []

for team_key, team_name in [
    ("blue_team", "Blue"),
    ("red_team", "Red"),
]:
    for index in range(5):
        number = index + 1
        LAST_MATCH_PLAYER_SENSORS.append(
            {
                "key": f"last_match_{team_key}_{number}",
                "name": f"Last Match {team_name} Player {number}",
                "icon": "mdi:account",
                "team_key": team_key,
                "index": index,
            }
        )


async def async_setup_entry(hass, entry, async_add_entities):
    config = entry.data
    session = async_get_clientsession(hass)

    ranked_coordinator = DataUpdateCoordinator(
        hass,
        _LOGGER,
        name="league_stats",
        update_method=lambda: fetch_lol_data(
            session,
            config[CONF_API_KEY],
            config[CONF_GAME_NAME],
            config[CONF_TAG_LINE],
            config[CONF_PLATFORM],
            config[CONF_REGION],
        ),
        update_interval=SCAN_INTERVAL,
    )

    live_coordinator = DataUpdateCoordinator(
        hass,
        _LOGGER,
        name="league_stats_live",
        update_method=lambda: fetch_live_data(
            session,
            config[CONF_API_KEY],
            config[CONF_GAME_NAME],
            config[CONF_TAG_LINE],
            config[CONF_PLATFORM],
            config[CONF_REGION],
        ),
        update_interval=LIVE_SCAN_INTERVAL,
    )

    last_match_coordinator = DataUpdateCoordinator(
        hass,
        _LOGGER,
        name="league_stats_last_match",
        update_method=lambda: fetch_last_match_data(
            session,
            config[CONF_API_KEY],
            config[CONF_GAME_NAME],
            config[CONF_TAG_LINE],
            config[CONF_PLATFORM],
            config[CONF_REGION],
        ),
        update_interval=LAST_MATCH_SCAN_INTERVAL,
    )

    await ranked_coordinator.async_config_entry_first_refresh()
    await live_coordinator.async_config_entry_first_refresh()
    await last_match_coordinator.async_config_entry_first_refresh()

    async_add_entities(
        [LeagueStatsSensor(ranked_coordinator, d) for d in RANKED_SENSORS]
        + [LeagueLiveSensor(live_coordinator, d) for d in LIVE_SENSORS]
        + [LeagueLastMatchSensor(last_match_coordinator, d) for d in LAST_MATCH_SENSORS]
        + [LeagueLastMatchPlayerSensor(last_match_coordinator, d) for d in LAST_MATCH_PLAYER_SENSORS]
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

    return f"{prefix}{seconds // 60}:{seconds % 60:02d}"


def format_duration(seconds):
    seconds = int(seconds or 0)
    return f"{seconds // 60}:{seconds % 60:02d}"


def calculate_kda(kills, deaths, assists):
    if deaths == 0:
        return round(kills + assists, 2)

    return round((kills + assists) / deaths, 2)


def format_role(role):
    role_names = {
        "TOP": "Top",
        "JUNGLE": "Jungle",
        "MIDDLE": "Mid",
        "BOTTOM": "Bot",
        "UTILITY": "Support",
    }

    return role_names.get(role, role or "Unknown")


def make_opgg_url(platform, game_name, tag_line):
    region = OPGG_REGIONS.get(platform.lower())

    if not region or not game_name or not tag_line:
        return None

    return f"https://www.op.gg/summoners/{region}/{game_name}-{tag_line}"


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
        return {
            "name": "Unknown",
            "ddragon_id": None,
            "icon": None,
            "splash": None,
            "loading": None,
        }

    if champion_id in CHAMPION_CACHE:
        return CHAMPION_CACHE[champion_id]

    latest_version = await get_latest_ddragon_version(session)

    champions_url = (
        f"https://ddragon.leagueoflegends.com/cdn/"
        f"{latest_version}/data/en_US/champion.json"
    )

    async with session.get(champions_url) as resp:
        resp.raise_for_status()
        champions = await resp.json()

    for champion in champions["data"].values():
        champ_key = int(champion["key"])
        champ_id = champion["id"]

        CHAMPION_CACHE[champ_key] = {
            "name": champion["name"],
            "ddragon_id": champ_id,
            "icon": (
                f"https://ddragon.leagueoflegends.com/cdn/"
                f"{latest_version}/img/champion/{champ_id}.png"
            ),
            "splash": (
                f"https://ddragon.leagueoflegends.com/cdn/img/champion/splash/"
                f"{champ_id}_0.jpg"
            ),
            "loading": (
                f"https://ddragon.leagueoflegends.com/cdn/img/champion/loading/"
                f"{champ_id}_0.jpg"
            ),
        }

    return CHAMPION_CACHE.get(
        champion_id,
        {
            "name": f"Champion {champion_id}",
            "ddragon_id": None,
            "icon": None,
            "splash": None,
            "loading": None,
        },
    )


def get_item_icon_url(version, item_id):
    if not item_id or item_id == 0:
        return None

    return (
        f"https://ddragon.leagueoflegends.com/cdn/"
        f"{version}/img/item/{item_id}.png"
    )


async def get_summoner_spell_data(session, spell_id):
    if not spell_id:
        return None

    if spell_id in SUMMONER_SPELL_CACHE:
        return SUMMONER_SPELL_CACHE[spell_id]

    latest_version = await get_latest_ddragon_version(session)

    spells_url = (
        f"https://ddragon.leagueoflegends.com/cdn/"
        f"{latest_version}/data/en_US/summoner.json"
    )

    async with session.get(spells_url) as resp:
        resp.raise_for_status()
        spells = await resp.json()

    for spell in spells["data"].values():
        key = int(spell["key"])
        image = spell["image"]["full"]

        SUMMONER_SPELL_CACHE[key] = {
            "id": key,
            "name": spell["name"],
            "icon": (
                f"https://ddragon.leagueoflegends.com/cdn/"
                f"{latest_version}/img/spell/{image}"
            ),
        }

    return SUMMONER_SPELL_CACHE.get(spell_id)


async def get_rune_data(session, rune_id):
    if not rune_id:
        return None

    if rune_id in RUNE_CACHE:
        return RUNE_CACHE[rune_id]

    latest_version = await get_latest_ddragon_version(session)

    runes_url = (
        f"https://ddragon.leagueoflegends.com/cdn/"
        f"{latest_version}/data/en_US/runesReforged.json"
    )

    async with session.get(runes_url) as resp:
        resp.raise_for_status()
        rune_styles = await resp.json()

    for style in rune_styles:
        RUNE_CACHE[style["id"]] = {
            "id": style["id"],
            "name": style["name"],
            "icon": f"https://ddragon.leagueoflegends.com/cdn/img/{style['icon']}",
        }

        for slot in style.get("slots", []):
            for rune in slot.get("runes", []):
                RUNE_CACHE[rune["id"]] = {
                    "id": rune["id"],
                    "name": rune["name"],
                    "icon": f"https://ddragon.leagueoflegends.com/cdn/img/{rune['icon']}",
                }

    return RUNE_CACHE.get(rune_id)


async def fetch_top_champion(session, api_key, platform, puuid):
    url = (
        f"https://{platform}.api.riotgames.com"
        f"/lol/champion-mastery/v4/champion-masteries/by-puuid/{puuid}/top"
    )

    async with session.get(url, params={"api_key": api_key, "count": 1}) as resp:
        resp.raise_for_status()
        mastery = await resp.json()

    if not mastery:
        return {
            "name": "Unknown",
            "level": 0,
            "points": 0,
            "champion_id": None,
            "ddragon_id": None,
            "icon": None,
            "splash": None,
            "loading": None,
        }

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
    url = (
        f"https://{region}.api.riotgames.com"
        f"/riot/account/v1/accounts/by-riot-id/{game_name}/{tag_line}"
    )

    async with session.get(url, params={"api_key": api_key}) as resp:
        resp.raise_for_status()
        account = await resp.json()

    return account


async def fetch_lol_data(session, api_key, game_name, tag_line, platform, region):
    account = await fetch_account(session, api_key, game_name, tag_line, region)

    puuid = account["puuid"]
    account_name = f"{account.get('gameName')}#{account.get('tagLine')}"
    account_slug = safe_slug(account_name)

    league_url = (
        f"https://{platform}.api.riotgames.com"
        f"/lol/league/v4/entries/by-puuid/{puuid}"
    )

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
            "win_rate": (
                round((total_wins / total_games) * 100, 1)
                if total_games > 0
                else 0
            ),
        },
    }


async def fetch_player_rank(session, api_key, platform, puuid):
    url = (
        f"https://{platform}.api.riotgames.com"
        f"/lol/league/v4/entries/by-puuid/{puuid}"
    )

    try:
        async with session.get(url, params={"api_key": api_key}) as resp:
            if resp.status != 200:
                return "Unranked"

            leagues = await resp.json()
    except Exception:
        return "Unknown"

    solo = next(
        (q for q in leagues if q.get("queueType") == "RANKED_SOLO_5x5"),
        None,
    )
    flex = next(
        (q for q in leagues if q.get("queueType") == "RANKED_FLEX_SR"),
        None,
    )

    selected = solo or flex

    if not selected:
        return "Unranked"

    queue = "SoloQ" if selected is solo else "Flex"

    return (
        f"{queue}: {selected.get('tier', '')} "
        f"{selected.get('rank', '')} "
        f"{selected.get('leaguePoints', 0)} LP"
    ).strip()


async def fetch_player_rank_stats(session, api_key, platform, puuid):
    if not puuid:
        return {
            "rank": "Unknown",
            "winrate": 0,
            "wins": 0,
            "losses": 0,
            "games": 0,
            "queue": None,
            "lp": 0,
        }

    url = (
        f"https://{platform}.api.riotgames.com"
        f"/lol/league/v4/entries/by-puuid/{puuid}"
    )

    try:
        async with session.get(url, params={"api_key": api_key}) as resp:
            if resp.status != 200:
                return {
                    "rank": "Unranked",
                    "winrate": 0,
                    "wins": 0,
                    "losses": 0,
                    "games": 0,
                    "queue": None,
                    "lp": 0,
                }

            leagues = await resp.json()
    except Exception:
        return {
            "rank": "Unknown",
            "winrate": 0,
            "wins": 0,
            "losses": 0,
            "games": 0,
            "queue": None,
            "lp": 0,
        }

    solo = next(
        (q for q in leagues if q.get("queueType") == "RANKED_SOLO_5x5"),
        None,
    )
    flex = next(
        (q for q in leagues if q.get("queueType") == "RANKED_FLEX_SR"),
        None,
    )

    selected = solo or flex

    if not selected:
        return {
            "rank": "Unranked",
            "winrate": 0,
            "wins": 0,
            "losses": 0,
            "games": 0,
            "queue": None,
            "lp": 0,
        }

    wins = selected.get("wins", 0)
    losses = selected.get("losses", 0)
    games = wins + losses
    winrate = round((wins / games) * 100, 1) if games > 0 else 0
    queue = "SoloQ" if selected is solo else "Flex"
    lp = selected.get("leaguePoints", 0)

    rank = (
        f"{queue}: {selected.get('tier', '')} "
        f"{selected.get('rank', '')} "
        f"{lp} LP"
    ).strip()

    return {
        "rank": rank,
        "winrate": winrate,
        "wins": wins,
        "losses": losses,
        "games": games,
        "queue": queue,
        "lp": lp,
    }


def get_participant_name(participant, fallback_name=None, fallback_tag=None):
    game_name = (
        participant.get("riotIdGameName")
        or participant.get("gameName")
        or fallback_name
    )
    tag_line = (
        participant.get("riotIdTagline")
        or participant.get("tagLine")
        or fallback_tag
    )

    if game_name and tag_line:
        return game_name, tag_line, f"{game_name}#{tag_line}"

    summoner_name = participant.get("summonerName")

    if summoner_name:
        return summoner_name, None, summoner_name

    return "Unknown", None, "Unknown"


async def enrich_participant(
    session,
    api_key,
    platform,
    participant,
    own_puuid,
    own_game_name,
    own_tag_line,
):
    puuid = participant.get("puuid")
    champion_id = participant.get("championId")
    champion = await get_champion_data(session, champion_id)

    fallback_name = own_game_name if puuid == own_puuid else None
    fallback_tag = own_tag_line if puuid == own_puuid else None

    game_name, tag_line, display_name = get_participant_name(
        participant,
        fallback_name,
        fallback_tag,
    )

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

    live_url = (
        f"https://{platform}.api.riotgames.com"
        f"/lol/spectator/v5/active-games/by-summoner/{puuid}"
    )

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
                    "current_champion": {
                        "name": None,
                        "icon": None,
                        "splash": None,
                        "loading": None,
                    },
                    "blue_team": [],
                    "red_team": [],
                    "opgg": make_opgg_url(
                        platform,
                        account.get("gameName"),
                        account.get("tagLine"),
                    ),
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

    current_champion = {
        "name": None,
        "icon": None,
        "splash": None,
        "loading": None,
    }

    if current:
        current_champion = await get_champion_data(session, current.get("championId"))

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
            "opgg": make_opgg_url(
                platform,
                account.get("gameName"),
                account.get("tagLine"),
            ),
        },
    }


async def enrich_match_participant(session, api_key, platform, participant, game_duration):
    latest_version = await get_latest_ddragon_version(session)

    champion_id = participant.get("championId")
    champion = await get_champion_data(session, champion_id)

    game_name = (
        participant.get("riotIdGameName")
        or participant.get("summonerName")
        or "Unknown"
    )
    tag_line = participant.get("riotIdTagline")

    name = f"{game_name}#{tag_line}" if tag_line else game_name

    kills = participant.get("kills", 0)
    deaths = participant.get("deaths", 0)
    assists = participant.get("assists", 0)

    cs = (
        participant.get("totalMinionsKilled", 0)
        + participant.get("neutralMinionsKilled", 0)
    )

    minutes = max((game_duration or 0) / 60, 1)
    cs_per_min = round(cs / minutes, 1)

    challenges = participant.get("challenges", {}) or {}
    kill_participation = challenges.get("killParticipation")

    if kill_participation is not None:
        kill_participation = round(kill_participation * 100, 1)

    item_ids = [
        participant.get("item0", 0),
        participant.get("item1", 0),
        participant.get("item2", 0),
        participant.get("item3", 0),
        participant.get("item4", 0),
        participant.get("item5", 0),
        participant.get("item6", 0),
    ]

    items = [
        {
            "id": item_id,
            "icon": get_item_icon_url(latest_version, item_id),
        }
        for item_id in item_ids
        if item_id and item_id != 0
    ]

    spell1 = await get_summoner_spell_data(
        session,
        participant.get("summoner1Id"),
    )
    spell2 = await get_summoner_spell_data(
        session,
        participant.get("summoner2Id"),
    )

    perks = participant.get("perks", {}) or {}
    styles = perks.get("styles", []) or []

    primary_rune = None
    secondary_rune = None

    if len(styles) > 0:
        selections = styles[0].get("selections", []) or []

        if selections:
            primary_rune = await get_rune_data(
                session,
                selections[0].get("perk"),
            )

    if len(styles) > 1:
        secondary_rune = await get_rune_data(
            session,
            styles[1].get("style"),
        )

    rank_stats = await fetch_player_rank_stats(
        session,
        api_key,
        platform,
        participant.get("puuid"),
    )

    return {
        "name": name,
        "rank": rank_stats.get("rank"),
        "winrate": rank_stats.get("winrate"),
        "rank_wins": rank_stats.get("wins"),
        "rank_losses": rank_stats.get("losses"),
        "rank_games": rank_stats.get("games"),
        "rank_queue": rank_stats.get("queue"),
        "rank_lp": rank_stats.get("lp"),
        "champion": participant.get("championName") or champion["name"],
        "champion_id": champion_id,
        "champion_level": participant.get("champLevel", 0),
        "role": format_role(
            participant.get("teamPosition")
            or participant.get("individualPosition")
        ),
        "kills": kills,
        "deaths": deaths,
        "assists": assists,
        "kda": calculate_kda(kills, deaths, assists),
        "cs": cs,
        "cs_per_min": cs_per_min,
        "gold": participant.get("goldEarned", 0),
        "damage": participant.get("totalDamageDealtToChampions", 0),
        "vision_score": participant.get("visionScore", 0),
        "kill_participation": kill_participation,
        "win": participant.get("win", False),
        "team_id": participant.get("teamId"),
        "items": items,
        "summoner_spells": [spell for spell in [spell1, spell2] if spell],
        "primary_rune": primary_rune,
        "secondary_rune": secondary_rune,
        "icon": champion["icon"],
        "splash": champion["splash"],
        "loading": champion["loading"],
    }


async def fetch_last_match_data(session, api_key, game_name, tag_line, platform, region):
    account = await fetch_account(session, api_key, game_name, tag_line, region)

    puuid = account["puuid"]
    account_name = f"{account.get('gameName')}#{account.get('tagLine')}"
    account_slug = safe_slug(account_name)

    match_ids_url = (
        f"https://{region}.api.riotgames.com"
        f"/lol/match/v5/matches/by-puuid/{puuid}/ids"
    )

    async with session.get(
        match_ids_url,
        params={
            "api_key": api_key,
            "start": 0,
            "count": 1,
        },
    ) as resp:
        resp.raise_for_status()
        match_ids = await resp.json()

    if not match_ids:
        return {
            "account": account_name,
            "account_slug": account_slug,
            "last_match": {
                "result": "No Match",
                "match_id": None,
                "champion": None,
                "champion_id": None,
                "champion_level": None,
                "role": None,
                "kills": 0,
                "deaths": 0,
                "assists": 0,
                "kda": 0,
                "cs": 0,
                "cs_per_min": 0,
                "gold": 0,
                "damage": 0,
                "vision_score": 0,
                "kill_participation": None,
                "duration": None,
                "queue": None,
                "game_mode": None,
                "game_type": None,
                "icon": None,
                "splash": None,
                "loading": None,
                "items": [],
                "summoner_spells": [],
                "primary_rune": None,
                "secondary_rune": None,
                "blue_team": [],
                "red_team": [],
                "blue_dragons": 0,
                "red_dragons": 0,
                "blue_barons": 0,
                "red_barons": 0,
                "blue_towers": 0,
                "red_towers": 0,
            },
        }

    match_id = match_ids[0]

    match_url = (
        f"https://{region}.api.riotgames.com"
        f"/lol/match/v5/matches/{match_id}"
    )

    async with session.get(match_url, params={"api_key": api_key}) as resp:
        resp.raise_for_status()
        match = await resp.json()

    info = match.get("info", {})
    participants = info.get("participants", [])
    game_duration = info.get("gameDuration", 0)

    own = next((p for p in participants if p.get("puuid") == puuid), None)

    blue_team = []
    red_team = []

    for participant in participants:
        player = await enrich_match_participant(
            session,
            api_key,
            platform,
            participant,
            game_duration,
        )

        if player["team_id"] == 100:
            blue_team.append(player)
        elif player["team_id"] == 200:
            red_team.append(player)

    queue_id = info.get("queueId")
    duration = format_duration(game_duration)

    teams = info.get("teams", []) or []

    blue_objectives = next(
        (t.get("objectives", {}) for t in teams if t.get("teamId") == 100),
        {},
    )
    red_objectives = next(
        (t.get("objectives", {}) for t in teams if t.get("teamId") == 200),
        {},
    )

    blue_dragons = blue_objectives.get("dragon", {}).get("kills", 0)
    red_dragons = red_objectives.get("dragon", {}).get("kills", 0)
    blue_barons = blue_objectives.get("baron", {}).get("kills", 0)
    red_barons = red_objectives.get("baron", {}).get("kills", 0)
    blue_towers = blue_objectives.get("tower", {}).get("kills", 0)
    red_towers = red_objectives.get("tower", {}).get("kills", 0)

    if not own:
        return {
            "account": account_name,
            "account_slug": account_slug,
            "last_match": {
                "result": "Unknown",
                "match_id": match_id,
                "champion": None,
                "champion_id": None,
                "champion_level": None,
                "role": None,
                "kills": 0,
                "deaths": 0,
                "assists": 0,
                "kda": 0,
                "cs": 0,
                "cs_per_min": 0,
                "gold": 0,
                "damage": 0,
                "vision_score": 0,
                "kill_participation": None,
                "duration": duration,
                "queue": QUEUE_NAMES.get(queue_id, f"Custom Game ({queue_id})"),
                "game_mode": info.get("gameMode"),
                "game_type": info.get("gameType"),
                "icon": None,
                "splash": None,
                "loading": None,
                "items": [],
                "summoner_spells": [],
                "primary_rune": None,
                "secondary_rune": None,
                "blue_team": blue_team,
                "red_team": red_team,
                "blue_dragons": blue_dragons,
                "red_dragons": red_dragons,
                "blue_barons": blue_barons,
                "red_barons": red_barons,
                "blue_towers": blue_towers,
                "red_towers": red_towers,
            },
        }

    own_enriched = await enrich_match_participant(
        session,
        api_key,
        platform,
        own,
        game_duration,
    )

    return {
        "account": account_name,
        "account_slug": account_slug,
        "last_match": {
            "result": "Victory" if own.get("win") else "Defeat",
            "match_id": match_id,
            "champion": own_enriched["champion"],
            "champion_id": own_enriched["champion_id"],
            "champion_level": own_enriched["champion_level"],
            "role": own_enriched["role"],
            "kills": own_enriched["kills"],
            "deaths": own_enriched["deaths"],
            "assists": own_enriched["assists"],
            "kda": own_enriched["kda"],
            "cs": own_enriched["cs"],
            "cs_per_min": own_enriched["cs_per_min"],
            "gold": own_enriched["gold"],
            "damage": own_enriched["damage"],
            "vision_score": own_enriched["vision_score"],
            "kill_participation": own_enriched["kill_participation"],
            "duration": duration,
            "queue": QUEUE_NAMES.get(queue_id, f"Custom Game ({queue_id})"),
            "game_mode": info.get("gameMode"),
            "game_type": info.get("gameType"),
            "icon": own_enriched["icon"],
            "splash": own_enriched["splash"],
            "loading": own_enriched["loading"],
            "items": own_enriched["items"],
            "summoner_spells": own_enriched["summoner_spells"],
            "primary_rune": own_enriched["primary_rune"],
            "secondary_rune": own_enriched["secondary_rune"],
            "blue_team": blue_team,
            "red_team": red_team,
            "blue_dragons": blue_dragons,
            "red_dragons": red_dragons,
            "blue_barons": blue_barons,
            "red_barons": red_barons,
            "blue_towers": blue_towers,
            "red_towers": red_towers,
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
        return (
            self.coordinator.last_update_success
            and self.coordinator.data is not None
        )

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


class LeagueLastMatchSensor(BaseLeagueEntity, SensorEntity):
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
        if self.description["key"] != "last_match":
            return None

        last_match = self.coordinator.data.get("last_match", {})

        return {
            "match_id": last_match.get("match_id"),
            "queue": last_match.get("queue"),
            "duration": last_match.get("duration"),
            "game_mode": last_match.get("game_mode"),
            "game_type": last_match.get("game_type"),
            "champion": last_match.get("champion"),
            "champion_id": last_match.get("champion_id"),
            "champion_level": last_match.get("champion_level"),
            "role": last_match.get("role"),
            "kills": last_match.get("kills"),
            "deaths": last_match.get("deaths"),
            "assists": last_match.get("assists"),
            "kda": last_match.get("kda"),
            "cs": last_match.get("cs"),
            "cs_per_min": last_match.get("cs_per_min"),
            "gold": last_match.get("gold"),
            "damage": last_match.get("damage"),
            "vision_score": last_match.get("vision_score"),
            "kill_participation": last_match.get("kill_participation"),
            "champion_icon": last_match.get("icon"),
            "splash": last_match.get("splash"),
            "loading": last_match.get("loading"),
            "items": last_match.get("items"),
            "summoner_spells": last_match.get("summoner_spells"),
            "primary_rune": last_match.get("primary_rune"),
            "secondary_rune": last_match.get("secondary_rune"),
            "blue_team": last_match.get("blue_team"),
            "red_team": last_match.get("red_team"),
            "blue_dragons": last_match.get("blue_dragons"),
            "red_dragons": last_match.get("red_dragons"),
            "blue_barons": last_match.get("blue_barons"),
            "red_barons": last_match.get("red_barons"),
            "blue_towers": last_match.get("blue_towers"),
            "red_towers": last_match.get("red_towers"),
        }


class LeagueLastMatchPlayerSensor(BaseLeagueEntity, SensorEntity):
    def __init__(self, coordinator, description):
        super().__init__(coordinator)
        self.description = description

        account_slug = coordinator.data.get("account_slug", "league_account")

        self._attr_name = description["name"]
        self._attr_unique_id = f"league_stats_{account_slug}_{description['key']}"
        self._attr_icon = description.get("icon")

    def _player(self):
        data = self.coordinator.data or {}
        last_match = data.get("last_match", {})
        team = last_match.get(self.description["team_key"], [])
        index = self.description["index"]

        if index >= len(team):
            return None

        return team[index]

    @property
    def native_value(self):
        player = self._player()

        if not player:
            return "Unavailable"

        return player.get("name") or "Unknown"

    @property
    def extra_state_attributes(self):
        player = self._player()

        if not player:
            return {}

        return {
            "name": player.get("name"),
            "rank": player.get("rank"),
            "winrate": player.get("winrate"),
            "rank_wins": player.get("rank_wins"),
            "rank_losses": player.get("rank_losses"),
            "rank_games": player.get("rank_games"),
            "rank_queue": player.get("rank_queue"),
            "rank_lp": player.get("rank_lp"),
            "champion": player.get("champion"),
            "champion_id": player.get("champion_id"),
            "champion_level": player.get("champion_level"),
            "role": player.get("role"),
            "kills": player.get("kills"),
            "deaths": player.get("deaths"),
            "assists": player.get("assists"),
            "kda": player.get("kda"),
            "cs": player.get("cs"),
            "cs_per_min": player.get("cs_per_min"),
            "gold": player.get("gold"),
            "damage": player.get("damage"),
            "vision_score": player.get("vision_score"),
            "kill_participation": player.get("kill_participation"),
            "win": player.get("win"),
            "team_id": player.get("team_id"),
            "items": player.get("items"),
            "summoner_spells": player.get("summoner_spells"),
            "primary_rune": player.get("primary_rune"),
            "secondary_rune": player.get("secondary_rune"),
            "champion_icon": player.get("icon"),
            "splash": player.get("splash"),
            "loading": player.get("loading"),
        }
