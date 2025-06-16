/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@helloworld/database-service"],
};

module.exports = nextConfig; 