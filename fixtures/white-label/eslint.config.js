import klimaConfig from "@klima-ds/eslint-config";

const nodeGlobals = {
  console: "readonly",
  process: "readonly",
  URL: "readonly",
};
const browserGlobals = { document: "readonly" };

export default [
  ...klimaConfig,
  { files: ["**/*.{js,mjs}"], languageOptions: { globals: nodeGlobals } },
  { files: ["src/**/*.js"], languageOptions: { globals: browserGlobals } },
];
