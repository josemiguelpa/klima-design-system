// Activates the Solé theme from the packed @klima-ds/tokens and @klima-ds/themes tarballs (TASK-010).
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { beforeAll, describe, expect, it } from "vitest";
import { toggleTheme } from "../src/theme-toggle.js";
import { parseStylesheets, resolveCustomProperties } from "./cascade.js";

const fixtureRoot = fileURLToPath(new URL("..", import.meta.url));
const packagesRoot = fileURLToPath(new URL("../../../packages", import.meta.url));

function run(command, args, cwd) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });
}

/** Packs a workspace package (prepack rebuilds it) and extracts it into the app's node_modules. */
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
let tokensCss;
let soleCss;
let values;

beforeAll(async () => {
  app = mkdtempSync(join(tmpdir(), "klima-themes-app-"));
  const tokensDir = install(app, "tokens");
  const themesDir = install(app, "themes");
  cpSync(join(fixtureRoot, "index.html"), join(app, "index.html"));
  cpSync(join(fixtureRoot, "src"), join(app, "src"), { recursive: true });
  tokensCss = readFileSync(join(tokensDir, "dist", "tokens.css"), "utf8");
  soleCss = readFileSync(join(themesDir, "dist", "sole.css"), "utf8");
  ({ values } = await import(join(tokensDir, "dist", "index.js")));
});

/** Expected resolved value of every token for Solé in one mode. */
function expectedSole(mode) {
  const neutral = values[mode];
  const brand = (path) => neutral[path];
  const [fill, foreground] =
    mode === "light"
      ? ["brand.sole.indigo.400", "brand.sole.green.400"]
      : ["brand.sole.green.400", "brand.sole.indigo.400"];
  return {
    ...neutral,
    "font.family.base": brand("brand.sole.font.family.base"),
    "color.action.primary.default": brand(fill),
    "color.action.primary.hover": brand(fill),
    "color.action.primary.active": brand(fill),
    "color.action.primary.foreground": brand(foreground),
    // Component tokens alias semantics through var(), so they follow the brand too.
    "button.primary.background.default": brand(fill),
  };
}

function resolvedTokens(sheets, attributes) {
  const properties = resolveCustomProperties(parseStylesheets(...sheets), attributes);
  return Object.fromEntries(
    Object.keys(values.light).map((path) => [
      path,
      properties.get(`--klima-${path.replaceAll(".", "-")}`),
    ]),
  );
}

describe("Solé theme from the packed packages", () => {
  it.each([
    ["light", { "data-brand": "sole", "data-theme": "light" }],
    ["light", { "data-brand": "sole" }],
    ["dark", { "data-brand": "sole", "data-theme": "dark" }],
  ])("resolves every variable in %s mode for %j", (mode, attributes) => {
    expect(resolvedTokens([tokensCss, soleCss], attributes)).toEqual(expectedSole(mode));
  });

  it("resolves the same values whatever the stylesheet order", () => {
    for (const theme of ["light", "dark"]) {
      const attributes = { "data-brand": "sole", "data-theme": theme };
      expect(resolvedTokens([soleCss, tokensCss], attributes)).toEqual(
        resolvedTokens([tokensCss, soleCss], attributes),
      );
    }
  });

  it("leaves applications without data-brand on the neutral contract", () => {
    for (const theme of ["light", "dark"])
      expect(resolvedTokens([tokensCss, soleCss], { "data-theme": theme })).toEqual(values[theme]);
  });

  it("uses Montserrat as the Solé typeface", () => {
    expect(expectedSole("dark")["font.family.base"]).toBe('"Montserrat", system-ui, sans-serif');
  });

  it("only declares rules scoped to data-brand", () => {
    const selectors = parseStylesheets(soleCss).map((rule) => rule.parts);
    expect(selectors.length).toBeGreaterThan(0);
    for (const parts of selectors)
      expect(parts[0]).toEqual({ kind: "attribute", name: "data-brand", value: "sole" });
  });

  it("builds the visual fixture without redefining Klima variables", async () => {
    const result = await build({
      root: app,
      configFile: false,
      logLevel: "silent",
      build: { write: false, minify: false },
    });
    const output = (Array.isArray(result) ? result : [result]).flatMap((entry) => entry.output);
    const css = output
      .filter((file) => file.fileName.endsWith(".css"))
      .map((file) => String(file.source))
      .join("\n");
    expect(css).toContain('[data-brand="sole"][data-theme="dark"]');
    expect(css).toContain(":root");
    const appCss = readFileSync(join(fixtureRoot, "src", "app.css"), "utf8");
    expect(appCss).toContain("var(--klima-");
    expect(appCss).not.toMatch(/--klima-[a-z0-9-]+\s*:/);
  });
});

describe("theme toggle", () => {
  const element = (theme) => {
    const attributes = new Map(theme ? [["data-theme", theme]] : []);
    return {
      getAttribute: (name) => attributes.get(name) ?? null,
      setAttribute: (name, value) => attributes.set(name, value),
    };
  };

  it("switches between light and dark", () => {
    const root = element("light");
    expect(toggleTheme(root)).toBe("dark");
    expect(root.getAttribute("data-theme")).toBe("dark");
    expect(toggleTheme(root)).toBe("light");
    expect(root.getAttribute("data-theme")).toBe("light");
  });

  it("treats a missing data-theme as light", () => {
    expect(toggleTheme(element())).toBe("dark");
  });
});
