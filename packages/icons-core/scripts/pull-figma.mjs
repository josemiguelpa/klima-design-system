#!/usr/bin/env node
// Pulls icon components from the Figma icon file through the REST API, stores the raw
// SVG sources under sources/<style>/ (git-ignored while provenance is unconfirmed) and
// writes the reviewable inventory to inventory/<style>.json.
//
// Usage: pnpm --filter @klima-ds/icons-core pull [style...]
// Token: FIGMA_TOKEN or ~/.config/figma/token (read-only "File content" scope).

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ICON_STYLES, buildInventory } from "../dist/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await readFile(join(root, "figma.config.json"), "utf8"));
const API = "https://api.figma.com/v1";
const IMAGE_BATCH = 100;
const CONCURRENCY = 8;

async function token() {
  if (process.env.FIGMA_TOKEN) return process.env.FIGMA_TOKEN.trim();
  try {
    return (await readFile(join(homedir(), ".config", "figma", "token"), "utf8")).trim();
  } catch {
    throw new Error("Missing Figma token: set FIGMA_TOKEN or create ~/.config/figma/token");
  }
}

async function request(url, headers, attempt = 1) {
  const response = await fetch(url, { headers });
  if (response.status === 429 && attempt <= 5) {
    const wait = Number(response.headers.get("retry-after") ?? 2 ** attempt) * 1000;
    await new Promise((resolve) => setTimeout(resolve, wait));
    return request(url, headers, attempt + 1);
  }
  if (!response.ok)
    throw new Error(`${response.status} ${response.statusText} for ${url.split("?")[0]}`);
  return response;
}

function collectComponents(page) {
  const found = [];
  const visit = (node, frame, variantOf) => {
    if (node.type === "COMPONENT") {
      const box = node.absoluteBoundingBox ?? { width: 0, height: 0 };
      found.push({
        nodeId: node.id,
        figmaName: node.name,
        frame,
        width: Math.round(box.width),
        height: Math.round(box.height),
        ...(variantOf ? { variantOf } : {}),
      });
      return;
    }
    for (const child of node.children ?? [])
      visit(child, frame, node.type === "COMPONENT_SET" ? node.name : variantOf);
  };
  for (const child of page.children ?? []) visit(child, child.name, undefined);
  return found;
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await fn(items[index]);
      }
    }),
  );
  return results;
}

async function pullStyle(style, headers) {
  const pageId = config.pages[style];
  const nodes = await (
    await request(`${API}/files/${config.fileKey}/nodes?ids=${encodeURIComponent(pageId)}`, headers)
  ).json();
  const page = nodes.nodes?.[pageId]?.document;
  if (!page) throw new Error(`Page ${pageId} (${style}) not found in ${config.fileKey}`);
  const components = collectComponents(page);

  const urls = {};
  for (let i = 0; i < components.length; i += IMAGE_BATCH) {
    const ids = components
      .slice(i, i + IMAGE_BATCH)
      .map((c) => c.nodeId)
      .join(",");
    const params = new URLSearchParams({ ids, format: "svg", svg_include_id: "false" });
    const body = await (await request(`${API}/images/${config.fileKey}?${params}`, headers)).json();
    if (body.err) throw new Error(`Figma image export failed: ${body.err}`);
    Object.assign(urls, body.images);
  }

  const raws = await mapLimit(components, CONCURRENCY, async (component) => {
    const url = urls[component.nodeId];
    if (!url) return { ...component, svg: "", exportFailed: true };
    return { ...component, svg: await (await request(url, {})).text() };
  });

  const sourceDir = join(root, "sources", style);
  await rm(sourceDir, { recursive: true, force: true });
  await mkdir(sourceDir, { recursive: true });
  await Promise.all(
    raws
      .filter((raw) => !raw.exportFailed)
      .map((raw) => writeFile(join(sourceDir, `${raw.nodeId.replace(":", "-")}.svg`), raw.svg)),
  );

  const inventory = buildInventory(config.fileKey, style, raws, {
    thirdPartyLogoFrames: config.thirdPartyLogoFrames?.[style] ?? [],
  });
  await mkdir(join(root, "inventory"), { recursive: true });
  await writeFile(
    join(root, "inventory", `${style}.json`),
    `${JSON.stringify(inventory, null, 2)}\n`,
  );

  const counts = {};
  for (const entry of inventory.entries) counts[entry.status] = (counts[entry.status] ?? 0) + 1;
  console.log(`${style}: ${raws.length} components ->`, counts);
}

const requested = process.argv.slice(2);
const styles = requested.length > 0 ? requested : ["linear"];
for (const style of styles)
  if (!ICON_STYLES.includes(style) || !config.pages[style])
    throw new Error(`Unknown style: ${style}`);

const headers = { "X-Figma-Token": await token() };
for (const style of styles) await pullStyle(style, headers);
