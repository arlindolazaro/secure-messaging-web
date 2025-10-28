import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // 🔥 ADICIONE ESTA CONFIGURAÇÃO
  define: {
    global: "globalThis",
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "https://localhost:8443",
        changeOrigin: true,
        secure: false,
      },
      "/ws": {
        target: "https://localhost:8443",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});
