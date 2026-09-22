// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

/**
 * Shared Klima Design System ESLint base config (flat config format).
 *
 * ESLint is responsible for linting (correctness, best practices) only.
 * Formatting is delegated entirely to Prettier via `eslint-config-prettier`,
 * which disables every ESLint rule that would conflict with it. Do not add
 * stylistic/formatting rules to this config.
 *
 * Consumers compose this array in their own `eslint.config.js`:
 *
 * ```js
 * import klimaConfig from '@klima-ds/eslint-config';
 *
 * export default [
 *   ...klimaConfig,
 *   { ignores: ['dist/**'] },
 * ];
 * ```
 */
const config = tseslint.config(
  {
    ignores: ["**/dist/**", "**/build/**", "**/*.tsbuildinfo", "**/coverage/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
);

export default config;
