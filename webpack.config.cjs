const path = require('path');

module.exports = {
  entry: './src/index.ts',
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        options: {
          configFile: 'tsconfig.webpack.json',
        },
        exclude: /node_modules/,
      },
    ],
  },
  // modules: [
  //   "...",
  //   path.resolve(__dirname, 'node_modules'), // Explicitly point to your project's node_modules
  //   'node_modules' // Fallback to default node_modules resolution
  // ],
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    extensionAlias: {
      ".js": [".ts"], // (!) wtf man ...
    },
    alias: {
      'uuid': path.resolve(__dirname, 'node_modules/uuid/dist/index')
    }
  },
  output: {
    filename: 'telefono.js',
    path: path.resolve(__dirname, 'dist/webpack'),
    library: {
      name: 'Telefono',
      type: 'umd',
      export: 'default',
    }
  },
};