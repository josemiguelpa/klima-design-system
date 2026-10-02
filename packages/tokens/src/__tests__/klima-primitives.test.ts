import { describe, expect, it } from "vitest";
import { assembleTokens } from "../index.js";

type Obj = Record<string, unknown>;
interface Leaf {
  path: string;
  node: Obj;
}

const FIGMA_FILE_KEY = "pEieSZyQwDGKiAbeADq3ah";
const STEPS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];
const HUES = [
  "mint",
  "teal",
  "forest-moss",
  "electric-green",
  "royal-blue",
  "red",
  "yellow",
  "orange",
  "wine",
  "lavender",
];
// Paths imported from the Klima Figma file; the TASK-005 Solé placeholder is excluded.
const KLIMA_ROOTS = [
  "color.neutral.",
  ...HUES.map((hue) => `color.${hue}.`),
  "font.",
  "brand.klima.",
  "brand.unergy.",
  "brand.quoiago.",
  "brand.zentrack.",
  "brand.inpel.",
  "brand.suno.",
];
// Canvas-only swatches with no Figma variable yet.
const WITHOUT_VARIABLE = /^color\.electric-green\./;

function leaves(node: Obj, prefix = ""): Leaf[] {
  if ("$value" in node || "$ref" in node) return [{ path: prefix, node }];
  return Object.entries(node).flatMap(([key, child]) =>
    key.startsWith("$") || typeof child !== "object" || child === null
      ? []
      : leaves(child as Obj, prefix ? `${prefix}.${key}` : key),
  );
}

const { document, validation } = assembleTokens();
const klima = leaves(document).filter(({ path }) =>
  KLIMA_ROOTS.some((root) => path.startsWith(root)),
);
const colors = klima.filter(({ node }) => node.$type === "color");
const hexOf = (node: Obj) => (node.$value as { hex: string }).hex;

describe("Klima primitives", () => {
  it("assemble without diagnostics", () => {
    expect(validation.diagnostics).toEqual([]);
  });

  it("keep sRGB components consistent with the declared hex", () => {
    for (const { path, node } of colors) {
      const value = node.$value as { components: number[]; hex: string; alpha: number };
      const expected = [1, 3, 5].map(
        (i) => Math.round((parseInt(value.hex.slice(i, i + 2), 16) / 255) * 10000) / 10000,
      );
      expect(value.components, path).toEqual(expected);
      expect(value.alpha, path).toBe(1);
    }
  });

  it("record Figma provenance for every token backed by a Figma variable", () => {
    for (const { path, node } of klima) {
      const figma = (node.$extensions as Obj | undefined)?.["software.solenium.figma"] as
        Obj | undefined;
      if (WITHOUT_VARIABLE.test(path)) expect(figma, path).toBeUndefined();
      else expect(figma?.fileKey, path).toBe(FIGMA_FILE_KEY);
    }
  });

  it("expose complete 50-950 scales for every hue and Klima brand color", () => {
    const tokenPaths = new Set(klima.map(({ path }) => path));
    const scales = [
      ...HUES.map((hue) => `color.${hue}`),
      "brand.klima.blue",
      "brand.klima.white",
      "brand.klima.black",
    ];
    for (const scale of scales)
      for (const step of STEPS) expect(tokenPaths.has(`${scale}.${step}`), scale).toBe(true);
  });

  it("only repeat hex values that are documented", () => {
    const byHex = new Map<string, string[]>();
    for (const { path, node } of colors)
      byHex.set(hexOf(node), [...(byHex.get(hexOf(node)) ?? []), path]);
    const repeated = [...byHex.values()].filter((paths) => paths.length > 1);
    expect(repeated).toEqual([["color.forest-moss.400", "brand.quoiago.lime"]]);
  });

  it("match the approved snapshot", () => {
    const flat = Object.fromEntries(
      klima.map(({ path, node }) => [
        path,
        node.$type === "color" ? hexOf(node) : (node.$value as unknown),
      ]),
    );
    expect(flat).toMatchSnapshot();
  });
});
