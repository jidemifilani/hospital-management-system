/**
 * NEXT_PUBLIC_API_URL has to be present when the bundle is built.
 *
 * It is compiled into the browser JavaScript, not read when the server
 * starts, so supplying it only at runtime leaves every browser calling
 * whatever was baked in — http://localhost:4000, an app that works on the
 * build machine and nowhere else.
 *
 * The API's Dockerfile already refuses a build without it, but that guard
 * only covers the container path. Vercel and anything else running
 * `next build` directly would sail past it, which is exactly where this is
 * easiest to forget, so the check belongs to the build rather than to one
 * Dockerfile.
 *
 * `next dev` is unaffected: the fallback to localhost is correct there, and
 * this only runs for a production build.
 */
if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_API_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_URL must be set when building: it is compiled into the " +
      "browser bundle. Set it to the public address of the API, e.g. " +
      "https://api.hms.example.ng",
  );
}

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
