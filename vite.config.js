import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Optional: proxy /api to your backend during `npm run dev` so the
    // browser can call fetch('/api/...') without CORS issues. Point
    // `target` at wherever your real API is running, then you can leave
    // VITE_API_BASE_URL as "/api" in .env.
    proxy: {
      "/api": {
        target: process.env.VITE_DEV_API_PROXY_TARGET || "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
