const blessed = require('blessed');
const ip = require("ip").address();

const state = {};

const ipBox = blessed.text({
  width: '100%',
  label: "texty-board",
  content: `${ip}\n\n`, // lazily line everything up
  border: {
    type: 'line'
  },
});

const ipWidgetFactory = screen => {
  state.screen = screen;
  return {
    view: ipBox,
    updateAction: () => {}
  }
};

module.exports = ipWidgetFactory;