#!/usr/bin/env node
// Verifies the workspace bootstrap contract (TASK-001).
// Dependency-free and portable across Linux, macOS and Windows.

import { execFileSync, execSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const requiredDirs = ["apps", "packages", "tooling", "fixtures"];

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

function parseVersion(version) {
  const [major = 0, minor = 0, patch = 0] = version
    .replace(/^v/, "")
    .split("-")[0]
    .split(".")
    .map(Number);
  return [major, minor, patch];
}

function compareVersions(a, b) {
  const [left, right] = [parseVersion(a), parseVersion(b)];
  for (let i = 0; i < 3; i++) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return 0;
}

// Supports space-separated comparators, e.g. ">=24.0.0 <25.0.0".
function satisfiesRange(version, range) {
  return range
    .trim()
    .split(/\s+/)
    .every((token) => {
      const match = /^(>=|<=|>|<|=)?(\d+(?:\.\d+){0,2})$/.exec(token);
      if (!match) throw new Error(`Unsupported engines range token: "${token}"`);
      const [, operator = "=", target] = match;
      const diff = compareVersions(version, target);
      return {
        ">=": diff >= 0,
        "<=": diff <= 0,
        ">": diff > 0,
        "<": diff < 0,
        "=": diff === 0,
      }[operator];
    });
}

function detectPnpmVersion() {
  const userAgent = process.env.npm_config_user_agent ?? "";
  const fromAgent = /\bpnpm\/(\S+)/.exec(userAgent);
  if (fromAgent) return fromAgent[1];
  // Shell is required so Windows resolves pnpm.cmd.
  return execSync("pnpm --version", { cwd: rootDir, encoding: "utf8" }).trim();
}

function checkNode(pkg) {
  const range = pkg.engines?.node;
  if (!range) return [false, "package.json is missing engines.node"];
  const current = process.versions.node;
  const ok = satisfiesRange(current, range);
  return [ok, `Node ${current} ${ok ? "satisfies" : "does not satisfy"} engines.node "${range}"`];
}

function checkPnpm(pkg) {
  const match = /^pnpm@(\d+\.\d+\.\d+)(?:\+.*)?$/.exec(pkg.packageManager ?? "");
  if (!match)
    return [false, `packageManager must pin an exact pnpm version, got "${pkg.packageManager}"`];
  const current = detectPnpmVersion();
  const ok = current === match[1];
  return [
    ok,
    `pnpm ${current} ${ok ? "matches" : "does not match"} packageManager pnpm@${match[1]}`,
  ];
}

function checkDirectories() {
  const missing = requiredDirs.filter((dir) => {
    try {
      return !statSync(join(rootDir, dir)).isDirectory();
    } catch {
      return true;
    }
  });
  return [
    missing.length === 0,
    missing.length === 0
      ? `Workspace directories exist: ${requiredDirs.join(", ")}`
      : `Missing workspace directories: ${missing.join(", ")}`,
  ];
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

const pkg = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf8"));
const checks = [() => checkNode(pkg), () => checkPnpm(pkg), checkDirectories, checkTrackedFiles];

let failed = false;
for (const check of checks) {
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
