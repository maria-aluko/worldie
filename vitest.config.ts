import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// Pure-logic unit tests run in a Node environment with no DOM and no database.
// The scoring tests import only pure functions, so a run never touches Supabase.
export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
