import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeSvg, reactAttributeName, renderReact } from "../index.js";

const icon = (name: string, component: string) => ({
  name,
  component,
  node: normalizeSvg(
    readFileSync(new URL(`../../test-fixtures/${name}.svg`, import.meta.url), "utf8"),
    { file: `${name}.svg`, idPrefix: name },
  ).node,
});

describe("renderReact", () => {
  const files = renderReact([
    { style: "linear", icons: [icon("stroke", "Stroke"), icon("clip", "Clip")] },
  ]);

  it("emits a shared runtime, one module per icon and a style barrel", () => {
    expect([...files.keys()].sort()).toEqual([
      "create-icon.d.ts",
      "create-icon.js",
      "linear/clip.d.ts",
      "linear/clip.js",
      "linear/index.d.ts",
      "linear/index.js",
      "linear/stroke.d.ts",
      "linear/stroke.js",
    ]);
  });

  it("marks icon factories as pure for tree-shaking", () => {
    expect(files.get("linear/stroke.js")).toContain("/* @__PURE__ */ createIcon(");
  });

  it("matches the generated module snapshots", () => {
    expect(files.get("linear/clip.js")).toMatchSnapshot();
    expect(files.get("linear/index.js")).toMatchSnapshot();
    expect(files.get("linear/index.d.ts")).toMatchSnapshot();
  });

  it("converts SVG attributes to React props", () => {
    expect(reactAttributeName("stroke-width")).toBe("strokeWidth");
    expect(reactAttributeName("clip-path")).toBe("clipPath");
    expect(reactAttributeName("xlink:href")).toBe("xlinkHref");
    expect(reactAttributeName("aria-hidden")).toBe("aria-hidden");
    expect(files.get("linear/stroke.js")).toContain('"strokeWidth":"1.5"');
  });

  it("rejects inline styles and duplicate component names", () => {
    const styled = {
      name: "styled",
      component: "Styled",
      node: {
        tag: "svg",
        attrs: { viewBox: "0 0 24 24" },
        children: [{ tag: "path", attrs: { style: "fill:red" }, children: [] }],
      },
    };
    expect(() => renderReact([{ style: "linear", icons: [styled] }])).toThrow(
      "linear/styled: inline style",
    );
    expect(() =>
      renderReact([{ style: "linear", icons: [icon("stroke", "Same"), icon("clip", "Same")] }]),
    ).toThrow("duplicate component name Same");
  });
});
