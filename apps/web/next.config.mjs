/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.DOCKER_BUILD === "1" ? "standalone" : undefined,
  // @hms/config is listed because the sidebar imports the permission rules
  // from it to decide which links to offer. A workspace package left out of
  // this list is not a build error — it fails when the page renders.
  transpilePackages: ["@hms/config", "@hms/types", "@hms/utils"],
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
  images: {
    remotePatterns: [
      { hostname: "*.amazonaws.com" },
      { hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
