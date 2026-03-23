import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: "src",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@components": path.resolve(__dirname, "src/components"),
      "@primitives": path.resolve(__dirname, "src/primitives"),
    },
  },
  css: {
    preprocessorOptions: {
      less: {
        modifyVars: { "arcoblue-6": "#7c3aed" },
        javascriptEnabled: true,
      },
    },
  },
  build: {
    outDir: "../static/dist",
    emptyOutDir: true,
  },
  server: {
    proxy: { "/chat": "http://localhost:8000" },
  },
});
