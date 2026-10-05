#!/usr/bin/env node
// Blocks publishing icons without confirmed provenance (TASK-013) or synthetic builds.

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const buildInfoPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "dist",
  "build-info.json",
);
const buildInfo = JSON.parse(await readFile(buildInfoPath, "utf8"));
const problems = [];
if (buildInfo.source !== "figma") problems.push(`build source is "${buildInfo.source}"`);
for (const [style, info] of Object.entries(buildInfo.styles))
  if (info.unconfirmedProvenance > 0)
    problems.push(`${style}: ${info.unconfirmedProvenance} icons without confirmed provenance`);

if (problems.length > 0) {
  console.error(`Refusing to publish @klima-ds/icons-react:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log("icons-react: publishable build");
