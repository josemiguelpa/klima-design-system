import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { describe, expect, it } from "vitest";

const fixtureRoot = fileURLToPath(new URL("..", import.meta.url));
const STYLES = ["linear", "bold", "twotone", "bulk", "broken"];

/** Maps exported component names to their per-icon module, e.g. SearchNormal -> search-normal. */
async function catalog(style) {
  const barrelUrl = import.meta.resolve(`@klima-ds/icons-vue/${style}`);
  const barrel = await readFile(new URL(barrelUrl), "utf8");
  const modules = Object.fromEntries(
    [...barrel.matchAll(/export \{ (\w+) \} from "\.\/([\w-]+)\.js";/g)].map(([, name, file]) => [
      name,
      file,
    ]),
  );
  return { barrelUrl, modules, names: Object.keys(modules).sort() };
}
const catalogs = Object.fromEntries(
  await Promise.all(STYLES.map(async (style) => [style, await catalog(style)])),
);
const { modules, names } = catalogs.linear;

/** Longest path data of an icon: a fingerprint that only appears if the icon is bundled. */
async function fingerprint(name, style = "linear") {
  const { barrelUrl, modules: styleModules } = catalogs[style];
  const source = await readFile(new URL(`./${styleModules[name]}.js`, barrelUrl), "utf8");
  const paths = [...source.matchAll(/"d":"([^"]+)"/g)].map(([, d]) => d);
  return paths.sort((a, b) => b.length - a.length)[0];
}

async function bundle(code) {
  const result = await build({
    root: fixtureRoot,
    configFile: false,
    logLevel: "silent",
    plugins: [
      {
        name: "virtual-entry",
        resolveId: (id) => (id === "virtual:entry" ? "\0virtual:entry" : undefined),
        load: (id) => (id === "\0virtual:entry" ? code : undefined),
      },
    ],
    build: {
      write: false,
      minify: false,
      rollupOptions: { input: "virtual:entry", external: [/^vue($|\/)/, /^@vue\//] },
    },
  });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap((entry) => entry.output);
  return outputs.map((chunk) => chunk.code ?? "").join("\n");
}

describe("@klima-ds/icons-vue tree-shaking", () => {
  const [first, second] = names;
  const control = names.at(-1);

  it("has enough icons to compare", async () => {
    expect(names.length).toBeGreaterThanOrEqual(3);
    expect(await fingerprint(first)).not.toBe(await fingerprint(control));
  });

  it("bundles only the icon imported from the style barrel", async () => {
    const code = await bundle(
      `import { ${first} } from "@klima-ds/icons-vue/linear";\nglobalThis.icons = [${first}];`,
    );
    expect(code).toContain(await fingerprint(first));
    expect(code).not.toContain(await fingerprint(second));
    expect(code).not.toContain(await fingerprint(control));
  });

  it("bundles several named imports without the rest of the catalog", async () => {
    const code = await bundle(
      `import { ${first}, ${second} } from "@klima-ds/icons-vue/linear";\nglobalThis.icons = [${first}, ${second}];`,
    );
    expect(code).toContain(await fingerprint(first));
    expect(code).toContain(await fingerprint(second));
    expect(code).not.toContain(await fingerprint(control));
  });

  it("supports per-icon subpath imports", async () => {
    const code = await bundle(
      `import Icon from "@klima-ds/icons-vue/linear/${modules[control]}";\nglobalThis.icons = [Icon];`,
    );
    expect(code).toContain(await fingerprint(control));
    expect(code).not.toContain(await fingerprint(first));
  });

  it("bundles only the imported styles of an icon available in every style", async () => {
    // An icon present in all styles where each style has path data no other style contains.
    const sourceOf = async (name, style) =>
      readFile(new URL(`./${modules[name]}.js`, catalogs[style].barrelUrl), "utf8");
    let shared;
    let prints;
    for (const name of names) {
      if (!STYLES.every((style) => catalogs[style].modules[name] === modules[name])) continue;
      const sources = Object.fromEntries(
        await Promise.all(STYLES.map(async (style) => [style, await sourceOf(name, style)])),
      );
      const unique = Object.fromEntries(
        STYLES.map((style) => {
          const own = [...sources[style].matchAll(/"d":"([^"]+)"/g)].map(([, d]) => d);
          const others = STYLES.filter((other) => other !== style).map((other) => sources[other]);
          const candidates = own.filter((d) => others.every((source) => !source.includes(d)));
          return [style, candidates.sort((a, b) => b.length - a.length)[0]];
        }),
      );
      if (STYLES.every((style) => unique[style])) {
        shared = name;
        prints = unique;
        break;
      }
    }
    expect(shared).toBeTruthy();

    const linearOnly = await bundle(
      `import { ${shared} } from "@klima-ds/icons-vue/linear";\nglobalThis.icons = [${shared}];`,
    );
    expect(linearOnly).toContain(prints.linear);
    for (const style of STYLES.filter((style) => style !== "linear"))
      expect(linearOnly, style).not.toContain(prints[style]);

    const mixed = await bundle(
      `import { ${shared} } from "@klima-ds/icons-vue/linear";\n` +
        `import { ${shared} as Bold } from "@klima-ds/icons-vue/bold";\n` +
        `globalThis.icons = [${shared}, Bold];`,
    );
    expect(mixed).toContain(prints.linear);
    expect(mixed).toContain(prints.bold);
    for (const style of ["twotone", "bulk", "broken"])
      expect(mixed, style).not.toContain(prints[style]);
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
