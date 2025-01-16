// config-overrides.js
const { addWebpackPlugin } = require('customize-cra');
const WorkboxPlugin = require('workbox-webpack-plugin');

module.exports = function override(config, env) {
  // Add the Workbox plugin to generate the service worker
  config = addWebpackPlugin(
    new WorkboxPlugin.GenerateSW({
      clientsClaim: true,
      skipWaiting: true,
      maximumFileSizeToCacheInBytes: 8 * 1024 * 1024, // 8MB limit
      runtimeCaching: [
        {
          urlPattern: /^https?.*/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'taskngo-cache',
            expiration: {
              maxEntries: 200,
              maxAgeSeconds: 60 * 60 * 24, // 1 day
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
        {
          // Cache for static assets
          urlPattern: /\.(?:js|css|png|jpg|jpeg|svg|gif)$/,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'static-resources',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 24 * 60 * 60 // 24 hours
            }
          }
        },
        {
          // Cache for OneSignal resources
          urlPattern: new RegExp('^https://cdn.onesignal.com/'),
          handler: 'CacheFirst',
          options: {
            cacheName: 'onesignal-resources',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days
            }
          }
        }
      ],
      exclude: [
        /\.map$/,
        /asset-manifest\.json$/,
        /LICENSE/,
        /\.js\.map$/,
        /\.css\.map/,
      ],
    })
  )(config);

  return config;
};