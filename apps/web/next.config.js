/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow Next.js to transpile our workspace packages (they ship as .ts source).
  transpilePackages: ["@agent-boss/db", "@agent-boss/agents"],
  // Prisma client should be loaded at runtime, not bundled.
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
  // Map `.js` extensions in TypeScript ESM imports to actual `.ts` source files
  // (used by the agents runtime + blockchain libs that target Node ESM).
  webpack(config) {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
  // Image domains — only local for now.
  images: {
    remotePatterns: [],
  },
  // Don't surface Next.js version in headers.
  poweredByHeader: false,
};

module.exports = nextConfig;