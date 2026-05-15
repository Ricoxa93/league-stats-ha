import voluptuous as vol

from homeassistant import config_entries
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import (
    DOMAIN,
    CONF_API_KEY,
    CONF_GAME_NAME,
    CONF_TAG_LINE,
    CONF_PLATFORM,
    CONF_REGION,
)


async def validate_input(hass, data):
    session = async_get_clientsession(hass)

    api_key = data[CONF_API_KEY]
    game_name = data[CONF_GAME_NAME]
    tag_line = data[CONF_TAG_LINE]
    region = data[CONF_REGION]

    url = (
        f"https://{region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/"
        f"{game_name}/{tag_line}"
    )

    async with session.get(url, params={"api_key": api_key}) as resp:
        if resp.status != 200:
            raise ValueError(resp.status)

        account = await resp.json()

    return {
        "title": f"{account.get('gameName')}#{account.get('tagLine')}"
    }


class LeagueStatsConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input=None):
        errors = {}

        if user_input is not None:
            try:
                user_input[CONF_PLATFORM] = user_input[CONF_PLATFORM].lower()
                user_input[CONF_REGION] = user_input[CONF_REGION].lower()

                info = await validate_input(self.hass, user_input)

                await self.async_set_unique_id(
                    f"{user_input[CONF_GAME_NAME]}#{user_input[CONF_TAG_LINE]}"
                )
                self._abort_if_unique_id_configured()

                return self.async_create_entry(
                    title=info["title"],
                    data=user_input,
                )

            except Exception:
                errors["base"] = "cannot_connect"

        schema = vol.Schema({
            vol.Required(CONF_API_KEY): str,
            vol.Required(CONF_GAME_NAME, default="Ricoxa"): str,
            vol.Required(CONF_TAG_LINE, default="1993"): str,
            vol.Required(CONF_PLATFORM, default="euw1"): str,
            vol.Required(CONF_REGION, default="europe"): str,
        })

        return self.async_show_form(
            step_id="user",
            data_schema=schema,
            errors=errors,
        )