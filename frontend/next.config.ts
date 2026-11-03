import path from "node:path";
import type { NextConfig } from "next";

// The Docker image is built with NEXT_OUTPUT=standalone: a self-contained server with only the
// packages it uses. Traced from the workspace root, where pnpm keeps the packages.
const standalone = process.env.NEXT_OUTPUT === "standalone";

const nextConfig: NextConfig = {
  ...(standalone ? { output: "standalone" as const, outputFileTracingRoot: path.join(__dirname, "..") } : {}),
  // Bundle optimization — tree-shake these large package re-exports
  experimental: {
    optimizePackageImports: [
      "@hugeicons/react",
      "@hugeicons/core-free-icons",
      "lucide-react",
      "recharts",
      "date-fns",
      "@tiptap/react",
      "@tiptap/starter-kit",
      "react-pdf",
      "react-dnd",
      "react-dnd-html5-backend",
      "socket.io-client",
    ],
  },
  // Strip console.* in production (keep error/warn)
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
