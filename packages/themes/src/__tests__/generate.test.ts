import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GENERATED_NOTICE,
  checkGenerated,
  generateThemes,
  resolveTheme,
  themeSelector,
  type ThemeManifest,
} from "../generate.js";

const artifacts = generateThemes();
const css = artifacts["sole.css"] as string;

const color = (value: string) => ({ $type: "color", $value: value });
const action = (fill: string, foreground = "{brand.sole.green.400}") => ({
  color: { action: { primary: { default: color(fill), foreground: color(foreground) } } },
});

/** Writes a one-brand theme whose light mode is `light` and whose dark mode is valid. */
function theme(
  light: unknown,
  extra: Record<string, unknown> = {},
): ThemeManifest & { root: string } {
  const root = mkdtempSync(join(tmpdir(), "klima-theme-"));
  const files: Record<string, unknown> = {
    "light.json": light,
    "dark.json": action("{brand.sole.green.400}", "{brand.sole.indigo.400}"),
    ...extra,
  };
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), JSON.stringify(content));
  }
  return { root, brands: { sole: { modes: { light: "light.json", dark: "dark.json" } } } };
}
const problemsOf = (input: ThemeManifest & { root: string }) => {
  try {
    resolveTheme("sole", "light", input, input.root);
    return "";
  } catch (error) {
    return (error as Error).message;
  }
};

describe("Solé theme (TASK-010)", () => {
  it("is byte-identical across consecutive generations", () => {
    expect(generateThemes()).toEqual(artifacts);
  });

  it("is marked as generated", () => {
    expect(css.startsWith(`/* ${GENERATED_NOTICE} */`)).toBe(true);
    expect(artifacts["sole.css.d.ts"]).toContain(GENERATED_NOTICE);
  });

  it("scopes every rule to data-brand and never touches global selectors", () => {
    const selectors = css
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("}")
      .map((rule) => rule.split("{")[0]?.trim())
      .filter(Boolean);
    expect(selectors).toEqual([
      '[data-brand="sole"]:not([data-theme="dark"])',
      '[data-brand="sole"][data-theme="dark"]',
    ]);
  });

  it("maps the primary action to the Figma Indigo variant in light and Green in dark", () => {
    expect(css).toContain(
      '[data-brand="sole"]:not([data-theme="dark"]) {\n  --klima-font-family-base: var(--klima-brand-sole-font-family-base);\n  --klima-color-action-primary-default: var(--klima-brand-sole-indigo-400);',
    );
    expect(css).toContain(
      '[data-brand="sole"][data-theme="dark"] {\n  --klima-font-family-base: var(--klima-brand-sole-font-family-base);\n  --klima-color-action-primary-default: var(--klima-brand-sole-green-400);',
    );
  });

  it("redeclares every override in every mode so no neutral mode rule can win", () => {
    const [light, dark] = css
      .split("\n\n")
      .map((block) => [...block.matchAll(/^ {2}(--klima-[a-z0-9-]+):/gm)].map(([, name]) => name));
    expect(light).toEqual(dark);
  });
});

describe("theme selectors", () => {
  it("apply the default mode without data-theme and other modes explicitly", () => {
    expect(themeSelector("sole", "light", ["light", "dark"])).toBe(
      '[data-brand="sole"]:not([data-theme="dark"])',
    );
    expect(themeSelector("sole", "dark", ["light", "dark"])).toBe(
      '[data-brand="sole"][data-theme="dark"]',
    );
  });
});

describe("theme validation", () => {
  it("accepts overrides that alias the brand's own primitives", () => {
    const input = theme(action("{brand.sole.indigo.400}"));
    expect(resolveTheme("sole", "light", input, input.root)).toEqual([
      { path: "color.action.primary.default", target: "brand.sole.indigo.400" },
      { path: "color.action.primary.foreground", target: "brand.sole.green.400" },
    ]);
  });

  it.each([
    [
      "unknown tokens",
      { color: { action: { tertiary: color("{brand.sole.indigo.400}") } } },
      "may only override existing semantic tokens",
    ],
    [
      "primitives",
      { color: { neutral: { "0": color("{brand.sole.indigo.400}") } } },
      "may only override existing semantic tokens",
    ],
    [
      "literal values",
      {
        color: {
          text: {
            primary: { $type: "color", $value: { colorSpace: "srgb", components: [0, 0, 0] } },
          },
        },
      },
      "overrides must alias a primitive",
    ],
    [
      "other brands' primitives",
      action("{brand.klima.blue.900}"),
      "may only use its own brand primitives",
    ],
    [
      "aliases to semantic tokens",
      action("{color.text.primary}"),
      "alias target is not a primitive",
    ],
    [
      "type mismatches",
      { font: { family: { base: color("{brand.sole.indigo.400}") } } },
      "type color differs from fontFamily",
    ],
    [
      "combinations below the agreed contrast",
      action("{brand.sole.green.400}", "{brand.sole.indigo.400}"),
      "color.action.primary.default on color.background.canvas",
    ],
  ])("rejects %s", (_name, light, message) => {
    expect(problemsOf(theme(light))).toContain(message);
  });

  it("rejects tokens declared twice for the same mode", () => {
    const input = theme(action("{brand.sole.indigo.400}"), {
      "shared.json": action("{brand.sole.indigo.400}"),
    });
    (input.brands.sole as { shared?: string[] }).shared = ["shared.json"];
    expect(problemsOf(input)).toContain("declared twice for mode light");
  });

  it("rejects brands that do not declare every token mode", () => {
    const input = theme(action("{brand.sole.indigo.400}"));
    delete (input.brands.sole as { modes: Record<string, string> }).modes.dark;
    expect(() => generateThemes(input, input.root)).toThrow("must declare exactly the token modes");
  });
});

describe("stale output detection", () => {
  const write = (files: Record<string, string>) => {
    const dir = mkdtempSync(join(tmpdir(), "klima-themes-dist-"));
    for (const [file, content] of Object.entries(files)) writeFileSync(join(dir, file), content);
    return dir;
  };

  it("accepts an up-to-date output directory", () => {
    expect(checkGenerated(write(artifacts), artifacts)).toEqual([]);
  });

  it("reports stale and missing artifacts", () => {
    const dir = write({ "sole.css": css.replace("indigo-400", "indigo-300") });
    expect(checkGenerated(dir, artifacts)).toEqual([
      { file: "sole.css", problem: "stale" },
      { file: "sole.css.d.ts", problem: "missing" },
    ]);
  });
});
