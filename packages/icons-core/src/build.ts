import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { GeneratedStyle } from "./generate.js";
import { generatableEntries, type Inventory } from "./inventory.js";
import { ICON_STYLES } from "./naming.js";
import { normalizeSvg } from "./normalize.js";

export interface StyleInfo {
  count: number;
  unconfirmedProvenance: number;
  multicolor: string[];
}

export interface BuildInfo {
  /** `figma` when built from pulled sources; `synthetic` builds can never be published. */
  source: "figma" | "synthetic";
  styles: Record<string, StyleInfo>;
}

export interface CollectedStyles {
  styles: GeneratedStyle[];
  buildInfo: BuildInfo;
}

/** Root of the @klima-ds/icons-core package (inventory/, sources/ and test-fixtures/). */
export const CORE_ROOT = fileURLToPath(new URL("..", import.meta.url));
const SYNTHETIC = ["stroke", "fill", "twotone", "clip"];

async function figmaStyles(): Promise<(GeneratedStyle & { info: StyleInfo })[]> {
  const styles = [];
  for (const style of ICON_STYLES) {
    const inventoryPath = join(CORE_ROOT, "inventory", `${style}.json`);
    const sourceDir = join(CORE_ROOT, "sources", style);
    if (!existsSync(inventoryPath) || !existsSync(sourceDir)) continue;
    const inventory = JSON.parse(await readFile(inventoryPath, "utf8")) as Inventory;
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

async function syntheticStyles(): Promise<(GeneratedStyle & { info: StyleInfo })[]> {
  const icons = await Promise.all(
    SYNTHETIC.map(async (name) => {
      const file = join(CORE_ROOT, "test-fixtures", `${name}.svg`);
      return { name, source: await readFile(file, "utf8"), file };
    }),
  );
  // Each style gets one extra style-specific path so styles stay distinguishable in tests.
  return ICON_STYLES.map((style, index) => ({
    style,
    icons: icons.map(({ name, source, file }) => ({
      name: `synthetic-${name}`,
      component: `Synthetic${name.charAt(0).toUpperCase()}${name.slice(1)}`,
      node: normalizeSvg(
        source.replace("</svg>", `<path d="M${index + 1} 1h${index + 2}" stroke="#292D32"/></svg>`),
        { file, idPrefix: `klima-${style}-synthetic-${name}` },
      ).node,
    })),
    info: { count: icons.length, unconfirmedProvenance: 0, multicolor: [] },
  }));
}

/**
 * Normalized icons of every style, read from the pulled sources. Without sources (e.g. CI)
 * it returns a synthetic set from the test fixtures so consumption tests still run.
 */
export async function collectStyles(label: string): Promise<CollectedStyles> {
  let styles = await figmaStyles();
  const missing = ICON_STYLES.filter((style) => !styles.some((entry) => entry.style === style));
  if (styles.length > 0 && missing.length > 0)
    throw new Error(
      `${label}: missing pulled sources for ${missing.join(", ")}. ` +
        `Run \`pnpm --filter @klima-ds/icons-core pull ${missing.join(" ")}\`.`,
    );
  const source = styles.length > 0 ? "figma" : "synthetic";
  if (source === "synthetic") {
    console.warn(
      `${label}: no pulled sources found; building the synthetic fixture set (not publishable). ` +
        "Run `pnpm --filter @klima-ds/icons-core pull` to build real icons.",
    );
    styles = await syntheticStyles();
  }
  return {
    styles: styles.map(({ style, icons }) => ({ style, icons })),
    buildInfo: {
      source,
      styles: Object.fromEntries(styles.map(({ style, info }) => [style, info])),
    },
  };
}

/** Replaces outDir with the generated files and the build-info.json manifest. */
export async function writeBuild(
  label: string,
  outDir: string,
  files: ReadonlyMap<string, string>,
  buildInfo: BuildInfo,
): Promise<void> {
  await rm(outDir, { recursive: true, force: true });
  for (const [path, content] of files) {
    await mkdir(dirname(join(outDir, path)), { recursive: true });
    await writeFile(join(outDir, path), content);
  }
  await writeFile(join(outDir, "build-info.json"), `${JSON.stringify(buildInfo, null, 2)}\n`);
  console.log(
    `${label}: ${buildInfo.source} build ->`,
    Object.fromEntries(
      Object.entries(buildInfo.styles).map(([style, info]) => [style, info.count]),
    ),
  );
}

/** Reasons a build must not be published (TASK-013). Empty when publishable. */
export function publishProblems(buildInfo: BuildInfo): string[] {
  const problems: string[] = [];
  if (buildInfo.source !== "figma") problems.push(`build source is "${buildInfo.source}"`);
  for (const [style, info] of Object.entries(buildInfo.styles))
    if (info.unconfirmedProvenance > 0)
      problems.push(`${style}: ${info.unconfirmedProvenance} icons without confirmed provenance`);
  return problems;
}

/** Exits the process with an explanation when the build in outDir is not publishable. */
export async function assertPublishable(label: string, outDir: string): Promise<void> {
  const buildInfo = JSON.parse(
    await readFile(join(outDir, "build-info.json"), "utf8"),
  ) as BuildInfo;
  const problems = publishProblems(buildInfo);
  if (problems.length > 0) {
    console.error(`Refusing to publish ${label}:\n- ${problems.join("\n- ")}`);
    process.exit(1);
  }
  console.log(`${label}: publishable build`);
}
