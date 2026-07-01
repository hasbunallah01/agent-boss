/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "agent-boss-web.vercel.app" },
      { protocol: "https", hostname: "testnet.arcscan.app" },
    ],
  },
};

module.exports = nextConfig;