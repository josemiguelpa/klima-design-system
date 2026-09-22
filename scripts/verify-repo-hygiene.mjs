#!/usr/bin/env node
// Verifies no generated output, cache, tarball or secret is tracked by git (TASK-001, retired in TASK-003).
// Workspace directory presence is covered by `pnpm ls -r --depth -1` (TASK-002).
// Node and pnpm version checks are covered by `.node-version` and `packageManager` in CI (TASK-003).
// Dependency-free and portable across Linux, macOS and Windows.

import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");

// Tracked paths that must never be versioned: outputs, caches, tarballs and secrets.
// Like .gitignore, name rules match any path segment (file or directory).
// Paths are lowercased because Windows and macOS filesystems are case-insensitive by default.
const forbiddenPathRules = [
  { label: "dependencies", test: (p) => hasDirectory(p, "node_modules", ".pnpm-store") },
  { label: "build output", test: (p) => hasDirectory(p, "dist", "build", "storybook-static") },
  { label: "build output", test: (p) => p.endsWith(".tsbuildinfo") },
  { label: "cache", test: (p) => hasDirectory(p, ".turbo", ".cache", "coverage", ".astro") },
  { label: "cache", test: (p) => segments(p).includes(".eslintcache") },
  { label: "tarball", test: (p) => p.endsWith(".tgz") },
  { label: "log", test: (p) => p.endsWith(".log") },
  { label: "secret", test: (p) => segments(p).some(isEnvName) || p.endsWith(".pem") },
];

function segments(path) {
  return path.split("/");
}

function hasDirectory(path, ...names) {
  return segments(path)
    .slice(0, -1)
    .some((segment) => names.includes(segment));
}

function isEnvName(name) {
  return (name === ".env" || name.startsWith(".env.")) && name !== ".env.example";
}

function checkTrackedFiles() {
  const output = execFileSync("git", ["ls-files", "-z"], { cwd: rootDir, encoding: "utf8" });
  const violations = output
    .split("\0")
    .filter(Boolean)
    .flatMap((path) => {
      const rule = forbiddenPathRules.find(({ test }) => test(path.toLowerCase()));
      return rule ? [`${path} (${rule.label})`] : [];
    });
  return [
    violations.length === 0,
    violations.length === 0
      ? "git ls-files contains no outputs, caches, tarballs or secrets"
      : `Forbidden tracked files:\n    ${violations.join("\n    ")}`,
  ];
}

let failed = false;
for (const check of [checkTrackedFiles]) {
  let ok;
  let message;
  try {
    [ok, message] = check();
  } catch (error) {
    [ok, message] = [false, error.message];
  }
  failed ||= !ok;
  console.log(`${ok ? "PASS" : "FAIL"} ${message}`);
}

process.exitCode = failed ? 1 : 0;
