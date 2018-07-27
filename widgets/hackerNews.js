const blessed = require('blessed');
const axios = require('axios');

const label = "Hacker news";
const hackerNewsViewFactory = (width, height) => blessed.text({
  left: 'center',
  width: width,
  height: height,
  label: label,
  content: "Loading News...",
  border: {
    type: 'line'
  },
});

const topStoriesUrl = 'https://hacker-news.firebaseio.com/v0/topstories.json';

const getTopStories = async (instance) => {
  try {
    const response = await axios.get(topStoriesUrl);
    const stories = response.data.slice(0, 19);
    Promise.all(stories.map(storyId => getHeadline(storyId)))
      .then(headlines => {
        instance.headlines = headlines.filter(headline => headline);
        instance.view.setContent(instance.headlines.join('\n-----\n'));
        instance.screen.render();
      });
  } catch(error) { }
}

const getHeadline = async (id) => {
  try {
    var response = await axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
    return response.data.title;
  } catch (error) { }
}

const updateAction = async (instance) => {
  getTopStories(instance);
};

const hackerNewsWidgetFactory = (screen, width, height) => {
  const instance = {
    screen,
    headlines: [],
    view: hackerNewsViewFactory(width, height)
  }
  return {
    view: instance.view,
    updateAction: updateAction.bind(null, instance)
   };
}

module.exports = hackerNewsWidgetFactory;