const blessed = require('blessed');
const figlet = require('figlet');
const moment = require('moment');
const uuid = require("uuid").v4;

const sqliteDateTimeFormat = 'yyyy-MM-dd HH:mm:ss';
const createTable = (db) => db.run(
  `CREATE TABLE IF NOT EXISTS Outages 
  (
    id VARCHAR(36) PRIMARY KEY,
    environment VARCHAR(50),
    outageBegan DATETIME,
    outageEnded DATETIME,
    reason VARCHAR(255)
  )`
);

const persistOutage = (db, outage) => {
  db.run(
    `INSERT INTO Outages (id, environment, outageBegan, reason)
     VALUES (
       '${outage.id}',
       '${outage.environment}',
       '${outage.format(sqliteDateTimeFormat)}',
       '${outage.reason}'
      )`
  );
};

const persistResolveOutage = (db, outage) => {
  db.run(
    `UPDATE Outages
     SET outageEnded='${outage.outageEnded.format(sqliteDateTimeFormat)}'
     WHERE id='${outage.id}'`
  );
}

const goodColor = 'green';
const maybeColor = 'grey';
const badColor = 'red';
const figletStyleBanner = {
  font: 'Colossal'
};
const figletStyleLastHealthy = {
  font: 'Short'
};

const getTimeSinceHealthyBanner = (outageStartMoment) => figlet.textSync(`${outageStartMoment.fromNow()}`, figletStyleLastHealthy);

const calculateDimensions = (viewWidthPercent, viewHeightPercent, widgetWidthWeight) => {
  if (isNaN(viewWidthPercent) || isNaN(viewHeightPercent)) throw "view size percents must be a number!";
  return { width: `${viewWidthPercent * widgetWidthWeight}%`, height: `${viewHeightPercent}%`};
};

const createCurrentStatusView = (dimensionsObject, name) => blessed.text({
  width: dimensionsObject.width,
  height: dimensionsObject.height,
  content: figlet.textSync(name, figletStyleBanner),
  label: "Loading...",
  style: {
    fg: 'white',
    bg: maybeColor
  },
  border: {
    type: 'line'
  },
});

const createOutagesView = (dimensionsObject, name) => blessed.text({
  width: dimensionsObject.width,
  height: dimensionsObject.height,
  label: `${name} outages`,
  content: "",
  border: {
    type: 'line'
  },
});

const createOutage = (instance, reason) => {
  const newOutage = {
    id: uuid(),
    outageBegan: moment(),
    reason
  }
  instance.currentOutageId = newOutage.id;
  instance.outages.push(newOutage);
};

const getCurrentOutage = (instance) => instance.outages.find(outage => outage.id === instance.currentOutageId);

const markOutageResolved = (instance) => {
  const currentOutage = getCurrentOutage(instance)
  currentOutage.outageEnded = moment();
  persistResolveOutage(instance.db, currentOutage);
  delete instance.currentOutageId;
}

const updateActionFactory = (instance, url) => async () => {
  try {
    var response = await instance.axios.get(url);
    if (instance.currentOutageId) {
      markOutageResolved(instance);
    }
    updateCurrentStatusView(instance, response.status);
    updateOutageView(instance);
  }
  catch(error) {
    const currentOutage = getCurrentOutage(instance);
    if (currentOutage && error.message !== currentOutage.reason) {
      markOutageResolved(instance);
      createOutage(instance, error.message);
    }
    else if (!currentOutage) {
      createOutage(instance, error.message);
    }
    updateCurrentStatusView(instance, error.message);
    updateOutageView(instance);
  }
}

const updateCurrentStatusView = (instance, status) => {
  const view = instance.currentStatusView;
  if (instance.currentOutageId) {
    view.style = { ...view.style, bg: badColor };
    view.setContent(`${instance.banner}\n\n${getTimeSinceHealthyBanner(getCurrentOutage(instance).outageBegan)}`);
    view.setLabel(`Last Checked: ${moment().format("lll")} - Result: ${status}`);
  }
  else {
    view.style = { ...view.style, bg: goodColor };
    view.setContent(`${instance.banner}`);
    view.setLabel(`Last Checked: ${moment().format("lll")} - Result: ${status}`);
  }
  instance.screen.render();
}

const updateOutageView = (instance) => {
  const view = instance.outagesView;
  view.setContent(
      [...instance.outages].reverse().map(outage =>
        `From: ${outage.outageBegan.format("lll")}\n To:   ${outage.outageEnded ? outage.outageEnded.format("lll") : "Ongoing"}\n${outage.reason}`)
      .join("\n")
    );
  instance.screen.render();
}

const environmentTrackerFactory = (axios, screen, db, name, url, viewWidthPercent, viewHeightPercent) => {
  createTable(db);
  const currentStatusViewWeight = .67;
  const currentStatusViewDimensions = calculateDimensions(viewWidthPercent, viewHeightPercent, currentStatusViewWeight);
  const outagesViewDimensions = calculateDimensions(viewWidthPercent, viewHeightPercent, 1 - currentStatusViewWeight);
  const instance = {
    axios: axios,
    screen,
    db,
    name,
    url,
    outages: [],
    banner: figlet.textSync(name, figletStyleBanner),
    currentStatusView: createCurrentStatusView(currentStatusViewDimensions, name),
    outagesView: createOutagesView(outagesViewDimensions, name)
  };

  const views = [ instance.currentStatusView, instance.outagesView ];

  return { views, updateAction: updateActionFactory(instance, url) };
};

module.exports = environmentTrackerFactory;