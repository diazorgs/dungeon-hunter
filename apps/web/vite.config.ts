import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import babel from "@rolldown/plugin-babel";
import { defineConfig } from "vite-plus";
import { lazyPlugins } from "vite-plus";

// Lint rules live in the root vite.config.ts (`vp check` only reads the root block).
export default defineConfig({
  plugins: lazyPlugins(() => [react(), tailwindcss(), babel({ presets: [reactCompilerPreset()] })]),
  server: { port: 5173, proxy: { "/api": "http://localhost:8787" } },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
