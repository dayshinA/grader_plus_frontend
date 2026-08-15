import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./app", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    // The version 1 archive under .claude/ is reference material, not live code.
    exclude: ["node_modules/**", "build/**", ".claude/**"],
    setupFiles: ["./vitest.setup.ts"],
    env: {
      VITE_API_BASE_URL: "http://localhost:3000",
    },
  },
});
