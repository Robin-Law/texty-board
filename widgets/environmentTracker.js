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

const createEnvironmentTrackerView = (width, height, name) => blessed.layout({
  width: width,
  height: height,
});

const createCurrentStatusView = (layout, name) => blessed.text({
  width: '60%',
  height: '100%',
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

const createOutagesView = (layout, name) => blessed.text({
  width: '40%',
  height: '100%',
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
        body {
          font-family: "Comic Sans MS", sans-serif;
        }
        table, th, tr, td {
          border: solid 1px grey;
          padding: .3rem;
        }
      </style>
      <h1>Current Status: ${instance.currentOutageId ?
        "<span style='color:red'>Offline</span>" :
        "<span style='color:green'>Online</span>"}</h1>
      <h1>Outages</h1>
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
  const view = createEnvironmentTrackerView(viewWidthPercent, viewHeightPercent, name);
  const currentStatusView = createCurrentStatusView(view, name);
  const outagesView = createOutagesView(view, name);
  view.append(currentStatusView);
  view.append(outagesView);
  const instance = {
    axios: axios,
    screen,
    db,
    name,
    url,
    outages: [],
    banner: figlet.textSync(name, figletStyleBanner),
    view: view,
    currentStatusView: currentStatusView,
    outagesView: outagesView,
    sqlAdapter: sqlAdapter
  };

  // TODO: Race condition: If the first state check returns before the outages load, the currentOutage will fall out of sync
  sqlAdapter.loadOutages(instance);

  registerEndpoints(expressInstance, instance);

  return { view, updateAction: updateActionFactory(instance, url) };
};

module.exports = environmentTrackerFactory;