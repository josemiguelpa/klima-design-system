import { readFile, readdir } from "node:fs/promises";
import { renderToString } from "@vue/server-renderer";
import { createSSRApp, h } from "vue";
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
const render = (component, props = {}) =>
  renderToString(createSSRApp({ render: () => h(component, props) }));

it("exposes exactly one barrel and one subpath export per style", () => {
  expect(Object.keys(packageJson.exports).sort()).toEqual(
    [...STYLES.flatMap((style) => [`./${style}`, `./${style}/*`]), "./package.json"].sort(),
  );
  expect(Object.keys(buildInfo.styles).sort()).toEqual([...STYLES].sort());
});

it("does not depend on React", async () => {
  expect(packageJson.peerDependencies).toEqual({ vue: "^3.5.0" });
  expect(await readFile(new URL("create-icon.js", dist), "utf8")).not.toContain("react");
});

describe.each(STYLES)("@klima-ds/icons-vue/%s", (style) => {
  const barrel = barrels[style];
  const names = Object.keys(barrel).sort();
  const Icon = barrel[names[0]];

  it("exports one named component per generated icon", () => {
    expect(names.length).toBe(buildInfo.styles[style].count);
    for (const name of names) expect(barrel[name].name).toBe(name);
  });

  it("renders a decorative 24px icon by default", async () => {
    const html = await render(Icon);
    expect(html).toMatch(/^<svg /);
    expect(html).toContain('width="24"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('viewBox="');
    expect(html).not.toContain("<title");
  });

  it("exposes an accessible name when a title is given", async () => {
    const html = await render(Icon, { title: "Buscar" });
    expect(html).toContain('role="img"');
    expect(html).not.toContain("aria-hidden");
    const id = html.match(/aria-labelledby="([^"]+)"/)?.[1];
    expect(id).toBeTruthy();
    expect(html).toContain(`<title id="${id}">Buscar</title>`);
  });

  it("lets consumer attributes override generated defaults", async () => {
    const html = await render(Icon, {
      size: 16,
      class: "icon",
      fill: "red",
      "aria-hidden": "false",
    });
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
});
