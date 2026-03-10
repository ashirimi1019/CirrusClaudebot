import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Include the entire monorepo root in the output file tracing so Vercel
  // bundles the skill files and their dependencies.
  outputFileTracingRoot: path.join(__dirname, ".."),

  // Include static assets that skills read at runtime (context/ markdowns).
  outputFileTracingIncludes: {
    "/api/skills/run": [
      "../context/**/*",
      "../src/core/skills/**/*",
      "../src/lib/**/*",
      "../src/brain/**/*",
    ],
  },

  // Don't attempt to bundle ts-node — it's only used locally.
  serverExternalPackages: ["ts-node"],

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },

  webpack(config) {
    // Alias @cirrus/skills/* and @cirrus/lib/* to the monorepo source so
    // dynamic imports in route.ts resolve correctly at build time.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@cirrus/skills": path.resolve(__dirname, "../src/core/skills"),
      "@cirrus/lib": path.resolve(__dirname, "../src/lib"),
    };
    return config;
  },
};

export default nextConfig;
