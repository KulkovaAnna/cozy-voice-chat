import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react({ jsxImportSource: "@emotion/react" })],
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
