import { describe, expect, it } from "vitest";
import { assembleTokens } from "../index.js";

type Obj = Record<string, unknown>;
interface Leaf {
  path: string;
  node: Obj;
}

const FIGMA_FILE_KEY = "zeWPEzMPcSIT91DT5awWiB";
const STEPS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];
const SCALES = ["green", "blue", "indigo"];

function leaves(node: Obj, prefix = ""): Leaf[] {
  if ("$value" in node || "$ref" in node) return [{ path: prefix, node }];
  return Object.entries(node).flatMap(([key, child]) =>
    key.startsWith("$") || typeof child !== "object" || child === null
      ? []
      : leaves(child as Obj, prefix ? `${prefix}.${key}` : key),
  );
}

const { document, validation } = assembleTokens();
const sole = leaves(document).filter(({ path }) => path.startsWith("brand.sole."));
const hexOf = (node: Obj) => (node.$value as { hex: string }).hex;

describe("Solé primitives", () => {
  it("assemble without diagnostics", () => {
    expect(validation.diagnostics).toEqual([]);
  });

  it("expose exactly the green, blue and indigo 50-950 scales", () => {
    expect(sole.map(({ path }) => path).sort()).toEqual(
      SCALES.flatMap((scale) => STEPS.map((step) => `brand.sole.${scale}.${step}`)).sort(),
    );
  });

  it("keep sRGB components consistent with the declared hex", () => {
    for (const { path, node } of sole) {
      const value = node.$value as { components: number[]; hex: string; alpha: number };
      const expected = [1, 3, 5].map(
        (i) => Math.round((parseInt(value.hex.slice(i, i + 2), 16) / 255) * 10000) / 10000,
      );
      expect(value.components, path).toEqual(expected);
      expect(value.alpha, path).toBe(1);
    }
  });

  it("record Figma provenance from the Solé file", () => {
    for (const { path, node } of sole) {
      const figma = (node.$extensions as Obj | undefined)?.["software.solenium.figma"] as
        Obj | undefined;
      expect(figma?.fileKey, path).toBe(FIGMA_FILE_KEY);
    }
  });

  it("only repeat hex values that are documented in Figma findings", () => {
    const byHex = new Map<string, string[]>();
    for (const { path, node } of sole)
      byHex.set(hexOf(node), [...(byHex.get(hexOf(node)) ?? []), path]);
    const repeated = [...byHex.values()].filter((paths) => paths.length > 1);
    expect(repeated).toEqual([
      ["brand.sole.blue.700", "brand.sole.blue.800"],
      ["brand.sole.indigo.500", "brand.sole.indigo.700"],
      ["brand.sole.indigo.600", "brand.sole.indigo.800"],
    ]);
  });

  it("match the approved snapshot", () => {
    expect(Object.fromEntries(sole.map(({ path, node }) => [path, hexOf(node)]))).toMatchSnapshot();
  });
});
