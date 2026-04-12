import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensures Next/Turbopack treats `web/` as the workspace root.
  // This avoids confusion when the repo has multiple lockfiles.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
