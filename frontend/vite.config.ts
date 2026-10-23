import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import fs from "fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react({ jsxImportSource: "@emotion/react" }),
      VitePWA({
        // Стратегия generateSW: service worker генерируется workbox-build
        // по готовому спискуPrecache-файлов, свой sw-код не нужен.
        strategies: "generateSW",
        // Новая версия применяется сразу, без ожидания закрытия всех вкладок.
        registerType: "autoUpdate",
        // В dev-режиме (yarn dev) service worker не регистрируем: он мешает
        // hot reload и требует собранного dist.
        devOptions: { enabled: false },
        manifest: {
          name: "Cozy Voice Chat",
          short_name: "Cozy",
          description:
            "Локальный P2P голосовой чат для созвонов по локальной сети",
          lang: "ru",
          start_url: "/",
          scope: "/",
          display: "standalone",
          // Цвета взяты из theme/index.ts: primary.main и background.default
          // светлой темы — она дефолтная при первом запуске.
          theme_color: "#7B5FC6",
          background_color: "#f1f1f1",
          icons: [
            {
              src: "/icons/icon-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/icons/icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/icons/icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          // Precache только собственного origin: собранные JS/CSS/HTML,
          // шрифты и статика из public (иконки, звуки звонков, gif).
          // jpg нужен для default_ava.jpg из src/assets, иначе офлайн
          // аватар по умолчанию не отрисуется.
          globPatterns: [
            "**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff2,mp3,gif}",
          ],
          // Офлайн-шелл: любой navigation-запрос при недоступном сервере
          // отдаёт index.html, приложение стартует и показывает ошибку сети
          // вместо пустого экрана браузера.
          navigateFallback: "index.html",
          // Сигнализация, файлы и музыка живут на другом origin (:8080) и в
          // runtimeCaching не заносятся — их кэшировать нельзя.
        },
      }),
    ],
    build: {
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom", "react-router"],
            emotion: ["@emotion/react", "@emotion/styled"],
            peer: ["peerjs"],
            emoji: ["emoji-picker-react"],
            hooks: [
              "zustand",
              "react-hook-form",
              "react-modal",
              "react-toastify",
            ],
          },
        },
      },
    },
    resolve: {
      alias: {
        "@cvc": path.join(path.dirname(fileURLToPath(import.meta.url)), "src"),
      },
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
      https: {
        key: fs.readFileSync(env.SSL_KEY_PATH),
        cert: fs.readFileSync(env.SSL_CERT_PATH),
      },
    },
  };
});
