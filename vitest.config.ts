import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    exclude: [
      "**/node_modules/**",
      "tests/**",
      "subsidiaries/**",
      ".worktrees/**",
      "packages/**/node_modules/**",
      "service/**/node_modules/**",
    ],
  },
});
