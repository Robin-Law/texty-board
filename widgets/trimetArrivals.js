const blessed = require('blessed');
const axios = require('axios');

const trimetAppId = process.env.TRIMET_APP_ID;
const trimetStopIds = process.env.TRIMET_STOP_IDS;
const trimetUrl = `https://developer.trimet.org/ws/v2/arrivals?locIDs=${trimetStopIds}&appID=${trimetAppId}`;

const state = {};

const arrivalsBox = blessed.text({
  width: '50%',
  height: '50%',
  label: "Arrivals",
  content: "",
  border: {
    type: 'line'
  },
});

const updateArrivals = () => {
  arrivalsBox.setContent('Loading...');
  state.screen.render();
  axios.get(trimetUrl)
    .then(response => {
      const now = Date.now();
      const arrivals = response.data.resultSet.arrival.map(arrival => {
        const time = ((arrival[arrival.status] - now) / (1000 * 60)).toFixed();
        const s = time == 1 ? '' : 's';
        return `${arrival.shortSign}: ${time} minute${s}`;
      });
      arrivalsBox.setContent(arrivals.join('\n'));
      state.screen.render();
    })
    .catch(error => {
      arrivalsBox.setContent('Error retrieving Trimet data!');
      state.screen.render();
    });
};

const trimetArrivalsFactory = (screen) => {
  state.screen = screen;
  return { view: arrivalsBox, updateAction: updateArrivals };
};

module.exports = trimetArrivalsFactory;