/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['axios', '@opentelemetry/api'],
  },
  reactStrictMode: true,
  transpilePackages: ["@helloworld/database-service", "@agent-base/api-client"],
  webpack: (config) => {
    // Handle native dependencies
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
    };
    return config;
  }
};

module.exports = nextConfig; 