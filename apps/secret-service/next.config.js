/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@helloworld/ui"],
  serverExternalPackages: ['@google-cloud/secret-manager', 'google-gax', '@grpc/grpc-js'],
  async headers() {
    return [
      {
        // Add CORS headers to all routes
        source: "/(.*)",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*", // Consider restricting this in production
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig; 