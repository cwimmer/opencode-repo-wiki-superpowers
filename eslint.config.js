export default [
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        // Node.js + Bun globals actually used by plugins/
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        // Bun test globals used in plugins/*.test.js
        describe: "readonly",
        test: "readonly",
        expect: "readonly"
      }
    },
    files: ["plugins/**/*.js", ".opencode/plugins/**/*.js"],
    rules: {
      // Curated subset of eslint:recommended (flat config). Bug-finders
      // only; no stylistic rules. @eslint/js intentionally not imported
      // so the hook stays hermetic — this file is plain ESM and runs from
      // ESLint's built-in rule engine.
      "no-undef": "error",
      // warn (not error): allow stubbed-out args without blocking commits.
      // A `_`-prefix opt-out pattern is not enforced — the dev can delete the
      // line if it's unused.
      "no-unused-vars": "warn",
      "no-unreachable": "error",
      "no-dupe-args": "error",
      "no-dupe-keys": "error",
      "no-dupe-class-members": "error",
      "no-const-assign": "error",
      "no-class-assign": "error",
      "no-func-assign": "error",
      "no-import-assign": "error",
      "no-this-before-super": "error",
      "no-new-symbol": "error",
      "no-obj-calls": "error",
      "no-self-assign": "error",
      "no-setter-return": "error",
      "constructor-super": "error",
      "no-empty-pattern": "error",
      "no-debugger": "error",
      "no-with": "error"
    }
  },
  { ignores: ["node_modules/**", ".opencode/node_modules/**"] }
];
