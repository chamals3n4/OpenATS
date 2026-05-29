import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
