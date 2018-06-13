require('dotenv').config();
const blessed = require('blessed');
const figlet = require('figlet');
const moment = require('moment');
const axios = require('axios');

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
const isUp = figlet.textSync('is up!', figletStyleColossal);
const isDown = figlet.textSync('is down!', figletStyleColossal);
const getLastUnhealthyBanner = (lastHealthy) => {
  return figlet.textSync(`${lastHealthy.format('LT')}`, figletStyleColossal);
};
const westUrl = process.env.ENV_ONE_STATUS_URL;
const eastUrl = process.env.ENV_TWO_STATUS_URL;

// Create a screen object.
const screen = blessed.screen({
  smartCSR: true
});
screen.title = 'Toasty Dash';
const layout = blessed.layout({
  parent: screen,
  width: '100%',
  height: '100%'
});
const getBaseBox = (content) => ({
  parent: layout,
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
const environments = [
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
const outageBox = blessed.text({
  parent: layout,
  width: '25%',
  height: '50%',
  label: "Outages",
  content: "",
  border: {
    type: 'line'
  },
});
const state = { environments: environments, outages: [] };
state.environments.slice(0, 2).forEach(env => layout.append(env.view));
layout.append(outageBox);
screen.render();

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
        screen.render();
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
        screen.render();
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
  outageBox.setContent([...state.outages].reverse().map(outage => `${outage.env} - ${outage.start.format("LLL")} - ${outage.end ? outage.end.format("LLL") : "Ongoing"}`).join("\n"));
  screen.render();
}

updateEnvironmentStatuses();
setInterval(updateEnvironmentStatuses, 300000);

screen.key(['enter'], function(ch, key) {
  updateEnvironmentStatuses();
});

screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  return process.exit(0);
});