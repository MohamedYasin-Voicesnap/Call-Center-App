const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: (config) => {
      config.resolve.fallback = {
        process: require.resolve('process/browser.js'),
      };

      config.resolve.extensions.push('.mjs');

      config.module.rules.push({
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto',
      });

      config.plugins.push(
        new webpack.ProvidePlugin({
          process: 'process/browser',
        })
      );

      return config;
    },
  },
};
