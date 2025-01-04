// config-overrides.js
const { addWebpackPlugin } = require('customize-cra');
const WorkboxPlugin = require('workbox-webpack-plugin');

module.exports = function override(config, env) {
  // Add the Workbox plugin to generate the service worker
  config = addWebpackPlugin(
    new WorkboxPlugin.GenerateSW({
      clientsClaim: true,
      skipWaiting: true,
      runtimeCaching: [{
        urlPattern: /^https?.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'my-cache',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24, // 1 day
          },
        },
      }],
    })
  )(config);

  return config;
};
