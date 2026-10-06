import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GENERATED_NOTICE,
  assembleTokens,
  checkGenerated,
  cssVariableName,
  generateArtifacts,
  serializeValue,
  type TokenManifest,
} from "../tooling.js";

const artifacts = generateArtifacts();
const css = artifacts["tokens.css"] as string;
const js = artifacts["index.js"] as string;
const dts = artifacts["index.d.ts"] as string;

function blockOf(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  return css.slice(start, css.indexOf("}", start));
}
function fixture(files: Record<string, unknown>): string {
  const root = mkdtempSync(join(tmpdir(), "klima-generate-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), JSON.stringify(content));
  }
  return root;
}
const black = { colorSpace: "srgb", components: [0, 0, 0] };

describe("generated artifacts (TASK-009)", () => {
  it("are byte-identical across consecutive generations", () => {
    expect(generateArtifacts()).toEqual(artifacts);
  });

  it("produce the CSS, JavaScript and declaration entry points", () => {
    expect(Object.keys(artifacts).sort()).toEqual(
      ["index.d.ts", "index.js", "tokens.css", "tokens.css.d.ts"].sort(),
    );
  });

  it("are marked as generated", () => {
    for (const content of Object.values(artifacts)) expect(content).toContain(GENERATED_NOTICE);
  });

  it("prefix every custom property with --klima-", () => {
    const names = [...css.matchAll(/^\s+(--[a-z0-9-]+):/gm)].map(([, name]) => name);
    expect(names.length).toBeGreaterThan(0);
    expect(names.every((name) => name?.startsWith("--klima-"))).toBe(true);
  });

  it("declare every token of the default mode on :root", () => {
    const { document } = assembleTokens();
    const count = JSON.stringify(document).match(/"\$value"/g)?.length;
    expect(blockOf(':root,\n[data-theme="light"]').match(/^ {2}--klima-/gm)?.length).toBe(count);
  });

  it("override only the tokens that change in dark mode", () => {
    const dark = blockOf('[data-theme="dark"]');
    expect(dark).toContain("--klima-color-text-primary: var(--klima-color-neutral-50);");
    expect(dark).not.toMatch(/^ {2}--klima-color-neutral-/m);
    expect(dark).not.toMatch(/^ {2}--klima-button-/m);
  });

  it("keep aliases as var() references so components follow the active mode", () => {
    expect(css).toContain(
      "--klima-button-primary-background-default: var(--klima-color-action-primary-default);",
    );
  });

  it("do not touch global selectors", () => {
    expect(css).not.toMatch(/(^|\n)\s*(body|html|\*|::-webkit-scrollbar)[\s,{]/);
    expect(css).not.toContain("data-brand");
  });

  it("expose resolved values per mode and typed paths", () => {
    expect(js).toContain('"color.text.primary": "#111827"');
    expect(js).toContain('"color.text.primary": "#f9fafb"');
    expect(dts).toContain('export type Mode = "light" | "dark";');
    expect(dts).toContain('  | "color.text.primary"');
    expect(dts).toContain('readonly "primary": "var(--klima-color-text-primary)";');
  });
});

describe("CSS serialization", () => {
  it.each([
    ["color", { colorSpace: "srgb", components: [1, 0.5, 0], alpha: 1 }, "#ff8000"],
    ["color", { colorSpace: "srgb", components: [0, 0, 0], alpha: 0.5 }, "#00000080"],
    ["color", { colorSpace: "display-p3", components: [1, 0, 0] }, "color(display-p3 1 0 0)"],
    ["dimension", { value: 1.5, unit: "rem" }, "1.5rem"],
    ["fontWeight", 600, "600"],
    ["fontWeight", "semi-bold", "600"],
    [
      "fontFamily",
      ["Be Vietnam Pro", "system-ui", "sans-serif"],
      '"Be Vietnam Pro", system-ui, sans-serif',
    ],
    ["fontFamily", 'Odd "Name"', '"Odd \\"Name\\""'],
    ["number", 1.5, "1.5"],
  ])("serializes %s %j", (type, value, expected) => {
    expect(serializeValue(type, value, "x.y")).toBe(expected);
  });

  it("converts opacity percentages to CSS fractions", () => {
    expect(serializeValue("number", 40, "opacity.disabled")).toBe("0.4");
  });

  it("serializes shadows", () => {
    const px = (value: number) => ({ value, unit: "px" });
    const shadow = { color: black, offsetX: px(0), offsetY: px(1), blur: px(2), spread: px(0) };
    expect(serializeValue("shadow", [shadow, { ...shadow, inset: true }], "x.y")).toBe(
      "0px 1px 2px 0px #000000, inset 0px 1px 2px 0px #000000",
    );
  });

  it("refuses types and color spaces without a CSS serialization", () => {
    expect(() => serializeValue("typography", {}, "x.y")).toThrow("no CSS serialization");
    expect(() =>
      serializeValue("color", { colorSpace: "hsl", components: [0, 0, 0] }, "x.y"),
    ).toThrow("Unsupported color space");
  });

  it("maps token paths to custom property names", () => {
    expect(cssVariableName("brand.sole.green.600")).toBe("--klima-brand-sole-green-600");
  });
});

describe("generation guards", () => {
  const manifestFor = (sources: TokenManifest["sources"]): TokenManifest => ({
    version: "2025.10",
    layers: ["global", "brand", "semantic", "component"],
    sources,
  });

  it("rejects custom property collisions", () => {
    const root = fixture({
      "src/tokens/global/color.json": {
        color: {
          "a-b": { c: { $type: "color", $value: black } },
          a: { "b-c": { $type: "color", $value: black } },
        },
      },
    });
    expect(() =>
      generateArtifacts(
        manifestFor([{ layer: "global", path: "src/tokens/global/color.json" }]),
        root,
      ),
    ).toThrow("CSS custom property collision");
  });

  it("rejects invalid sources", () => {
    const root = fixture({
      "src/tokens/global/color.json": {
        color: { a: { $type: "color", $value: "{color.missing}" } },
      },
    });
    expect(() =>
      generateArtifacts(
        manifestFor([{ layer: "global", path: "src/tokens/global/color.json" }]),
        root,
      ),
    ).toThrow("alias.target-not-found color.a");
  });

  it("resolves $ref pointers to whole values as var() and descendants as literals", () => {
    const root = fixture({
      "src/tokens/global/size.json": {
        space: {
          "4": { $type: "dimension", $value: { value: 16, unit: "px" } },
          gap: { $type: "dimension", $ref: "#/space/4/$value" },
          ratio: { $type: "number", $ref: "#/space/4/$value/value" },
        },
      },
    });
    const output = generateArtifacts(
      manifestFor([{ layer: "global", path: "src/tokens/global/size.json" }]),
      root,
    )["tokens.css"];
    expect(output).toContain("--klima-space-gap: var(--klima-space-4);");
    expect(output).toContain("--klima-space-ratio: 16;");
  });
});

describe("stale output detection", () => {
  const write = (files: Record<string, string>) => {
    const dir = mkdtempSync(join(tmpdir(), "klima-dist-"));
    for (const [file, content] of Object.entries(files)) writeFileSync(join(dir, file), content);
    return dir;
  };

  it("accepts an up-to-date output directory", () => {
    expect(checkGenerated(write(artifacts), artifacts)).toEqual([]);
  });

  it("reports stale and missing artifacts", () => {
    const files: Record<string, string> = {
      ...artifacts,
      "tokens.css": css.replace("#111827", "#000000"),
    };
    delete files["index.js"];
    const dir = write(files);
    expect(checkGenerated(dir, artifacts)).toEqual([
      { file: "tokens.css", problem: "stale" },
      { file: "index.js", problem: "missing" },
    ]);
  });
});
