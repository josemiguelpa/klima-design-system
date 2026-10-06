import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import manifest from "../manifest.json" with { type: "json" };
import { validateInternal } from "./validator.js";
import { LAYER_RANK } from "./types.js";
import type {
  AssembleOptions,
  AssembledTokens,
  Diagnostic,
  TokenManifest,
  TokenLayer,
  ValidationResult,
} from "./types.js";
export { manifest };

type Obj = Record<string, unknown>;
const layerRank = LAYER_RANK;
const modeName = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
function defaultRoot(): string {
  return fileURLToPath(new URL("../", import.meta.url));
}
function object(value: unknown): value is Obj {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function token(node: Obj): boolean {
  return "$value" in node || "$ref" in node;
}
function paths(node: Obj, prefix = ""): string[] {
  const output: string[] = [];
  if (token(node)) output.push(prefix);
  else
    for (const [key, value] of Object.entries(node))
      if (!key.startsWith("$") && object(value))
        output.push(...paths(value, prefix ? `${prefix}.${key}` : key));
  return output;
}
function merge(target: Obj, source: Obj, sourceName: string, seen: Set<string>, prefix = ""): Obj {
  for (const [key, value] of Object.entries(source)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype")
      throw new Error(`Unsafe token key: ${key}`);
    const path = prefix ? `${prefix}.${key}` : key;
    if (object(value) && !token(value)) {
      if (target[key] !== undefined && (!object(target[key]) || token(target[key] as Obj))) {
        throw new Error(`Token path collision: ${path} conflicts with ${path} (${sourceName})`);
      }
      if (!object(target[key])) target[key] = Object.create(null);
      merge(target[key] as Obj, value, sourceName, seen, path);
    } else {
      const collision = [...seen].find(
        (existing) =>
          existing === path || existing.startsWith(`${path}.`) || path.startsWith(`${existing}.`),
      );
      if (collision)
        throw new Error(
          `Token path collision: ${path} conflicts with ${collision} (${sourceName})`,
        );
      seen.add(path);
      target[key] = value;
    }
  }
  return target;
}
function readSource(root: string, path: string): Obj {
  return JSON.parse(readFileSync(resolve(root, path), "utf8")) as Obj;
}
function tokenTypes(node: Obj, prefix = "", output = new Map<string, unknown>()) {
  if (token(node)) output.set(prefix, node.$type);
  else
    for (const [key, value] of Object.entries(node))
      if (!key.startsWith("$") && object(value))
        tokenTypes(value, prefix ? `${prefix}.${key}` : key, output);
  return output;
}
/**
 * Assembles the shared sources plus the sources of one mode into a single
 * logical document. Without an explicit mode, the first declared mode is used.
 */
export function assembleTokens(
  input: TokenManifest = manifest as TokenManifest,
  root = defaultRoot(),
  options: AssembleOptions = {},
): AssembledTokens {
  const modes = input.modes ?? [];
  const mode = options.mode ?? modes[0];
  if (mode !== undefined && !modes.includes(mode)) throw new Error(`Unknown token mode: ${mode}`);
  const sources = input.sources.filter(
    (source) => source.mode === undefined || source.mode === mode,
  );
  const document: Obj = Object.create(null);
  const seen = new Set<string>();
  const layerByPath = new Map<string, TokenLayer>();
  for (const source of sources) {
    const sourceDocument = readSource(root, source.path);
    for (const path of paths(sourceDocument)) layerByPath.set(path, source.layer);
    merge(document, sourceDocument, source.path, seen);
  }
  const validation = validateInternal(document, layerByPath);
  return { document, ...(mode === undefined ? {} : { mode }), sources, layerByPath, validation };
}
function validateModes(input: TokenManifest, root: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const modes = input.modes;
  if (modes !== undefined) {
    const invalid =
      !Array.isArray(modes) ||
      modes.length === 0 ||
      new Set(modes).size !== modes.length ||
      modes.some((mode) => typeof mode !== "string" || !modeName.test(mode));
    if (invalid) {
      diagnostics.push({
        severity: "error",
        code: "manifest.modes-invalid",
        path: "modes",
        message: "Manifest modes must be a non-empty list of unique lowercase kebab-case names",
      });
      return diagnostics;
    }
  }
  const declared = modes ?? [];
  const byMode = new Map<string, Map<string, unknown>>(declared.map((mode) => [mode, new Map()]));
  for (const source of input.sources) {
    if (!source || typeof source !== "object" || source.mode === undefined) continue;
    const types = byMode.get(source.mode);
    if (!types) {
      diagnostics.push({
        severity: "error",
        code: "manifest.mode-unknown",
        path: source.path,
        message: `Source mode is not declared by the manifest: ${String(source.mode)}`,
      });
      continue;
    }
    if (source.layer !== "semantic" && source.layer !== "component")
      diagnostics.push({
        severity: "error",
        code: "manifest.mode-layer-invalid",
        path: source.path,
        message: "Only semantic and component sources may declare a mode",
      });
    const modeRoot = `src/tokens/${source.layer === "component" ? "components" : source.layer}/${source.mode}/`;
    if (!source.path.replaceAll("\\", "/").startsWith(modeRoot))
      diagnostics.push({
        severity: "error",
        code: "manifest.source-path-invalid",
        path: source.path,
        message: `Mode source path must be under ${modeRoot}`,
      });
    try {
      for (const [path, type] of tokenTypes(readSource(root, source.path))) types.set(path, type);
    } catch {
      // Missing or unreadable sources are reported by assembly.
    }
  }
  const [reference, ...others] = declared;
  if (reference === undefined) return diagnostics;
  const expected = byMode.get(reference) ?? new Map<string, unknown>();
  for (const mode of others) {
    const actual = byMode.get(mode) ?? new Map<string, unknown>();
    for (const [path, type] of expected)
      if (!actual.has(path))
        diagnostics.push({
          severity: "error",
          code: "manifest.mode-parity",
          path,
          message: `Token is declared in mode ${reference} but missing in mode ${mode}`,
        });
      else if (actual.get(path) !== type)
        diagnostics.push({
          severity: "error",
          code: "manifest.mode-type-mismatch",
          path,
          property: "$type",
          message: `Token type differs between modes ${reference} and ${mode}`,
        });
    for (const path of actual.keys())
      if (!expected.has(path))
        diagnostics.push({
          severity: "error",
          code: "manifest.mode-parity",
          path,
          message: `Token is declared in mode ${mode} but missing in mode ${reference}`,
        });
  }
  return diagnostics;
}
export function validateManifest(input: TokenManifest, root = defaultRoot()): ValidationResult {
  const diagnostics = [] as import("./types.js").Diagnostic[];
  if (!input || !Array.isArray(input.sources) || !Array.isArray(input.layers))
    diagnostics.push({
      severity: "error",
      code: "manifest.invalid",
      path: "",
      message: "Manifest must declare layers and sources",
    });
  else {
    if (input.version !== "2025.10")
      diagnostics.push({
        severity: "error",
        code: "manifest.version-unsupported",
        path: "version",
        message: "Manifest must declare DTCG 2025.10",
      });
    const expectedLayers = ["global", "brand", "semantic", "component"];
    if (
      input.layers.length !== expectedLayers.length ||
      input.layers.some((layer, index) => layer !== expectedLayers[index])
    )
      diagnostics.push({
        severity: "error",
        code: "manifest.layers-invalid",
        path: "layers",
        message: "Manifest layers must be global, brand, semantic, component in dependency order",
      });
    for (const source of input.sources) {
      if (
        !source ||
        typeof source !== "object" ||
        typeof source.layer !== "string" ||
        typeof source.path !== "string"
      ) {
        diagnostics.push({
          severity: "error",
          code: "manifest.source-invalid",
          path: "sources",
          message: "Manifest sources must declare string layer and path",
        });
        continue;
      }
      const normalized = source.path.replaceAll("\\", "/");
      const layerRoot =
        source.layer === "brand"
          ? "src/tokens/brands/"
          : source.layer === "component"
            ? "src/tokens/components/"
            : `src/tokens/${source.layer}/`;
      const validPath =
        normalized.startsWith(layerRoot) &&
        !normalized.includes("../") &&
        normalized.endsWith(".json");
      if (!validPath)
        diagnostics.push({
          severity: "error",
          code: "manifest.source-path-invalid",
          path: source.path,
          message: `Source path must be under ${layerRoot} and use a JSON filename`,
        });
      if (!input.layers.includes(source.layer))
        diagnostics.push({
          severity: "error",
          code: "manifest.layer-unknown",
          path: source.path,
          message: `Unknown layer: ${source.layer}`,
        });
    }
    const modeDiagnostics = validateModes(input, root);
    diagnostics.push(...modeDiagnostics);
    try {
      const modes = modeDiagnostics.some((d) => d.code === "manifest.modes-invalid")
        ? []
        : (input.modes ?? []);
      for (const mode of modes.length > 0 ? modes : [undefined]) {
        const assembled = assembleTokens(input, root, mode === undefined ? {} : { mode });
        diagnostics.push(...assembled.validation.diagnostics);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const code = message.startsWith("Token path collision")
        ? "manifest.path-collision"
        : message.includes("ENOENT")
          ? "manifest.source-missing"
          : "manifest.source-invalid";
      diagnostics.push({ severity: "error", code, path: "", message });
    }
  }
  return { valid: diagnostics.length === 0, diagnostics };
}
export { layerRank };
