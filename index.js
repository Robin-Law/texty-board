require('dotenv').config();
const blessed = require('blessed');
const axios = require('axios').create({
  timeout: 10000,
});

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

const environmentTracker = require("./widgets/environmentTracker")(screen);
environmentTracker.views.forEach(view => layout.append(view));
const trimetArrivals = require("./widgets/trimetArrivals")(screen);
layout.append(trimetArrivals.view);
const clock = require("./widgets/clock")(screen);
layout.append(clock.view);

screen.render();

environmentTracker.updateAction();
trimetArrivals.updateAction();
setInterval(environmentTracker.updateAction, 300000);
setInterval(trimetArrivals.updateAction, 60000);
setInterval(clock.updateAction, 5000);

screen.key(['enter'], function(ch, key) {
  environmentTracker.updateAction();
  trimetArrivals.updateAction();
});

screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  return process.exit(0);
});