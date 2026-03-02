import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@servicebot/core": path.resolve(__dirname, "../packages/core/src"),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
