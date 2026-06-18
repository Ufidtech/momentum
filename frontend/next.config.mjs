/** @type {import('next').NextConfig} */
const nextConfig = {
  // Override Webpack to support Transformers.js in the browser
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    // Force Webpack to ignore the Node version of ONNX
    config.resolve.alias = {
      ...config.resolve.alias,
      "onnxruntime-node$": false,
    }
    return config;
  },
};

export default nextConfig; // (Use module.exports = nextConfig; if your file ends in .js instead of .mjs)