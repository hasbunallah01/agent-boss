/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@agent-boss/db"],
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
