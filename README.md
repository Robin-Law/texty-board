# texty-board

## Usage

1. Clone the repo
2. `npm i`
3. Create a `.env` file at the root like:
  ```
  ENV_ONE_STATUS_URL=http://duckduckgo.com
  ENV_TWO_STATUS_URL=http://eff.org
  ENV_ONE_NAME=DDG
  ENV_TWO_NAME=EFF
  TRIMET_APP_ID=(Trimet API Key)
  TRIMET_STOP_IDS=8382,7646,10768
  OWM_API_KEY=(OpenWeatherMap API key)
  OWM_LOCATION=Portland
  OWM_UNITS=imperial
  EXPRESS_PORT=3456
  ```
4. `npm start`

## Accessing the web interface
### Environment Tracker
Access `host:3456/outages/EnvironmentName` for JSON and `host:3456/outages/EnvironmentName/table` for delicious HTML.

## Windows Support
You will need to run this in a WSL (Windows Subsystem For Linux) shell or similar, since [blessed](https://github.com/chjj/blessed) does not work well in Windows-based shells.

## Features TODO

* Persistence
* Less rigid/more configurable structure
* Serve views over Telnet
