#!/usr/bin/env node
// Builds @klima-ds/themes (TASK-010): compiles the generator with tsc, then writes one
// stylesheet per brand into dist/. Clean, deterministic and shell-free.

import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const distDir = join(packageRoot, "dist");
const tsc = createRequire(import.meta.url).resolve("typescript/bin/tsc");

rmSync(distDir, { recursive: true, force: true });
execFileSync(process.execPath, [tsc, "-p", "tsconfig.build.json"], {
  cwd: packageRoot,
  stdio: "inherit",
});

const { generateThemes } = await import(pathToFileURL(join(distDir, "generate.js")).href);
for (const [file, content] of Object.entries(generateThemes())) {
  const target = join(distDir, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}
