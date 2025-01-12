const { override, addWebpackPlugin } = require('customize-cra');
const WorkboxPlugin = require('workbox-webpack-plugin');

module.exports = override((config) => {
  // Remove the default service worker plugin
  config.plugins = config.plugins.filter(
    plugin => plugin.constructor.name !== 'GenerateSW'
  );

  // Add optimization for bundle size
  if (process.env.NODE_ENV === 'production') {
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        minSize: 0
      }
    };
  }

  return config;
});