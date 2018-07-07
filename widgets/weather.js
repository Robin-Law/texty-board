const blessed = require('blessed');
const figlet = require('figlet');
const moment = require('moment');
const axios = require('axios');

const unitOptions = {
  standard: "standard",
  metric: "metric",
  imperial: "imperial"
}

const owmApiKey = process.env.OWM_API_KEY;
const location = process.env.OWM_LOCATION;
const unit = unitOptions[process.env.OWM_UNITS] || unitOptions.metric;

const formats = {
  standard: "standard",
  metric: "metric",
  imperial: "imperial"
}

const degreeSymbols = {
  standard: "°K",
  metric: "°C",
  imperial: "°F"
}

const figletStyleDegrees = {
  font: 'Big'
};
const figletStyleConditions = {
  font: 'Big'
};

const state = {};

const toCelsius = (degreesKelvin) => 0;
const toFahrenheit = (degreesCelsius) => 0;

const label = `${location.replace(',', ', ')} weather`;

const weatherBox = blessed.text({
  width: '90%',
  label: label,
  content: "Loading Weather...",
  border: {
    type: 'line'
  },
});

const updateWeather = async () => {
  try {
    var weatherResponse = (await axios.get(`http://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${owmApiKey}&units=${unit}`)).data;
    var temp = weatherResponse.main.temp;
    var conditions = weatherResponse.weather[0].main;
    weatherBox.setContent(
      `${figlet.textSync(`${Math.floor(temp)}${degreeSymbols[unit]}`, figletStyleDegrees)}\n${figlet.textSync(conditions, figletStyleConditions)}`);
  }
  catch(error) {
    weatherBox.setLabel(`${label} ${error.message}`);
  }
  state.screen.render();
};

const weatherWidgetFactory = screen => {
  state.screen = screen;
  return {
    view: weatherBox,
    updateAction: updateWeather
  }
};

module.exports = weatherWidgetFactory;