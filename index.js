require('dotenv').config();
const blessed = require('blessed');
const axios = require('axios').create({
  timeout: 10000,
});
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";


const trimetAppId = process.env.TRIMET_APP_ID;
const trimetStopIds = process.env.TRIMET_STOP_IDS;
const trimetUrl = `https://developer.trimet.org/ws/v2/arrivals?locIDs=${trimetStopIds}&appID=${trimetAppId}`

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

const arrivalsBox = blessed.text({
  parent: layout,
  width: '50%',
  height: '50%',
  label: "Arrivals",
  content: "",
  border: {
    type: 'line'
  },
});


const environmentTracker = require("./widgets/environmentTracker")(screen);
environmentTracker.views.forEach(view => layout.append(view));

layout.append(arrivalsBox);
screen.render();

const updateArrivals = () => {
  arrivalsBox.setContent('Loading...');
  screen.render();
  axios.get(trimetUrl)
    .then(response => {
      const now = Date.now();
      const arrivals = response.data.resultSet.arrival.map(arrival => {
        const time = ((arrival[arrival.status] - now) / (1000 * 60)).toFixed();
        const s = time == 1 ? '' : 's';
        return `${arrival.shortSign}: ${time} minute${s}`;
      });
      arrivalsBox.setContent(arrivals.join('\n'));
      screen.render();
    })
    .catch(error => {
      arrivalsBox.setContent('Error retrieving Trimet data!');
      screen.render();
    });
};

environmentTracker.updateAction();
updateArrivals();
setInterval(environmentTracker.updateAction, 300000);
setInterval(updateArrivals, 60000);

screen.key(['enter'], function(ch, key) {
  environmentTracker.updateAction();
  updateArrivals();
});

screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  return process.exit(0);
});