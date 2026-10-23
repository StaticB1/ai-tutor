import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node" },
      },
      {
        // Calls the real models. Needs TUTOR_API_KEY; run with `npm run eval`.
        extends: true,
        test: { name: "live", include: ["tests/live/**/*.test.ts"], environment: "node", testTimeout: 600_000 },
      },
    ],
  },
});
