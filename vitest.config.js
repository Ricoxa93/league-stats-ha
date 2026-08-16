import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    setupFiles: ["frontend/test/setup.js"],
    restoreMocks: true,
  },
});
