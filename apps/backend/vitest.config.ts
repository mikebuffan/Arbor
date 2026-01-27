import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["lib/**/__tests__/**/*.test.ts"],
    clearMocks: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname), // so "@/lib/..." resolves to apps/backend/lib/...
    },
  },
});
