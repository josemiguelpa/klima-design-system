// Applies a tenant white-label theme from the packed tokens, themes and theme-runtime tarballs (TASK-018).
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";
import { beforeAll, describe, expect, it } from "vitest";
import { parseStylesheets, resolveCustomProperties } from "./cascade.js";

const fixtureRoot = fileURLToPath(new URL("..", import.meta.url));
const packagesRoot = fileURLToPath(new URL("../../../packages", import.meta.url));
const TENANT = {
  primaryColor: "#2244a8",
  darkPrimaryColor: "#6b8fe8",
  secondaryColor: "#1c7b5f",
  darkSecondaryColor: "#87e2c9",
};

function run(command, args, cwd) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });
}

/** Packs a workspace package (prepack rebuilds it when defined) into the app's node_modules. */
function install(app, name) {
  const before = new Set(readdirSync(app));
  run("pnpm", ["pack", "--pack-destination", app], join(packagesRoot, name));
  const tarball = readdirSync(app).find((file) => file.endsWith(".tgz") && !before.has(file));
  const packageDir = join("node_modules", "@klima-ds", name);
  mkdirSync(join(app, packageDir), { recursive: true });
  // Relative paths keep bsdtar (Windows) and GNU tar (Linux) from misreading drive letters.
  run("tar", ["-xzf", tarball, "-C", packageDir, "--strip-components=1"], app);
  return join(app, packageDir);
}

let app;
let sheets;
let whiteLabelCss;
let runtime;
let paths;

beforeAll(async () => {
  app = mkdtempSync(join(tmpdir(), "klima-white-label-app-"));
  const tokensDir = install(app, "tokens");
  const themesDir = install(app, "themes");
  const runtimeDir = install(app, "theme-runtime");
  cpSync(join(fixtureRoot, "index.html"), join(app, "index.html"));
  cpSync(join(fixtureRoot, "src"), join(app, "src"), { recursive: true });
  runtime = await import(pathToFileURL(join(runtimeDir, "dist", "index.js")).href);
  const result = runtime.createWhiteLabelTheme(TENANT);
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  whiteLabelCss = runtime.serializeWhiteLabelTheme(result.theme);
  sheets = {
    tokens: readFileSync(join(tokensDir, "dist", "tokens.css"), "utf8"),
    sole: readFileSync(join(themesDir, "dist", "sole.css"), "utf8"),
    whiteLabel: whiteLabelCss,
  };
  ({ cssVariables: paths } = await import(pathToFileURL(join(tokensDir, "dist", "index.js")).href));
});

function resolved(order, attributes) {
  const properties = resolveCustomProperties(
    parseStylesheets(...order.map((name) => sheets[name])),
    attributes,
  );
  return Object.fromEntries(
    Object.entries(paths).map(([path, variable]) => [path, properties.get(variable)]),
  );
}

const orders = [
  ["tokens", "sole", "whiteLabel"],
  ["tokens", "whiteLabel", "sole"],
  ["sole", "tokens", "whiteLabel"],
  ["sole", "whiteLabel", "tokens"],
  ["whiteLabel", "tokens", "sole"],
  ["whiteLabel", "sole", "tokens"],
];

describe("white-label theme from the packed packages", () => {
  it.each([
    ["neutral", "light", {}],
    ["neutral", "dark", { "data-theme": "dark" }],
    ["Solé", "light", { "data-brand": "sole", "data-theme": "light" }],
    ["Solé", "dark", { "data-brand": "sole", "data-theme": "dark" }],
  ])("replaces only the actions over the %s theme in %s mode", (_brand, mode, attributes) => {
    const base = resolved(["tokens", "sole"], attributes);
    const overrides = runtime.createWhiteLabelTheme(TENANT).theme[mode];
    const expected = {
      ...base,
      ...overrides,
      // Component tokens alias the primary action, so they follow the tenant too.
      "button.primary.background.default": overrides["color.action.primary.default"],
    };
    for (const order of orders)
      expect(resolved(order, { ...attributes, "data-white-label": "" }), order.join(" > ")).toEqual(
        expected,
      );
  });

  it("stays inactive without the data-white-label attribute", () => {
    for (const attributes of [{ "data-theme": "dark" }, { "data-brand": "sole" }])
      expect(resolved(["tokens", "sole", "whiteLabel"], attributes)).toEqual(
        resolved(["tokens", "sole"], attributes),
      );
  });

  it("serializes deterministically from the packed runtime", () => {
    const again = runtime.serializeWhiteLabelTheme(runtime.createWhiteLabelTheme(TENANT).theme);
    expect(again).toBe(whiteLabelCss);
  });

  it("builds the visual fixture without redefining Klima variables", async () => {
    const result = await build({
      root: app,
      configFile: false,
      logLevel: "silent",
      build: { write: false, minify: false },
    });
    const output = (Array.isArray(result) ? result : [result]).flatMap((entry) => entry.output);
    const js = output.map((file) => file.code ?? "").join("\n");
    expect(js).toContain("data-white-label");
    const appCss = readFileSync(join(fixtureRoot, "src", "app.css"), "utf8");
    expect(appCss).not.toMatch(/--klima-[a-z0-9-]+\s*:/);
  });
});
