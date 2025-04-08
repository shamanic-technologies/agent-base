/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@helloworld/ui"],
  serverExternalPackages: ['@google-cloud/secret-manager', 'google-gax', '@grpc/grpc-js'],
  // Removed async headers() function to block all cross-origin browser requests
};

module.exports = nextConfig; 