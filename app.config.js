const appJson = require('./app.json');

module.exports = {
  ...appJson.expo,
  extra: {
    ...(appJson.expo.extra || {}),
    eas: {
      ...(appJson.expo.extra?.eas || {}),
      projectId: 'af736931-a2cb-443f-a684-3a0662d6e381',
    },
  },
};
