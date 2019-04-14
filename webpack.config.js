const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

const assets = {
  entry: {
    index: path.resolve(__dirname, 'src/pages/index.js'),
    restaurant: path.resolve(__dirname, 'src/pages/restaurant.js'),
  },
  output: {
    path: path.resolve(__dirname, 'public/assets/'),
    publicPath: '/assets/',
    filename: '[name].bundle.js',
  },
  mode: process.env.NODE_ENV || 'development',
  devServer: {
    contentBase: path.join(__dirname, 'public'),
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: ['babel-loader'],
      },
      {
        test: /\.(css|scss)$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: ['css-loader', 'sass-loader'],
        }),
      },
      {
        test: /\.(jpg|jpeg|png|gif|mp3|svg)$/,
        loaders: ['file-loader'],
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(['public/assets/*', 'public/sw.js*']),
    new ExtractTextPlugin('[name].min.css'),
  ],
};

const serviceworkers = {
  entry: path.resolve(__dirname, 'src/serviceworkers/sw.js'),
  output: {
    path: path.resolve(__dirname, 'public/'),
    publicPath: '/',
    filename: 'sw.js',
  },
  mode: process.env.NODE_ENV || 'development',
  devtool: 'source-map',
  devServer: {
    contentBase: path.join(__dirname, 'public'),
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: ['babel-loader'],
      },
    ],
  },
};

module.exports = [assets, serviceworkers];
