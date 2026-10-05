import { readFile, readdir } from "node:fs/promises";
import { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

const STYLES = ["linear", "bold", "twotone", "bulk", "broken"];
const dist = new URL("../dist/", import.meta.url);
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const buildInfo = JSON.parse(await readFile(new URL("build-info.json", dist), "utf8"));
const barrels = Object.fromEntries(
  await Promise.all(
    STYLES.map(async (style) => [style, await import(new URL(`${style}/index.js`, dist).href)]),
  ),
);

it("exposes exactly one barrel and one subpath export per style", () => {
  expect(Object.keys(packageJson.exports).sort()).toEqual(
    [...STYLES.flatMap((style) => [`./${style}`, `./${style}/*`]), "./package.json"].sort(),
  );
  expect(Object.keys(buildInfo.styles).sort()).toEqual([...STYLES].sort());
});

describe.each(STYLES)("@klima-ds/icons-react/%s", (style) => {
  const barrel = barrels[style];
  const names = Object.keys(barrel).sort();
  const Icon = barrel[names[0]];
  const render = (props) => renderToStaticMarkup(createElement(Icon, props));

  it("exports one component per generated icon", () => {
    expect(names.length).toBe(buildInfo.styles[style].count);
    expect(names.length).toBeGreaterThan(0);
  });

  it("forwards refs and sets display names", () => {
    for (const name of names) {
      expect(barrel[name].$$typeof).toBe(Symbol.for("react.forward_ref"));
      expect(barrel[name].displayName).toBe(name);
    }
    expect(() => renderToStaticMarkup(createElement(Icon, { ref: createRef() }))).not.toThrow();
  });

  it("renders a decorative 24px icon by default", () => {
    const html = render();
    expect(html).toMatch(/^<svg /);
    expect(html).toContain('width="24"');
    expect(html).toContain('height="24"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('viewBox="');
    expect(html).not.toContain("<title");
  });

  it("exposes an accessible name when a title is given", () => {
    const html = render({ title: "Buscar" });
    expect(html).toContain('role="img"');
    expect(html).not.toContain("aria-hidden");
    const id = html.match(/aria-labelledby="([^"]+)"/)?.[1];
    expect(id).toBeTruthy();
    expect(html).toContain(`<title id="${id}">Buscar</title>`);
  });

  it("lets consumer props override generated defaults", () => {
    const html = render({ size: 16, className: "icon", fill: "red", "aria-hidden": false });
    expect(html).toContain('width="16"');
    expect(html).toContain('class="icon"');
    expect(html).toContain('fill="red"');
    expect(html).toContain('aria-hidden="false"');
  });

  it("keeps each subpath module equivalent to the barrel export", async () => {
    const files = (await readdir(new URL(`${style}/`, dist))).filter(
      (file) => file.endsWith(".js") && file !== "index.js",
    );
    expect(files.length).toBe(names.length);
    for (const file of files) {
      const module = await import(new URL(`${style}/${file}`, dist).href);
      const [named] = Object.keys(module).filter((key) => key !== "default");
      expect(module.default).toBe(module[named]);
      expect(barrel[named]).toBe(module.default);
    }
  });

  it("uses currentColor unless the icon is multicolor", async () => {
    const multicolor = new Set(buildInfo.styles[style].multicolor);
    const index = await readFile(new URL(`${style}/index.js`, dist), "utf8");
    const modules = [...index.matchAll(/from "\.\/([\w-]+)\.js"/g)].map(([, file]) => file);
    // Clip paths and masks keep literal colors: they define geometry, not the palette.
    const paintColors = ([tag, attrs, children = []]) =>
      tag === "clipPath" || tag === "mask"
        ? []
        : [attrs.fill, attrs.stroke, ...children.flatMap(paintColors)].filter(Boolean);
    for (const file of modules) {
      if (multicolor.has(file)) continue;
      const source = await readFile(new URL(`${style}/${file}.js`, dist), "utf8");
      const tree = JSON.parse(source.match(/createIcon\("\w+", \{.*?\}, (\[.*\])\);/)[1]);
      const literal = tree.flatMap(paintColors).filter((color) => color.startsWith("#"));
      expect(literal, `${style}/${file}`).toEqual([]);
    }
  });
});
