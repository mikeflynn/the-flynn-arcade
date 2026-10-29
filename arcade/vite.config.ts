import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  // "mpa" turns off Vite's single-page-app fallback, so a missing sound or
  // picture gets a real 404 instead of index.html. The game relies on that to
  // skip files that haven't been added yet.
  appType: "mpa",
  server: { port: 8000, strictPort: true },
  preview: { port: 8000, strictPort: true },
  test: { environment: "node", include: ["tests/**/*.test.ts"], passWithNoTests: true },
});
