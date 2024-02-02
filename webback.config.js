const NodePolyfillPlugin = require("node-polyfill-webpack-plugin"); // Importieren Sie das node-polyfill-webpack-plugin

module.exports = {
  // Ihre anderen webpack-Optionen hier
  resolve: {
    fallback: {
      http: require.resolve("stream-http"), // Fügen Sie einen Fallback für das http-Modul hinzu
      fs: false,
      tls: false,
      net: false,
      path: false,
      zlib: false,
      http: false,
      https: false,
      stream: false,
      crypto: false,
    },
  },
  plugins: [
    new NodePolyfillPlugin(), // Fügen Sie das node-polyfill-webpack-plugin zu Ihren Plugins hinzu
  ],
};
