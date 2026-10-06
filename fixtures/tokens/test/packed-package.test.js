// Consumes @klima-ds/tokens from its packed tarball, as an application installed from npm would (TASK-009).
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { beforeAll, describe, expect, it } from "vitest";

const tokensRoot = fileURLToPath(new URL("../../../packages/tokens", import.meta.url));
const tsc = createRequire(import.meta.url).resolve("typescript/bin/tsc");

function run(command, args, cwd) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });
}

/** Packs the package (prepack rebuilds it) and installs the tarball into a fresh app directory. */
function packIntoApp() {
  const app = mkdtempSync(join(tmpdir(), "klima-tokens-app-"));
  run("pnpm", ["pack", "--pack-destination", app], tokensRoot);
  const tarball = readdirSync(app).find((file) => file.endsWith(".tgz"));
  const packageDir = join("node_modules", "@klima-ds", "tokens");
  mkdirSync(join(app, packageDir), { recursive: true });
  // Relative paths keep bsdtar (Windows) and GNU tar (Linux) from misreading drive letters.
  run("tar", ["-xzf", tarball, "-C", packageDir, "--strip-components=1"], app);
  return { app, packageDir: join(app, packageDir) };
}

function files(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)).replaceAll("\\", "/"))
    .sort();
}

function exportTargets(exports) {
  if (typeof exports === "string") return [exports];
  return Object.values(exports).flatMap(exportTargets);
}

let first;
let second;
let manifest;

beforeAll(() => {
  first = packIntoApp();
  second = packIntoApp();
  manifest = JSON.parse(readFileSync(join(first.packageDir, "package.json"), "utf8"));
});

describe("@klima-ds/tokens packed tarball", () => {
  it("is byte-identical across two consecutive builds", () => {
    const list = files(first.packageDir);
    expect(list).toEqual(files(second.packageDir));
    for (const file of list)
      expect(readFileSync(join(second.packageDir, file)), file).toEqual(
        readFileSync(join(first.packageDir, file)),
      );
  });

  it("ships every export target", () => {
    const targets = [...exportTargets(manifest.exports), manifest.main, manifest.types];
    expect(targets).toEqual(
      expect.arrayContaining(["./dist/index.js", "./dist/tokens.css", "./dist/tooling.js"]),
    );
    for (const target of targets)
      expect(existsSync(join(first.packageDir, target)), target).toBe(true);
  });

  it("resolves and imports the public entry points from Node", () => {
    writeFileSync(
      join(first.app, "check.mjs"),
      [
        'import { readFileSync } from "node:fs";',
        'import { tokens, values, cssVariables, modes, defaultMode } from "@klima-ds/tokens";',
        'import { validateManifest, manifest } from "@klima-ds/tokens/tooling";',
        'const css = readFileSync(new URL(import.meta.resolve("@klima-ds/tokens/css")), "utf8");',
        "console.log(JSON.stringify({",
        "  token: tokens.color.text.primary,",
        '  light: values.light["color.text.primary"],',
        '  dark: values.dark["color.text.primary"],',
        '  variable: cssVariables["color.text.primary"],',
        "  modes, defaultMode,",
        "  valid: validateManifest(manifest).valid,",
        '  css: css.includes("--klima-color-text-primary"),',
        "}));",
      ].join("\n"),
    );
    expect(JSON.parse(run(process.execPath, ["check.mjs"], first.app))).toEqual({
      token: "var(--klima-color-text-primary)",
      light: "#111827",
      dark: "#f9fafb",
      variable: "--klima-color-text-primary",
      modes: ["light", "dark"],
      defaultMode: "light",
      valid: true,
      css: true,
    });
  });

  it("typechecks a strict TypeScript consumer against the packed declarations", () => {
    writeFileSync(
      join(first.app, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "Bundler",
          strict: true,
          noEmit: true,
          skipLibCheck: false,
          noUncheckedSideEffectImports: true,
          types: [],
        },
        files: ["consumer.ts"],
      }),
    );
    writeFileSync(
      join(first.app, "consumer.ts"),
      [
        'import "@klima-ds/tokens/css";',
        'import { tokens, values, cssVariables, type Mode, type TokenPath } from "@klima-ds/tokens";',
        'const path: TokenPath = "color.feedback.critical.text";',
        'const mode: Mode = "dark";',
        'export const primary: "var(--klima-color-text-primary)" = tokens.color.text.primary;',
        "export const resolved: string = values[mode][path];",
        'export const variable: "--klima-color-action-primary-default" = cssVariables["color.action.primary.default"];',
        "// @ts-expect-error unknown token path",
        'export const unknown: TokenPath = "color.text.caption";',
        "// @ts-expect-error unknown mode",
        'export const sepia: Mode = "sepia";',
      ].join("\n"),
    );
    expect(() => run(process.execPath, [tsc, "-p", "tsconfig.json"], first.app)).not.toThrow();
  });

  it("bundles the CSS and TypeScript values with Vite", async () => {
    writeFileSync(
      join(first.app, "main.js"),
      [
        'import "@klima-ds/tokens/css";',
        'import { values } from "@klima-ds/tokens";',
        'globalThis.canvas = values.dark["color.background.canvas"];',
      ].join("\n"),
    );
    const result = await build({
      root: first.app,
      configFile: false,
      logLevel: "silent",
      build: { write: false, minify: false, rollupOptions: { input: join(first.app, "main.js") } },
    });
    const output = (Array.isArray(result) ? result : [result]).flatMap((entry) => entry.output);
    const css = output
      .filter((file) => file.fileName.endsWith(".css"))
      .map((file) => String(file.source))
      .join("\n");
    const js = output.map((file) => file.code ?? "").join("\n");
    expect(css).toContain("--klima-color-text-primary");
    expect(css).toContain('[data-theme="dark"]');
    expect(js).toContain("#0a101d");
  });
});
