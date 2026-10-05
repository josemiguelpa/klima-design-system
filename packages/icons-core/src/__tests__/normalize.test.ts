import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeSvg } from "../index.js";

const fixture = (name: string) =>
  readFileSync(new URL(`../../test-fixtures/${name}.svg`, import.meta.url), "utf8");
const normalize = (name: string) =>
  normalizeSvg(fixture(name), { file: `${name}.svg`, idPrefix: name });

describe("normalizeSvg", () => {
  it.each(["stroke", "fill", "twotone", "clip", "logo"])("matches the %s snapshot", (name) => {
    expect(normalize(name).svg).toMatchSnapshot();
  });

  it.each(["stroke", "fill", "twotone", "clip", "logo"])("is idempotent for %s", (name) => {
    const once = normalize(name);
    const twice = normalizeSvg(once.svg, { file: `${name}.svg`, idPrefix: name });
    expect(twice.svg).toBe(once.svg);
    expect(twice.multicolor).toBe(once.multicolor);
  });

  it("preserves viewBox, removes fixed dimensions and uses currentColor", () => {
    const { node, multicolor } = normalize("stroke");
    expect(node.attrs.viewBox).toBe("0 0 24 24");
    expect(node.attrs.width).toBeUndefined();
    expect(node.attrs.height).toBeUndefined();
    expect(multicolor).toBe(false);
    const strokes = node.children.map((child) => child.attrs.stroke);
    expect(strokes.every((stroke) => stroke === "currentColor")).toBe(true);
    expect(node.children[0]?.attrs["stroke-width"]).toBe("1.5");
  });

  it("keeps duotone opacity layers", () => {
    expect(normalize("twotone").svg).toContain('opacity=".4"');
  });

  it("ignores clip path and mask colors when detecting multicolor icons", () => {
    const { svg, multicolor } = normalize("clip");
    expect(multicolor).toBe(false);
    expect(svg).toContain('fill="currentColor"');
    expect(svg).toContain('fill="#fff"');
  });

  it("prefixes ids so several icons can share a document", () => {
    const { svg } = normalize("clip");
    expect(svg).toMatch(/id="clip-[a-z]+"/);
    expect(svg).toMatch(/clip-path="url\(#clip-[a-z]+\)"/);
  });

  it("keeps every color of multicolor assets", () => {
    const { svg, multicolor } = normalize("logo");
    expect(multicolor).toBe(true);
    expect(svg.toLowerCase()).toContain("#1d99cc");
    expect(svg.toLowerCase()).toContain("#292d32");
    expect(svg).not.toContain("currentColor");
  });

  it("reports the file and cause for invalid markup", () => {
    expect(() => normalize("invalid")).toThrow(/^invalid\.svg: invalid SVG/);
  });

  it("derives a missing viewBox from fixed dimensions", () => {
    expect(normalize("no-viewbox").node.attrs.viewBox).toBe("0 0 24 24");
  });

  it("rejects icons without viewBox or dimensions", () => {
    expect(() => normalize("no-geometry")).toThrow("no-geometry.svg: invalid SVG (missing viewBox");
  });
});
