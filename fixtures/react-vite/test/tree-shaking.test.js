import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { describe, expect, it } from "vitest";

const fixtureRoot = fileURLToPath(new URL("..", import.meta.url));
const barrelUrl = import.meta.resolve("@klima-ds/icons-react/linear");
const barrel = await readFile(new URL(barrelUrl), "utf8");
// Maps exported component names to their per-icon module, e.g. SearchNormal -> search-normal.
const modules = Object.fromEntries(
  [...barrel.matchAll(/export \{ (\w+) \} from "\.\/([\w-]+)\.js";/g)].map(([, name, file]) => [
    name,
    file,
  ]),
);
const names = Object.keys(modules).sort();

/** Longest path data of an icon: a fingerprint that only appears if the icon is bundled. */
async function fingerprint(name) {
  const source = await readFile(new URL(`./${modules[name]}.js`, barrelUrl), "utf8");
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
      rollupOptions: { input: "virtual:entry", external: [/^react($|\/)/, /^react-dom($|\/)/] },
    },
  });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap((entry) => entry.output);
  return outputs.map((chunk) => chunk.code ?? "").join("\n");
}

describe("@klima-ds/icons-react tree-shaking", () => {
  const [first, second] = names;
  const control = names.at(-1);

  it("has enough icons to compare", async () => {
    expect(names.length).toBeGreaterThanOrEqual(3);
    expect(await fingerprint(first)).not.toBe(await fingerprint(control));
  });

  it("bundles only the icon imported from the style barrel", async () => {
    const code = await bundle(
      `import { ${first} } from "@klima-ds/icons-react/linear";\nglobalThis.icons = [${first}];`,
    );
    expect(code).toContain(await fingerprint(first));
    expect(code).not.toContain(await fingerprint(second));
    expect(code).not.toContain(await fingerprint(control));
  });

  it("bundles several named imports without the rest of the catalog", async () => {
    const code = await bundle(
      `import { ${first}, ${second} } from "@klima-ds/icons-react/linear";\nglobalThis.icons = [${first}, ${second}];`,
    );
    expect(code).toContain(await fingerprint(first));
    expect(code).toContain(await fingerprint(second));
    expect(code).not.toContain(await fingerprint(control));
  });

  it("supports per-icon subpath imports", async () => {
    const code = await bundle(
      `import Icon from "@klima-ds/icons-react/linear/${modules[control]}";\nglobalThis.icons = [Icon];`,
    );
    expect(code).toContain(await fingerprint(control));
    expect(code).not.toContain(await fingerprint(first));
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
