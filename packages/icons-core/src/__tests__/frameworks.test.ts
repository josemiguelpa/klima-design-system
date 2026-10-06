import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  normalizeSvg,
  publishProblems,
  renderAstro,
  renderVue,
  serializeSvgNodes,
  type GeneratedStyle,
} from "../index.js";

const icon = (name: string, component: string) => ({
  name,
  component,
  node: normalizeSvg(
    readFileSync(new URL(`../../test-fixtures/${name}.svg`, import.meta.url), "utf8"),
    { file: `${name}.svg`, idPrefix: name },
  ).node,
});
const styles: GeneratedStyle[] = [
  { style: "linear", icons: [icon("stroke", "Stroke"), icon("clip", "Clip")] },
];

describe("renderVue", () => {
  const files = renderVue(styles);

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

  it("keeps SVG attribute names and marks factories as pure", () => {
    const stroke = files.get("linear/stroke.js");
    expect(stroke).toContain("/* @__PURE__ */ createIcon(");
    expect(stroke).toContain('"stroke-width":"1.5"');
    expect(files.get("create-icon.js")).toContain('from "vue"');
    expect(files.get("create-icon.js")).not.toContain("react");
  });

  it("matches the generated module snapshot", () => {
    expect(files.get("linear/clip.js")).toMatchSnapshot();
  });
});

describe("renderAstro", () => {
  const files = renderAstro(styles);

  it("emits shared components, one .astro file per icon and a style barrel", () => {
    expect([...files.keys()].sort()).toEqual([
      "Svg.astro",
      "linear/clip.astro",
      "linear/clip.d.ts",
      "linear/index.d.ts",
      "linear/index.js",
      "linear/stroke.astro",
      "linear/stroke.d.ts",
      "title-id.js",
      "types.d.ts",
    ]);
    expect(files.get("linear/index.js")).toContain(
      'export { default as Stroke } from "./stroke.astro";',
    );
  });

  it("does not depend on React or Vue", () => {
    for (const content of files.values()) expect(content).not.toMatch(/from "(react|vue)/);
  });

  it("matches the generated component snapshots", () => {
    expect(files.get("linear/clip.astro")).toMatchSnapshot();
    expect(files.get("Svg.astro")).toMatchSnapshot();
  });

  it("escapes attribute values when serializing markup", () => {
    expect(serializeSvgNodes([{ tag: "path", attrs: { d: 'M0 0"<&>' }, children: [] }])).toBe(
      '<path d="M0 0&quot;&lt;&amp;&gt;"/>',
    );
  });
});

describe("publishProblems", () => {
  it("blocks synthetic builds and unconfirmed provenance", () => {
    expect(
      publishProblems({
        source: "synthetic",
        styles: { linear: { count: 4, unconfirmedProvenance: 2, multicolor: [] } },
      }),
    ).toEqual(['build source is "synthetic"', "linear: 2 icons without confirmed provenance"]);
    expect(
      publishProblems({
        source: "figma",
        styles: { linear: { count: 4, unconfirmedProvenance: 0, multicolor: [] } },
      }),
    ).toEqual([]);
  });
});
