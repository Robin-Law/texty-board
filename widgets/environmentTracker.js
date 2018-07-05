const blessed = require('blessed');
const figlet = require('figlet');
const moment = require('moment');
const uuid = require("uuid").v4;

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
  const outageId = uuid();
  instance.currentOutageId = outageId;
  instance.outages.push({
    id: outageId,
    outageBegan: moment(),
    reason
  });
};

const getCurrentOutage = (instance) => instance.outages.find(outage => outage.id === instance.currentOutageId);

const markOutageResolved = (instance) => {
  getCurrentOutage(instance).outageEnded = moment();
  delete instance.currentOutageId;
}

const updateActionFactory = (instance, url) => async () => {
  try {
    var response = await instance.axios.get(url);
    if (instance.currentOutageId) {
      markOutageResolved(instance);
    }
    // console.log(JSON.stringify({ currentOutageId: instance.currentOutageId, outages: instance.outages.map(outage => outage.id)}));
    updateCurrentStatusView(instance, response.status);
    updateOutageView(instance);
  }
  catch(error) {
    const currentOutage = getCurrentOutage(instance);
    if (!currentOutage) {
      createOutage(instance, error);
    }
    else if (currentOutage && error !== currentOutage.reason) {
      markOutageResolved(instance);
      createOutage(instance, error);
    }
    // console.log(JSON.stringify({ currentOutageId: instance.currentOutageId, outages: instance.outages.map(outage => outage.id)}));
    updateCurrentStatusView(instance, error);
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

const environmentTrackerFactory = (axios, screen, name, url, viewWidthPercent, viewHeightPercent) => {
  const currentStatusViewWeight = .67;
  const currentStatusViewDimensions = calculateDimensions(viewWidthPercent, viewHeightPercent, currentStatusViewWeight);
  const outagesViewDimensions = calculateDimensions(viewWidthPercent, viewHeightPercent, 1 - currentStatusViewWeight);
  const instance = {
    axios: axios,
    screen,
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