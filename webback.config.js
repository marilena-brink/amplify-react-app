const NodePolyfillPlugin = require("node-polyfill-webpack-plugin"); // Importieren Sie das node-polyfill-webpack-plugin

module.exports = {
  // Ihre anderen webpack-Optionen hier
  resolve: {
    fallback: {
      http: false, // Fügen Sie einen Fallback für das http-Modul hinzu
      fs: false,
      tls: false,
      net: false,
      path: false,
      https: false,
      stream: false,
      child_process: false,
      crypto: false,
    },
  },
  plugins: [
    new NodePolyfillPlugin(), // Fügen Sie das node-polyfill-webpack-plugin zu Ihren Plugins hinzu
  ],
};
