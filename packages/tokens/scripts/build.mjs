#!/usr/bin/env node
// Builds @klima-ds/tokens (TASK-009): compiles the tooling with tsc, then writes the
// generated CSS and TypeScript artifacts into dist/. Clean, deterministic and shell-free.

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

const { generateArtifacts } = await import(pathToFileURL(join(distDir, "generate.js")).href);
for (const [file, content] of Object.entries(generateArtifacts())) {
  const target = join(distDir, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}
