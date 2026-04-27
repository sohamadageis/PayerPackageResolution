import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];

export default defineConfig({
  base: repositoryName ? `/${repositoryName}/` : "/",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/process-insurance": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/status": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
