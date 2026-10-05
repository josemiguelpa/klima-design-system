#!/usr/bin/env node
// Generates dist/ from the icon inventory and SVG sources of @klima-ds/icons-core.
// When the git-ignored sources are absent (e.g. CI), it builds a synthetic set from the
// icons-core test fixtures so consumption tests still run; such builds can never be published.

import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ICON_STYLES, generatableEntries, normalizeSvg, renderReact } from "@klima-ds/icons-core";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const coreRoot = join(fileURLToPath(import.meta.resolve("@klima-ds/icons-core")), "..", "..");
const outDir = join(packageRoot, "dist");
const SYNTHETIC = ["stroke", "fill", "twotone", "clip"];

async function figmaStyles() {
  const styles = [];
  for (const style of ICON_STYLES) {
    const inventoryPath = join(coreRoot, "inventory", `${style}.json`);
    const sourceDir = join(coreRoot, "sources", style);
    if (!existsSync(inventoryPath) || !existsSync(sourceDir)) continue;
    const inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
    const entries = generatableEntries(inventory);
    const icons = await Promise.all(
      entries.map(async (entry) => {
        const file = join(sourceDir, `${entry.figma.nodeId.replace(":", "-")}.svg`);
        const normalized = normalizeSvg(await readFile(file, "utf8"), {
          file,
          idPrefix: `klima-${style}-${entry.name}`,
        });
        return { entry, normalized };
      }),
    );
    styles.push({
      style,
      icons: icons.map(({ entry, normalized }) => ({
        name: entry.name,
        component: entry.component,
        node: normalized.node,
      })),
      info: {
        count: icons.length,
        unconfirmedProvenance: entries.filter((entry) => entry.provenance !== "confirmed").length,
        multicolor: icons
          .filter(({ normalized }) => normalized.multicolor)
          .map(({ entry }) => entry.name),
      },
    });
  }
  return styles;
}

async function syntheticStyles() {
  const icons = await Promise.all(
    SYNTHETIC.map(async (name) => {
      const file = join(coreRoot, "test-fixtures", `${name}.svg`);
      const { node } = normalizeSvg(await readFile(file, "utf8"), {
        file,
        idPrefix: `klima-linear-synthetic-${name}`,
      });
      const component = `Synthetic${name.charAt(0).toUpperCase()}${name.slice(1)}`;
      return { name: `synthetic-${name}`, component, node };
    }),
  );
  return [
    {
      style: "linear",
      icons,
      info: { count: icons.length, unconfirmedProvenance: 0, multicolor: [] },
    },
  ];
}

let styles = await figmaStyles();
const source = styles.length > 0 ? "figma" : "synthetic";
if (source === "synthetic") {
  console.warn(
    "icons-react: no pulled sources found; building the synthetic fixture set (not publishable). " +
      "Run `pnpm --filter @klima-ds/icons-core pull` to build real icons.",
  );
  styles = await syntheticStyles();
}

const files = renderReact(styles);
await rm(outDir, { recursive: true, force: true });
for (const [path, content] of files) {
  await mkdir(dirname(join(outDir, path)), { recursive: true });
  await writeFile(join(outDir, path), content);
}
const buildInfo = {
  source,
  styles: Object.fromEntries(styles.map(({ style, info }) => [style, info])),
};
await writeFile(join(outDir, "build-info.json"), `${JSON.stringify(buildInfo, null, 2)}\n`);
console.log(
  `icons-react: ${source} build ->`,
  Object.fromEntries(styles.map(({ style, info }) => [style, info.count])),
);
