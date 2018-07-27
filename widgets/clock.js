const blessed = require('blessed');
const figlet = require('figlet');
const moment = require('moment');

const figletStyleMini = {
  font: 'Moscow'
};

const renderTime = timeText => figlet.textSync(moment().format('LT'));

const state = {};

const clockBox = blessed.text({
  width: '100%',
  label: "Now",
  content: renderTime(),
  border: {
    type: 'line'
  },
});

const updateClock = () => {
  clockBox.setContent(renderTime());
  state.screen.render();
};

const clockWidgetFactory = screen => {
  state.screen = screen;
  return {
    view: clockBox,
    updateAction: updateClock
  }
};

module.exports = clockWidgetFactory;