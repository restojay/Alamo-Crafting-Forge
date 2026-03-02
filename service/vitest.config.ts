import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@servicebot/core": resolve(__dirname, "../packages/core/src/index.ts"),
    },
  },
});
