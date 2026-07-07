// @ts-check
import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import { reactRefresh } from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default defineConfig(
  globalIgnores(["build/", ".react-router/", "node_modules/"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite(),
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Route modules (React Router Framework Mode) legitimately export
    // loader/clientLoader/action/clientAction/meta/links/ErrorBoundary
    // alongside the default component per framework convention — not
    // incidental constant/function sharing that would break Fast Refresh.
    files: ["app/root.tsx", "app/routes/**/*.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
      "no-empty-pattern": "off",
    },
  },
);
