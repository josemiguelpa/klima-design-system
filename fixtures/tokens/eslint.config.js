import klimaConfig from "@klima-ds/eslint-config";

const nodeGlobals = {
  console: "readonly",
  fetch: "readonly",
  process: "readonly",
  setTimeout: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
};

export default [
  ...klimaConfig,
  { files: ["**/*.{js,mjs}"], languageOptions: { globals: nodeGlobals } },
];
