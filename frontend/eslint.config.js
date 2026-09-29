import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import js from "@eslint/js";
import boundaries from "eslint-plugin-boundaries";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

const rootPath = dirname(fileURLToPath(import.meta.url));

/**
 * Слои приложения и правило зависимостей:
 * app → pages → widgets → features → {components, providers} → hooks → api/utils/types/theme
 *
 * Импорт допускается только «вниз» по этому списку. Между срезами одного слоя
 * (pages/widgets/features) импорты запрещены — общение идёт через публичный API
 * среза (index.ts). Слой-агрегатор (index.ts) может реэкспортировать свои срезы.
 */
const LAYERS = {
  app: ["pages", "widgets", "features", "components", "providers", "hooks"],
  pages: ["widgets", "features", "components", "providers", "hooks"],
  widgets: ["features", "components", "providers", "hooks"],
  features: ["components", "providers", "hooks"],
  components: ["hooks"],
  providers: ["hooks"],
  hooks: [],
};

const BOTTOM_LAYERS = ["api", "utils", "types", "theme", "assets"];

const createPolicy = (from, to) => ({
  from: { element: { type: from } },
  allow: { to: { element: { type: to } } },
});

const layerPolicies = Object.entries(LAYERS).map(([from, to]) =>
  createPolicy(from, [...to, ...BOTTOM_LAYERS]),
);

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "boundaries/root-path": rootPath,
      // Точка входа лежит вне слоёв — для неё границы не проверяются.
      "boundaries/ignore": ["src/main.tsx"],
      // Публичный API среза/слоя — это его index.
      "boundaries/files": [
        { pattern: "**/index.{ts,tsx}", category: "public-api" },
      ],
      "boundaries/elements": [
        { type: "app", pattern: "src/app", partialMatch: false },
        {
          type: "pages",
          pattern: "src/pages/*",
          partialMatch: false,
          capture: ["slice"],
        },
        { type: "pages", pattern: "src/pages", partialMatch: false },
        {
          type: "widgets",
          pattern: "src/widgets/*",
          partialMatch: false,
          capture: ["slice"],
        },
        { type: "widgets", pattern: "src/widgets", partialMatch: false },
        {
          type: "features",
          pattern: "src/features/*",
          partialMatch: false,
          capture: ["slice"],
        },
        { type: "features", pattern: "src/features", partialMatch: false },
        { type: "components", pattern: "src/components", partialMatch: false },
        { type: "providers", pattern: "src/providers", partialMatch: false },
        { type: "hooks", pattern: "src/hooks", partialMatch: false },
        { type: "api", pattern: "src/api", partialMatch: false },
        { type: "utils", pattern: "src/utils", partialMatch: false },
        { type: "types", pattern: "src/types", partialMatch: false },
        { type: "theme", pattern: "src/theme", partialMatch: false },
        { type: "assets", pattern: "src/assets", partialMatch: false },
      ],
      "import/resolver": {
        alias: {
          map: [["@cvc", "./src"]],
          extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
        },
        node: {
          extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
        },
      },
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: [
            ...layerPolicies,
            // Нижние слои (api/utils/types/theme/assets) могут ссылаться друг на друга.
            createPolicy(BOTTOM_LAYERS, BOTTOM_LAYERS),
            // Баррели (index.ts) — публичный API слоя/среза: им можно реэкспорт из своего слоя.
            {
              from: { file: { categories: "public-api" } },
              allow: { to: { element: { type: "*" } } },
            },
          ],
        },
      ],
    },
  },
]);
