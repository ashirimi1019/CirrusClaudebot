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
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
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

    // Skill files live at ../src/ (outside frontend/).  When webpack follows
    // their imports (axios, @supabase/supabase-js, etc.) it walks UP from
    // ../src/lib/clients/ and never reaches frontend/node_modules because
    // that directory is a SIBLING, not a parent.
    // Explicitly adding it here makes webpack find those packages even when
    // the root node_modules/ doesn't exist (Vercel only installs frontend/).
    config.resolve.modules = [
      ...(config.resolve.modules ?? ["node_modules"]),
      path.resolve(__dirname, "node_modules"),
    ];

    return config;
  },
};

export default nextConfig;
