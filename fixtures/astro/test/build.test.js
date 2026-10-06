import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "astro";
import { beforeAll, describe, expect, it } from "vitest";

const fixtureRoot = fileURLToPath(new URL("..", import.meta.url));
const site = new URL("../.test-site/", import.meta.url);

/** Exported components of a style mapped to their .astro module, e.g. SearchNormal -> search-normal. */
async function catalog(style) {
  const barrelUrl = import.meta.resolve(`@klima-ds/icons-astro/${style}`);
  const barrel = await readFile(new URL(barrelUrl), "utf8");
  return {
    barrelUrl,
    modules: Object.fromEntries(
      [...barrel.matchAll(/export \{ default as (\w+) \} from "\.\/([\w-]+)\.astro";/g)].map(
        ([, name, file]) => [name, file],
      ),
    ),
  };
}

/** Path data of an icon in the given style, as it appears in rendered HTML. */
async function paths(name, style) {
  const { barrelUrl, modules } = await catalog(style);
  const source = await readFile(new URL(`./${modules[name]}.astro`, barrelUrl), "utf8");
  const inner = JSON.parse(source.match(/const inner = (".*");/)[1]);
  return [...inner.matchAll(/ d="([^"]+)"/g)].map(([, d]) => d);
}

const linear = await catalog("linear");
const names = Object.keys(linear.modules).sort();
const [first, second] = names;
const control = names.at(-1);
let html;
let clientAssets;

beforeAll(async () => {
  await rm(site, { recursive: true, force: true });
  await mkdir(new URL("src/pages/", site), { recursive: true });
  await writeFile(
    new URL("src/pages/index.astro", site),
    `---\nimport { ${first} } from "@klima-ds/icons-astro/linear";\n` +
      `import Second from "@klima-ds/icons-astro/linear/${linear.modules[second]}";\n---\n` +
      `<html lang="es"><body>\n<${first} />\n` +
      `<Second title="Buscar" size={20} class="icon" fill="red" aria-hidden="false" />\n</body></html>\n`,
  );
  await build({ root: fileURLToPath(site), logLevel: "error", telemetry: false });
  html = await readFile(new URL("dist/index.html", site), "utf8");
  clientAssets = await readdir(new URL("dist/", site), { recursive: true });
});

describe("@klima-ds/icons-astro in an Astro site", () => {
  it("renders the imported icons from the barrel and from a subpath", async () => {
    for (const d of await paths(first, "linear")) expect(html).toContain(d);
    for (const d of await paths(second, "linear")) expect(html).toContain(d);
  });

  it("does not ship icons or styles that were not imported", async () => {
    const used = new Set([...(await paths(first, "linear")), ...(await paths(second, "linear"))]);
    const unused = [
      ...(await paths(control, "linear")),
      ...(await paths(first, "bold")),
      ...(await paths(first, "broken")),
    ].filter((d) => !used.has(d));
    expect(unused.length).toBeGreaterThan(0);
    for (const d of unused) expect(html).not.toContain(d);
  });

  it("applies accessibility defaults and consumer attributes", () => {
    const svgs = html.match(/<svg[^>]*>/g);
    expect(svgs).toHaveLength(2);
    expect(svgs[0]).toContain('aria-hidden="true"');
    expect(svgs[0]).toContain('width="24"');
    expect(svgs[1]).toContain('role="img"');
    expect(svgs[1]).toContain('width="20"');
    expect(svgs[1]).toContain('class="icon"');
    expect(svgs[1]).toContain('fill="red"');
    expect(svgs[1]).not.toContain('fill="none"');
    const id = svgs[1].match(/aria-labelledby="([^"]+)"/)[1];
    expect(html).toContain(`<title id="${id}">Buscar</title>`);
  });

  it("ships no client-side JavaScript", () => {
    expect(html).not.toContain("<script");
    expect(clientAssets.filter((file) => file.endsWith(".js"))).toEqual([]);
  });

  it("type-checks the public API", () => {
    const tsc = createRequire(import.meta.url).resolve("typescript/bin/tsc");
    expect(() =>
      execFileSync(process.execPath, [tsc, "-p", "tsconfig.json"], {
        cwd: fixtureRoot,
        stdio: "pipe",
      }),
    ).not.toThrow();
  });
});
