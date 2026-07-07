/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    config.module.rules.push({
      test: /\.glsl$/i,
      type: "asset/source",
    });
    return config;
  },
};

module.exports = nextConfig;
