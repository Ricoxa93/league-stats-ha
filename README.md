League Stats for Home Assistant
League of Legends ranked, live-game and match-history sensors for Home Assistant.
This integration uses the official Riot Games API and creates sensors for ranked statistics, the current live match, the latest match and recent match history.
> This project is not affiliated with, endorsed, sponsored, or specifically approved by Riot Games.
Features
SoloQ and FlexQ rank, LP, wins, losses and win rate
Combined ranked statistics
Top champion data with Data Dragon images
Live match status, queue, timer and current champion
Latest match details including KDA, items, runes, spells, objectives and teams
Last 5 matches as compact history sensors
Ready-to-use dashboard examples for `custom:button-card`
Installation via HACS
Open HACS → Integrations
Open the menu and choose Custom repositories
Add your repository URL
Select category Integration
Install League Stats
Restart Home Assistant
Example repository URL:
```text
https://github.com/YOUR_GITHUB_NAME/league-stats-ha
```
Riot API key
You need your own Riot Games API key.
Open the Riot Developer Portal
Sign in with your Riot account
Copy your API key
Add the integration in Home Assistant
Development API keys expire regularly. If the integration stops updating and Home Assistant shows `401 Unauthorized`, create a new Riot API key and update the integration config.
Setup in Home Assistant
Go to:
```text
Settings → Devices & services → Add integration → League Stats
```
Example configuration:
Field	Example
API key	`RGAPI-xxxxxxxx`
Riot name	`ExamplePlayer`
Tagline	`TAG`
Platform	`euw1`
Region	`europe`
For a Riot ID like:
```text
ExamplePlayer#TAG
```
use:
Part	Value
Riot name	`ExamplePlayer`
Tagline	`TAG`
Regions
Server	Platform	Region
EUW	`euw1`	`europe`
EUNE	`eun1`	`europe`
NA	`na1`	`americas`
KR	`kr`	`asia`
BR	`br1`	`americas`
JP	`jp1`	`asia`
LAN	`la1`	`americas`
LAS	`la2`	`americas`
OCE	`oc1`	`sea`
TR	`tr1`	`europe`
RU	`ru`	`europe`
Dashboard examples
Ready-to-use Lovelace examples are stored here:
Dashboard card documentation
Button-card templates
Last games stack
Player card
Blue team header
Red team header
Preview:
![Last Match Team View](docs/images/last-match-team-view.png)
![Last Games History](docs/images/last-games-history.png)
Required frontend cards for the examples
The dashboard examples use:
`custom:button-card`
`browser_mod` for popups
Install them via HACS before using the YAML examples.
What users need to change in dashboard YAML
Replace the example entity prefix:
```text
sensor.league_stats_exampleplayer_tag
```
with your own entity prefix.
Example:
```text
sensor.league_stats_myplayer_euw
```
Also replace:
```text
ExamplePlayer#TAG
```
with your own Riot ID, for example:
```text
MyPlayer#EUW
```
Troubleshooting
Error	Meaning	Solution
`401 Unauthorized`	API key invalid or expired	Create a new Riot API key
`403 Forbidden`	Access denied	Check the API key
`404 Not Found`	Riot name, tagline or region wrong	Check Riot ID and region
`429 Too Many Requests`	Riot rate limit reached	Increase update interval or wait
Repository structure
```text
custom_components/league_stats/
docs/
docs/images/
examples/dashboard-cards/
README.md
hacs.json
LICENSE
```
Notes
API keys are stored locally in Home Assistant.
The integration does not use a central server.
Champion, item, spell and rune images are loaded from Riot Data Dragon.
