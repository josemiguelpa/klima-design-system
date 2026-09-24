import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import manifest from "../manifest.json" with { type: "json" };
import { validateInternal } from "./validator.js";
import { LAYER_RANK } from "./types.js";
import type { AssembledTokens, TokenManifest, TokenLayer, ValidationResult } from "./types.js";
export { manifest };

type Obj = Record<string, unknown>;
const layerRank = LAYER_RANK;
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
export function assembleTokens(
  input: TokenManifest = manifest as TokenManifest,
  root = defaultRoot(),
): AssembledTokens {
  const document: Obj = Object.create(null);
  const seen = new Set<string>();
  const layerByPath = new Map<string, TokenLayer>();
  for (const source of input.sources) {
    const sourceDocument = JSON.parse(readFileSync(resolve(root, source.path), "utf8")) as Obj;
    for (const path of paths(sourceDocument)) layerByPath.set(path, source.layer);
    merge(document, sourceDocument, source.path, seen);
  }
  const validation = validateInternal(document, layerByPath);
  return { document, sources: input.sources, validation };
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
    try {
      const assembled = assembleTokens(input, root);
      diagnostics.push(...assembled.validation.diagnostics);
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
