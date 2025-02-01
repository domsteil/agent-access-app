const yaml = require('js-yaml');
const fs = require('fs');

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    experimental: {
      appDir: true,
    },
    webpack: (config) => {
      config.module.rules.push({
        test: /\.yaml$/,
        use: 'yaml-loader'
      })
      return config
    }
  }
  
  module.exports = nextConfig