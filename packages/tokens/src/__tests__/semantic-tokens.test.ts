import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import light from "../tokens/semantic/light/color.json" with { type: "json" };
import dark from "../tokens/semantic/dark/color.json" with { type: "json" };
import {
  BLOCKED_PAIRS,
  BLOCKED_TOKENS,
  CONTRAST_MINIMUM,
  assembleTokens,
  checkContrast,
  contrastRatio,
  manifest,
  resolveColor,
  validateInternal,
  validateManifest,
  type TokenLayer,
  type TokenManifest,
} from "../tooling.js";

type Obj = Record<string, unknown>;
const modes = (manifest as TokenManifest).modes ?? [];
const semanticFiles = { light, dark } as Record<string, Obj>;

function tokens(node: Obj, prefix = ""): [string, Obj][] {
  if ("$value" in node) return [[prefix, node]];
  return Object.entries(node).flatMap(([key, child]) =>
    key.startsWith("$") ? [] : tokens(child as Obj, prefix ? `${prefix}.${key}` : key),
  );
}
const semanticPaths = tokens(light).map(([path]) => path);

// Visual color names, hue names used by primitives and brand names must not leak into the semantic API.
const forbiddenSegments = new Set([
  "sole",
  "klima",
  "unergy",
  "quoiago",
  "zentrack",
  "inpel",
  "suno",
  "brand",
  "neutral",
  "grey",
  "gray",
  "white",
  "black",
  "green",
  "blue",
  "indigo",
  "red",
  "yellow",
  "orange",
  "mint",
  "teal",
  "forest-moss",
  "electric-green",
  "royal-blue",
  "wine",
  "lavender",
  "lime",
]);

function fixture(files: Record<string, unknown>): string {
  const root = mkdtempSync(join(tmpdir(), "klima-tokens-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), JSON.stringify(content));
  }
  return root;
}
const srgb = (value: number) => ({ colorSpace: "srgb", components: [value, value, value] });

describe("semantic tokens (TASK-008)", () => {
  it("declare light and dark modes, light first", () => {
    expect(modes).toEqual(["light", "dark"]);
  });

  it("validate the whole manifest in every mode", () => {
    expect(validateManifest(manifest as TokenManifest).diagnostics).toEqual([]);
  });

  it.each(["light", "dark"])("assemble the %s mode without diagnostics", (mode) => {
    const result = assembleTokens(undefined, undefined, { mode });
    expect(result.mode).toBe(mode);
    expect(result.validation.diagnostics).toEqual([]);
  });

  it("default to the first declared mode", () => {
    expect(assembleTokens().mode).toBe("light");
  });

  it("reject an undeclared mode", () => {
    expect(() => assembleTokens(undefined, undefined, { mode: "sepia" })).toThrow(
      "Unknown token mode: sepia",
    );
  });

  it("cover background, surface, text, border, action and feedback", () => {
    const groups = new Set(semanticPaths.map((path) => path.split(".")[1]));
    expect([...groups].sort()).toEqual(
      ["action", "background", "border", "feedback", "surface", "text"].sort(),
    );
  });

  it("declare the same paths in both modes", () => {
    expect(tokens(dark).map(([path]) => path)).toEqual(semanticPaths);
  });

  it.each(Object.keys(semanticFiles))("only alias global primitives in %s mode", (mode) => {
    for (const [path, node] of tokens(semanticFiles[mode] as Obj)) {
      expect(node.$type, path).toBe("color");
      expect(node.$value, path).toMatch(/^\{color\.[a-z-]+\.[0-9]+\}$/);
    }
  });

  it("document the intent of every token", () => {
    for (const file of Object.values(semanticFiles))
      for (const [path, node] of tokens(file))
        expect(typeof node.$description === "string" && node.$description.length > 20, path).toBe(
          true,
        );
  });

  it("do not use brand or visual color names", () => {
    for (const path of semanticPaths)
      for (const segment of path.split("."))
        expect(forbiddenSegments.has(segment), path).toBe(false);
  });

  it("record the same Figma provenance in both modes", () => {
    const provenance = (file: Obj) =>
      tokens(file).map(([path, node]) => [
        path,
        (node.$extensions as Obj | undefined)?.["software.solenium.figma"],
      ]);
    expect(provenance(dark)).toEqual(provenance(light));
    expect(provenance(light).filter(([, figma]) => figma).length).toBe(19);
  });

  it.each(["light", "dark"])(
    "meet WCAG 2.2 AA for every required pair in %s mode, except documented blocked pairs",
    (mode) => {
      const { document } = assembleTokens(undefined, undefined, { mode });
      const failures = checkContrast(document)
        .filter((result) => !result.passes)
        .map((r) => `${r.foreground} on ${r.background}`);
      // Exact match: a blocked pair that starts passing must be unblocked explicitly.
      expect(failures).toEqual(
        BLOCKED_PAIRS.filter((pair) => pair.modes.includes(mode)).map(
          (pair) => `${pair.foreground} on ${pair.background}`,
        ),
      );
    },
  );

  it.each(["light", "dark"])("keep blocked tokens out of the %s contract", (mode) => {
    const { document } = assembleTokens(undefined, undefined, { mode });
    for (const blocked of BLOCKED_TOKENS) {
      expect(() => resolveColor(document, blocked.path)).toThrow("Token does not exist");
      // Evidence: the Figma intent still fails, so unblocking requires a design change.
      const ratio = contrastRatio(
        resolveColor(document, blocked.intent[mode] as string),
        resolveColor(document, blocked.against),
      );
      expect(ratio, blocked.path).toBeLessThan(CONTRAST_MINIMUM[blocked.kind]);
    }
  });
});

describe("mode-aware manifest validation", () => {
  const primitive = { color: { base: { $type: "color", $value: srgb(0) } } };
  const semantic = (path: string) => ({
    color: { [path]: { $type: "color", $value: "{color.base}" } },
  });

  it("reports tokens missing from another mode", () => {
    const root = fixture({
      "src/tokens/global/color.json": primitive,
      "src/tokens/semantic/light/color.json": semantic("text"),
      "src/tokens/semantic/dark/color.json": semantic("surface"),
    });
    const result = validateManifest(
      {
        version: "2025.10",
        layers: ["global", "brand", "semantic", "component"],
        modes: ["light", "dark"],
        sources: [
          { layer: "global", path: "src/tokens/global/color.json" },
          { layer: "semantic", mode: "light", path: "src/tokens/semantic/light/color.json" },
          { layer: "semantic", mode: "dark", path: "src/tokens/semantic/dark/color.json" },
        ],
      },
      root,
    );
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "manifest.mode-parity", path: "color.text" }),
        expect.objectContaining({ code: "manifest.mode-parity", path: "color.surface" }),
      ]),
    );
  });

  it("rejects undeclared modes, moded primitives and misplaced mode files", () => {
    const root = fixture({
      "src/tokens/global/color.json": primitive,
      "src/tokens/semantic/color.json": semantic("text"),
      "src/tokens/semantic/sepia/color.json": semantic("text"),
    });
    const result = validateManifest(
      {
        version: "2025.10",
        layers: ["global", "brand", "semantic", "component"],
        modes: ["light"],
        sources: [
          { layer: "global", mode: "light", path: "src/tokens/global/color.json" },
          { layer: "semantic", mode: "light", path: "src/tokens/semantic/color.json" },
          { layer: "semantic", mode: "sepia", path: "src/tokens/semantic/sepia/color.json" },
        ],
      },
      root,
    );
    const codes = result.diagnostics.map((d) => d.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "manifest.mode-layer-invalid",
        "manifest.source-path-invalid",
        "manifest.mode-unknown",
      ]),
    );
  });

  it("rejects malformed mode lists", () => {
    const result = validateManifest(
      {
        version: "2025.10",
        layers: ["global", "brand", "semantic", "component"],
        modes: ["Light", "Light"],
        sources: [],
      },
      fixture({}),
    );
    expect(result.diagnostics.map((d) => d.code)).toContain("manifest.modes-invalid");
  });
});

describe("semantic literal colors", () => {
  const layers = (layer: TokenLayer) =>
    new Map<string, TokenLayer>([
      ["color.base", "global"],
      ["color.text", layer],
    ]);
  const document = {
    color: { base: { $type: "color", $value: srgb(0) }, text: { $type: "color", $value: srgb(1) } },
  };

  it("are rejected in the semantic layer", () => {
    expect(validateInternal(document, layers("semantic")).diagnostics).toContainEqual(
      expect.objectContaining({ code: "semantic.literal-color", path: "color.text" }),
    );
  });

  it("remain allowed for primitives", () => {
    expect(validateInternal(document, layers("global")).diagnostics).toEqual([]);
  });
});
