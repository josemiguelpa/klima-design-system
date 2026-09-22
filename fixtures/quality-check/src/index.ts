/**
 * Trivial fixture module proving that this package correctly inherits
 * `@klima-ds/typescript-config` (via tsconfig.json) and
 * `@klima-ds/eslint-config` (via eslint.config.js).
 */
export function greet(name: string): string {
  return `Hello, ${name}!`;
}
