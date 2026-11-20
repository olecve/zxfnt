import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import { createSlopConfig } from "eslint-plugin-slop";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  { ignores: ["dist/"] },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    rules: {
      // node:test awaits its own tests and reports their failures.
      "@typescript-eslint/no-floating-promises": [
        "error",
        { allowForKnownSafeCalls: [{ from: "package", package: "node:test", name: ["describe", "it"] }] },
      ],
    },
  },
  // The default inspection compares with git history, which the shallow CI checkout does not have.
  createSlopConfig({ cwd: import.meta.dirname, inspection: "full" }),
  // Plain JavaScript files, such as this config, are not in tsconfig.json.
  { files: ["**/*.js"], extends: [tseslint.configs.disableTypeChecked] },
);
