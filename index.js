require('dotenv').config();
const blessed = require('blessed');
const axios = require('axios').create({
  timeout: 10000,
});

// Create a screen object.
const screen = blessed.screen({
  smartCSR: true,
});
const layout = blessed.layout({
  parent: screen,
  width: '100%',
  height: '100%'
});

const environmentTrackerWest =
  require("./widgets/environmentTracker")(axios, screen, process.env.ENV_ONE_NAME, process.env.ENV_ONE_STATUS_URL, 50, 50);
const environmentTrackerEast =
  require("./widgets/environmentTracker")(axios, screen, process.env.ENV_TWO_NAME, process.env.ENV_TWO_STATUS_URL, 50, 50);
environmentTrackerWest.views.forEach(view => layout.append(view));
environmentTrackerEast.views.forEach(view => layout.append(view));
const trimetArrivals = require("./widgets/trimetArrivals")(screen);
layout.append(trimetArrivals.view);
const clock = require("./widgets/clock")(screen);
layout.append(clock.view);

screen.render();

environmentTrackerWest.updateAction();
environmentTrackerEast.updateAction();
trimetArrivals.updateAction();
setInterval(environmentTrackerWest.updateAction, 300000);
setInterval(environmentTrackerEast.updateAction, 300000);
setInterval(trimetArrivals.updateAction, 60000);
setInterval(clock.updateAction, 5000);

screen.key(['enter'], function(ch, key) {
  environmentTrackerWest.updateAction();
  environmentTrackerEast.updateAction();
  trimetArrivals.updateAction();
});

screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  return process.exit(0);
});