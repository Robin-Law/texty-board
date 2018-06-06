require('dotenv').config();
const blessed = require('blessed');
const figlet = require('figlet');
const moment = require('moment');
const axios = require('axios');

const goodColor = 'green';
const maybeColor = 'grey';
const badColor = 'red';
const figletStyleColossal = {
  font: 'colossal'
};

const westBanner = figlet.textSync('HBase West', figletStyleColossal);
const eastBanner = figlet.textSync('HBase East', figletStyleColossal);
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
    name: 'HBase West',
    banner: westBanner,
    url: westUrl,
    view: blessed.text(getBaseBox(`${westBanner}`))
  },
  {
    name: 'HBase East',
    banner: eastBanner,
    url: eastUrl,
    view: blessed.text(getBaseBox(`${eastBanner}`))
  }
]
const state = { environments: environments };
state.environments.slice(0, 2).forEach(env => layout.append(env.view));
screen.render();

const updateEnvironmentStatuses = () =>
  state.environments.forEach(env => {
    axios.get(env.url)
      .then(response => {
        env.healthy = true;
        env.view.setContent(`${env.banner}`);
        env.view.style = { ...env.view.style, bg: goodColor };
        env.view.setLabel(`Last Checked: ${moment().toLocaleString()}`);
        screen.render();
      })
      .catch(error => {
        env.lastUnhealthy = env.healthy || env.healthy === undefined ?
          moment() : env.lastUnhealthy;
        env.healthy = false;
        const lastUnhealthyDisplay = getLastUnhealthyBanner(env.lastUnhealthy);
        env.view.setContent(`${env.banner}\n\n${lastUnhealthyDisplay}`);
        env.view.style = { ...env.view.style, bg: badColor };
        env.view.setLabel(`Last Checked: ${moment().toLocaleString()}`);
        screen.render();
      });
  });

updateEnvironmentStatuses();
setInterval(updateEnvironmentStatuses, 300000);

screen.key(['enter'], function(ch, key) {
  updateEnvironmentStatuses();
});

screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  return process.exit(0);
});