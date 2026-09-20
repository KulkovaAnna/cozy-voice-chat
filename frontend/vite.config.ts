import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react({ jsxImportSource: "@emotion/react" })],
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
