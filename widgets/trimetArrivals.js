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
  tags: true,
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
      const locations = response.data.resultSet.location.map(location => {
        const description = `{bold}${location.desc}{/} - ${location.dir}`;
        const arrivals = response.data.resultSet.arrival
          .filter(arrival => arrival.locid === location.id)
          .map(arrival => {
            const time = Math.abs(((arrival[arrival.status] - now) / (1000 * 60))).toFixed();
            const s = time == 1 ? '' : 's';
            let description = arrival.shortSign;
            const isMax = arrival.fullSign.match(/^MAX\s+(\S+)\s+Line/);
            if (isMax) {
              let colour = isMax[1].toLowerCase();
              if (colour == 'orange') colour = '#ffa500';
              description = `{${colour}-fg}${description}{/${colour}-fg}`;
            }
            description = `${description}: ${time} minute${s}`;
            if (arrival.status === 'scheduled') description += ' (scheduled)';
            return description;
          });
        return [description, ...arrivals].join('\n')
      });
      arrivalsBox.setContent(locations.join('\n\n'));
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