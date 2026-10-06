#!/usr/bin/env node
// Fails when dist/ does not match what the current token sources generate (TASK-010).

import { fileURLToPath, pathToFileURL } from "node:url";

const distDir = fileURLToPath(new URL("../dist", import.meta.url));
let checkGenerated;
try {
  ({ checkGenerated } = await import(pathToFileURL(`${distDir}/generate.js`).href));
} catch {
  console.error("FAIL dist/ is missing; run `pnpm --filter @klima-ds/themes build`.");
  process.exit(1);
}

const drift = checkGenerated(distDir);
if (drift.length > 0) {
  for (const { file, problem } of drift) console.error(`FAIL dist/${file} is ${problem}`);
  console.error("Run `pnpm --filter @klima-ds/themes build` to regenerate the artifacts.");
  process.exit(1);
}
console.log("PASS generated artifacts match the theme sources.");
