import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  build: {
    outDir: "assets/js",
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, "src/site/cms-bridge.ts"),
      name: "SmileMastersCMS",
      formats: ["iife"],
      fileName: () => "smile-masters-cms.js",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
