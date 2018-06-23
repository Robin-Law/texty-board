const blessed = require('blessed');
const figlet = require('figlet');
const moment = require('moment');
const axios = require('axios').create({
  timeout: 10000,
});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const goodColor = 'green';
const maybeColor = 'grey';
const badColor = 'red';
const figletStyleColossal = {
  font: 'Colossal'
};

const westName = process.env.ENV_ONE_NAME;
const eastName = process.env.ENV_TWO_NAME;
const westBanner = figlet.textSync(westName, figletStyleColossal);
const eastBanner = figlet.textSync(eastName, figletStyleColossal);
const getLastUnhealthyBanner = (lastHealthy) => {
  return figlet.textSync(`${lastHealthy.format('LT')}`, figletStyleColossal);
};
const westUrl = process.env.ENV_ONE_STATUS_URL;
const eastUrl = process.env.ENV_TWO_STATUS_URL;

const getBaseBox = (content) => ({
  width: '50%',
  height: '50%',
  align: 'center',
  content: content,
  label: moment().toLocaleString(),
  tags: true,
  style: {
    fg: 'white',
    bg: maybeColor
  },
  border: {
    type: 'line'
  },
});

const state = { outages: [] };

const updateEnvironmentStatuses = () =>
  state.environments.forEach(env => {
    axios.get(env.url)
      .then(response => {
        if (env.healthy === false) {
          // TODO: State is getting messy! Clean it up!
          resolveOutage(env.name);
        }
        env.healthy = true;
        env.view.setContent(`${env.banner}`);
        env.view.style = { ...env.view.style, bg: goodColor };
        env.view.setLabel(`Last Checked: ${moment().toLocaleString()} - Result: ${response.status}`);
        state.screen.render();
      })
      .catch(error => {
        if (env.healthy || env.healthy === undefined) {
          // TODO: State is getting messy! Clean it up!
          env.lastUnhealthy = moment();
          addOutage(env.name);
        }
        env.healthy = false;
        const lastUnhealthyDisplay = getLastUnhealthyBanner(env.lastUnhealthy);
        env.view.setContent(`${env.banner}\n\n${lastUnhealthyDisplay}`);
        env.view.style = { ...env.view.style, bg: badColor };
        env.view.setLabel(`Last Checked: ${moment().toLocaleString()} - Result: ${error}`);
        state.screen.render();
      });
  });

const addOutage = (envName) => {
  // TODO: State is getting messy! Clean it up!
  state.outages.push({ env: envName, start: moment() });
  updateOutageView();
}

const resolveOutage = (envName) => {
  // TODO: State is getting messy! Clean it up!
  var outagesForEnv = (state.outages || [{}]).filter(outage => outage.env === envName);
  (outagesForEnv[state.outages.length-1] || {}).end = moment();
  updateOutageView();
}

const updateOutageView = () => {
  state.outageBox.setContent([...state.outages].reverse().map(outage => `${outage.env} - ${outage.start.format("LLL")} - ${outage.end ? outage.end.format("LLL") : "Ongoing"}`).join("\n"));
  state.screen.render();
}

const environmentTrackerFactory = (screen) => {
  state.screen = screen;
  state.environments = [
    {
      name: westName,
      banner: westBanner,
      url: westUrl,
      view: blessed.text(getBaseBox(`${westBanner}`))
    },
    {
      name: eastName,
      banner: eastBanner,
      url: eastUrl,
      view: blessed.text(getBaseBox(`${eastBanner}`))
    }
  ]

  state.outageBox = blessed.text({
    width: '25%',
    height: '50%',
    label: "Outages",
    content: "",
    border: {
      type: 'line'
    },
  });

  const views = [...state.environments.map(environment => environment.view), state.outageBox];

  return {
    views: views,
    updateAction: updateEnvironmentStatuses
  }
}

module.exports = environmentTrackerFactory;