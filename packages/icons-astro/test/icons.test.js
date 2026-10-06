import { readFile, readdir } from "node:fs/promises";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";

const STYLES = ["linear", "bold", "twotone", "bulk", "broken"];
const dist = new URL("../dist/", import.meta.url);
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const buildInfo = JSON.parse(await readFile(new URL("build-info.json", dist), "utf8"));
const container = await AstroContainer.create();
const render = (component, props = {}) => container.renderToString(component, { props });

it("exposes exactly one barrel and one subpath export per style", () => {
  expect(Object.keys(packageJson.exports).sort()).toEqual(
    [...STYLES.flatMap((style) => [`./${style}`, `./${style}/*`]), "./package.json"].sort(),
  );
  expect(Object.keys(buildInfo.styles).sort()).toEqual([...STYLES].sort());
});

it("does not depend on React or Vue", async () => {
  expect(packageJson.peerDependencies).toEqual({ astro: "^7.0.0" });
  for (const file of ["Svg.astro", "title-id.js"])
    expect(await readFile(new URL(file, dist), "utf8")).not.toMatch(/from "(react|vue)/);
});

describe.each(STYLES)("@klima-ds/icons-astro/%s", (style) => {
  it("re-exports one .astro component per generated icon", async () => {
    const index = await readFile(new URL(`${style}/index.js`, dist), "utf8");
    const exports = [
      ...index.matchAll(/export \{ default as (\w+) \} from "\.\/([\w-]+)\.astro";/g),
    ];
    expect(exports.length).toBe(buildInfo.styles[style].count);
    const files = (await readdir(new URL(`${style}/`, dist))).filter((file) =>
      file.endsWith(".astro"),
    );
    expect(files.sort()).toEqual(exports.map(([, , file]) => `${file}.astro`).sort());
  });

  describe("rendering", async () => {
    const index = await readFile(new URL(`${style}/index.js`, dist), "utf8");
    const [, first] = index.match(/from "\.\/([\w-]+)\.astro"/);
    const { default: Icon } = await import(new URL(`${style}/${first}.astro`, dist).href);

    it("renders a decorative 24px icon by default", async () => {
      const html = await render(Icon);
      expect(html).toMatch(/^<svg /);
      expect(html).toContain('width="24"');
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('viewBox="');
      expect(html).not.toContain("<title");
    });

    it("exposes an accessible name when a title is given", async () => {
      const html = await render(Icon, { title: "Buscar <ok>" });
      expect(html).toContain('role="img"');
      expect(html).not.toContain("aria-hidden");
      const id = html.match(/aria-labelledby="([^"]+)"/)?.[1];
      expect(id).toBeTruthy();
      expect(html).toContain(`<title id="${id}">Buscar &lt;ok&gt;</title>`);
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
      expect(html).not.toContain('fill="none"');
      expect(html).toContain('aria-hidden="false"');
    });
  });
});
