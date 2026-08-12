import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    exclude: ["node_modules", "dist"],
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
      include: ["src/**/*.ts"],
      // Config, generated SQL and process entrypoints have nothing to assert.
      exclude: [
        "src/db/schema/**",
        "src/db/seed.ts",
        "src/config/**",
        "src/types/**",
        "src/server.ts",
        "src/worker.ts",
      ],
    },
  },
});
