import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: { ...globals.node }
    },
    files: ["plugins/**/*.js", ".opencode/plugins/**/*.js"],
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-undef": "error"
    }
  },
  { ignores: ["node_modules/**", ".opencode/node_modules/**"] }
];
