import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // 청크 사이즈 경고 한계를 800kB로 상향 조정
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // 벤더 청크 분리로 초기 번들 크기 감소 및 캐싱 효율 향상
        manualChunks(id: string) {
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/")) {
            return "react-vendor";
          }
          if (id.includes("node_modules/react-router-dom") || id.includes("node_modules/react-router/")) {
            return "router-vendor";
          }
        },
      },
    },
  },
  // 미리 번들링 최적화 — 공통 모듈 사전 처리
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"],
  },
});
