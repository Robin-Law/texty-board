const blessed = require('blessed');
const figlet = require('figlet');
const moment = require('moment');
const uuid = require("uuid").v4;
const adapterFactory = require("../adapters/environmentTrackerSqliteAdapter");

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
    environment: instance.name,
    outageBegan: moment(),
    reason
  }
  instance.currentOutageId = newOutage.id;
  instance.sqlAdapter.persistOutage(newOutage);
  instance.outages.push(newOutage);
};

const getCurrentOutage = (instance) => instance.outages.find(outage => outage.id === instance.currentOutageId);

const markOutageResolved = (instance) => {
  const currentOutage = getCurrentOutage(instance)
  currentOutage.outageEnded = moment();
  instance.sqlAdapter.persistResolveOutage(currentOutage);
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

const getOutageRowHtml = outage => `
  <tr>
    <td>${outage.id}</td>
    <td>${outage.environment}</td>
    <td>${outage.outageBegan.format("lll")}</td>
    <td>${outage.outageEnded ? outage.outageEnded.format("lll") : ''}</td>
    <td>${outage.reason}</td>
  </tr>
`;

const registerEndpoints = (expressInstance, instance) => {
  // TODO: Uhhh... this didn't work out how I initially planned. Rethink this...
  expressInstance.get(`/outages/${instance.name}`, (req, res) => {
    res.send(instance.outages);
  });
  expressInstance.get(`/outages/${instance.name}/table`, (req, res) => {
    // TODO: Hahahaha, this is such shit. Let's wire up a real view engine...
    res.type('text/html').send(
      `<html><body>
      <style type="text/css">
        table, th, tr, td {
          border: solid 1px grey;
          padding: .3rem;
          font-family: "Comic Sans MS", sans-serif;
        }
      </style>
      <table>
        <thead>
          <tr>
            <th>Outage ID</th>
            <th>Environment</th>
            <th>Outage Began</th>
            <th>Outage Ended</th>
            <th>Error Message</th>
          </tr>
        </thead>
        <tbody>
          ${[...instance.outages].reverse().map(getOutageRowHtml).join('\n')}
        </tbody>
      </table>
      </body></html>`
    );
  });
};

const environmentTrackerFactory = (axios, screen, db, expressInstance, name, url, viewWidthPercent, viewHeightPercent) => {
  const sqlAdapter = adapterFactory(db);
  sqlAdapter.createTable();
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
    outagesView: createOutagesView(outagesViewDimensions, name),
    sqlAdapter: sqlAdapter
  };

  // TODO: Race condition: If the first state check returns before the outages load, the currentOutage will fall out of sync
  sqlAdapter.loadOutages(instance);

  registerEndpoints(expressInstance, instance);

  const views = [ instance.currentStatusView, instance.outagesView ];

  return { views, updateAction: updateActionFactory(instance, url) };
};

module.exports = environmentTrackerFactory;