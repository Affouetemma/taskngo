import { addWebpackPlugin } from 'customize-cra';
import WorkboxPlugin from 'workbox-webpack-plugin';

export default function override(config, env) {
  // Add the Workbox plugin to generate the service worker
  config = addWebpackPlugin(
    new WorkboxPlugin.GenerateSW({
      clientsClaim: true,
      skipWaiting: true,
      maximumFileSizeToCacheInBytes: 8 * 1024 * 1024, // 8MB limit
      runtimeCaching: [
        {
          // Cache for API requests
          urlPattern: /^\/api\//,
          handler: 'NetworkOnly', // Ensures live responses for API calls
          options: {
            cacheName: 'api-cache',
          },
        },
        {
          // Cache for dynamic content (e.g., HTML)
          urlPattern: /^https?.*/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'dynamic-content',
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
            cacheName: 'static-assets',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 24 * 60 * 60, // 24 hours
            },
          },
        },
        {
          // Cache for OneSignal resources
          urlPattern: new RegExp('^https://cdn.onesignal.com/'),
          handler: 'CacheFirst',
          options: {
            cacheName: 'onesignal-resources',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
            },
          },
        },
      ],
      exclude: [
        /\.map$/,
        /asset-manifest\.json$/,
        /LICENSE/,
        /\.js\.map$/,
        /\.css\.map/,
      ],
      navigateFallback: '/index.html', // Fallback for navigation requests
      navigateFallbackDenylist: [/^\/api\//], // Ensure API requests aren't served index.html
    })
  )(config);

  return config;
}
