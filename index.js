require('dotenv').config();
const blessed = require('blessed');
const axios = require('axios').create({
  timeout: 10000,
});
const sqlite = require("sqlite3");
const db = new sqlite.Database("./texty-board.db", (err) => console.log('sqlite3 init error: ', err));

const express = require('express')();
const expressPort = process.env.EXPRESS_PORT || 3456;

const screen = blessed.screen({
  smartCSR: true,
});
const layout = blessed.layout({
  parent: screen,
  width: '100%',
  height: '100%'
});

const environmentTrackerWest =
  require("./widgets/environmentTracker")(axios, screen, db, express, process.env.ENV_ONE_NAME, process.env.ENV_ONE_STATUS_URL, '50%', '50%');
const environmentTrackerEast =
  require("./widgets/environmentTracker")(axios, screen, db, express, process.env.ENV_TWO_NAME, process.env.ENV_TWO_STATUS_URL, '50%', '50%');
layout.append(environmentTrackerWest.view);
layout.append(environmentTrackerEast.view);

const trimetArrivals = require("./widgets/trimetArrivals")(screen);
layout.append(trimetArrivals.view);

const hackerNews = require("./widgets/hackerNews")(screen, "25%", "50%");
layout.append(hackerNews.view);

const smallWidgets = blessed.layout({
  parent: layout,
  width: '25%',
  height: '50%',
});

const weather = require("./widgets/weather")(screen);
smallWidgets.append(weather.view);
const clock = require("./widgets/clock")(screen);
smallWidgets.append(clock.view);
const ip = require("./widgets/ip")(screen);
smallWidgets.append(ip.view);

layout.append(smallWidgets);

screen.render();

environmentTrackerWest.updateAction();
environmentTrackerEast.updateAction();
trimetArrivals.updateAction();
weather.updateAction();
hackerNews.updateAction();

setInterval(environmentTrackerWest.updateAction, 300000);
setInterval(environmentTrackerEast.updateAction, 300000);
setInterval(trimetArrivals.updateAction, 60000);
setInterval(clock.updateAction, 5000);
setInterval(weather.updateAction, 60000);
setInterval(hackerNews.updateAction, 3600000);

screen.key(['enter'], function(ch, key) {
  environmentTrackerWest.updateAction();
  environmentTrackerEast.updateAction();
  trimetArrivals.updateAction();
  weather.updateAction();
  hackerNews.updateAction();
});

screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  db.close();
  return process.exit(0);
});

express.listen(expressPort);