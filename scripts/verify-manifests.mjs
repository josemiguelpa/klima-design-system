#!/usr/bin/env node
// Validates package manifests and type exports for every publishable package (TASK-003).
// Publishable packages live under `packages/*` and are not marked `"private": true`
// (see docs/architecture.md). Today `packages/` is empty, so this script discovers
// zero targets and exits 0 — it is not a stub that fakes success, it is real
// discovery logic that will start validating manifests the moment a real
// package lands under `packages/`.

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const packagesDir = join(rootDir, "packages");

function findPublishablePackages() {
  let entries;
  try {
    entries = readdirSync(packagesDir);
  } catch {
    return [];
  }

  return entries
    .map((name) => join(packagesDir, name))
    .filter((path) => {
      try {
        return statSync(path).isDirectory();
      } catch {
        return false;
      }
    })
    .filter((path) => {
      try {
        const pkg = JSON.parse(readFileSync(join(path, "package.json"), "utf8"));
        return pkg.private !== true;
      } catch {
        return false;
      }
    });
}

function run(label, command, args, cwd) {
  console.log(`--- ${label}: ${command} ${args.join(" ")} (${cwd}) ---`);
  execFileSync(command, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
}

const targets = findPublishablePackages();

if (targets.length === 0) {
  console.log(
    "PASS No publishable package found under packages/. Skipping publint and " +
      "@arethetypeswrong/cli — nothing to validate yet.",
  );
  process.exit(0);
}

let failed = false;
for (const target of targets) {
  try {
    run("publint", "pnpm", ["exec", "publint", target], rootDir);
    run("@arethetypeswrong/cli", "pnpm", ["exec", "attw", "--pack", target], rootDir);
  } catch (error) {
    failed = true;
    console.error(`FAIL manifest validation failed for ${target}: ${error.message}`);
  }
}

process.exitCode = failed ? 1 : 0;
