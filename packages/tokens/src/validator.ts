import {
  SUPPORTED_TYPES,
  type Diagnostic,
  type TokenLayer,
  type TokenType,
  type ValidationResult,
} from "./types.js";

type RecordNode = Record<string, unknown>;
type TokenInfo = { path: string; node: RecordNode; layer?: TokenLayer };
const allowed = new Set(["$type", "$value", "$ref", "$description", "$deprecated", "$extensions"]);
const tokenName = /^(?:[a-z][a-z0-9]*(?:-[a-z0-9]+)*|0|[1-9][0-9]*)$/;
const colorSpaces = new Set([
  "srgb",
  "srgb-linear",
  "display-p3",
  "a98-rgb",
  "prophoto-rgb",
  "rec2020",
  "xyz-d65",
  "xyz-d50",
  "lab",
  "lch",
  "oklab",
  "oklch",
  "hsl",
  "hwb",
  "hsv",
]);
const dimensionUnits = new Set(["px", "rem"]);
const fontWeightNames = new Set([
  "thin",
  "hairline",
  "extra-light",
  "ultra-light",
  "light",
  "normal",
  "regular",
  "book",
  "medium",
  "demi-bold",
  "semi-bold",
  "bold",
  "extra-bold",
  "ultra-bold",
  "black",
  "heavy",
  "extra-black",
  "ultra-black",
]);

function diagnostic(code: string, path: string, message: string, property?: string): Diagnostic {
  return { severity: "error", code, path, ...(property ? { property } : {}), message };
}
function isObject(value: unknown): value is RecordNode {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isAlias(value: unknown): value is string {
  return typeof value === "string" && /^\{[^{}]+\}$/.test(value);
}
function isPointer(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("#/");
}
function segments(path: string): string[] {
  return path.split(".");
}
function walk(document: RecordNode, layerByPath?: Map<string, TokenLayer>): TokenInfo[] {
  const result: TokenInfo[] = [];
  const visit = (node: RecordNode, path: string) => {
    const hasValue = Object.hasOwn(node, "$value");
    const hasRef = Object.hasOwn(node, "$ref");
    if (hasValue || hasRef) {
      result.push({ path, node, layer: layerByPath?.get(path) });
      return;
    }
    for (const [key, child] of Object.entries(node))
      if (!key.startsWith("$")) if (isObject(child)) visit(child, path ? `${path}.${key}` : key);
  };
  visit(document, "");
  return result;
}
function pointerParts(pointer: string): string[] | undefined {
  if (!isPointer(pointer)) return undefined;
  const rawParts = pointer.slice(2).split("/");
  if (rawParts.some((part) => /~(?![01])/.test(part))) return undefined;
  return rawParts.map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"));
}
function getDescendant(value: unknown, parts: string[]): unknown {
  let current = value;
  for (const part of parts) {
    if (Array.isArray(current)) {
      if (!/^(?:0|[1-9][0-9]*)$/.test(part)) return undefined;
      const index = Number(part);
      if (index >= current.length) return undefined;
      current = current[index];
    } else {
      if (!isObject(current) || !Object.hasOwn(current, part)) return undefined;
      current = current[part];
    }
  }
  return current;
}
function typeCompatible(type: TokenType, value: unknown): boolean {
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  if (type === "fontWeight")
    return (
      (typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 1000) ||
      (typeof value === "string" && fontWeightNames.has(value))
    );
  if (type === "fontFamily")
    return (
      typeof value === "string" ||
      (Array.isArray(value) && value.every((v) => typeof v === "string"))
    );
  if (type === "dimension")
    return (
      isObject(value) &&
      typeof value.value === "number" &&
      Number.isFinite(value.value) &&
      typeof value.unit === "string" &&
      dimensionUnits.has(value.unit)
    );
  if (type === "color")
    return (
      isObject(value) &&
      colorSpaces.has(typeof value.colorSpace === "string" ? value.colorSpace : "") &&
      Array.isArray(value.components) &&
      value.components.length === 3 &&
      value.components.every(
        (component) => typeof component === "number" && Number.isFinite(component),
      ) &&
      (value.colorSpace !== "srgb" ||
        value.components.every(
          (component) => typeof component === "number" && component >= 0 && component <= 1,
        )) &&
      (value.alpha === undefined ||
        (typeof value.alpha === "number" &&
          Number.isFinite(value.alpha) &&
          value.alpha >= 0 &&
          value.alpha <= 1))
    );
  if (type === "shadow") {
    const validShadow = (candidate: unknown): boolean =>
      isObject(candidate) &&
      typeCompatible("color", candidate.color) &&
      typeCompatible("dimension", candidate.offsetX) &&
      typeCompatible("dimension", candidate.offsetY) &&
      typeCompatible("dimension", candidate.blur) &&
      typeCompatible("dimension", candidate.spread) &&
      (candidate.inset === undefined || typeof candidate.inset === "boolean");
    return Array.isArray(value) ? value.length > 0 && value.every(validShadow) : validShadow(value);
  }
  return false;
}
export function validateTokenDocument(document: unknown): ValidationResult {
  return validateInternal(document, new Map());
}
export function validateInternal(
  document: unknown,
  layerByPath: Map<string, TokenLayer>,
): ValidationResult {
  const diagnostics: Diagnostic[] = [];
  if (!isObject(document) || Array.isArray(document))
    return {
      valid: false,
      diagnostics: [diagnostic("document.invalid", "", "Token document must be an object")],
    };
  const infos = walk(document, layerByPath);
  const byPath = new Map(infos.map((i) => [i.path, i]));
  const resolved = new Map<string, unknown>();
  const resolving = new Set<string>();
  const add = (d: Diagnostic) => diagnostics.push(d);
  const inspectMetadata = (node: RecordNode, path: string): void => {
    if (Object.hasOwn(node, "$description") && typeof node.$description !== "string")
      add(
        diagnostic(
          "metadata.description-invalid",
          path,
          "$description must be a string",
          "$description",
        ),
      );
    if (
      Object.hasOwn(node, "$deprecated") &&
      typeof node.$deprecated !== "boolean" &&
      typeof node.$deprecated !== "string"
    )
      add(
        diagnostic(
          "metadata.deprecated-invalid",
          path,
          "$deprecated must be a boolean or string",
          "$deprecated",
        ),
      );
    if (Object.hasOwn(node, "$extensions")) {
      if (!isObject(node.$extensions))
        add(diagnostic("extensions.invalid", path, "$extensions must be an object", "$extensions"));
      else
        for (const name of Object.keys(node.$extensions))
          if (!name.includes(".") || !name.split(".").every((part) => part.length > 0))
            add(
              diagnostic(
                "extensions.invalid-namespace",
                path,
                "Extension names must be non-empty namespaced keys",
                "$extensions",
              ),
            );
    }
  };
  const inspectGroups = (node: RecordNode, path: string): void => {
    if (!Object.hasOwn(node, "$value") && !Object.hasOwn(node, "$ref")) {
      inspectMetadata(node, path);
      if (Object.hasOwn(node, "$type"))
        add(diagnostic("group.type-forbidden", path, "Groups must not declare $type", "$type"));
      for (const key of Object.keys(node))
        if (key.startsWith("$") && !allowed.has(key))
          add(diagnostic("group.unknown-property", path, `Unknown group property: ${key}`, key));
      for (const [key, child] of Object.entries(node)) {
        if (key.startsWith("$")) continue;
        const childPath = path ? `${path}.${key}` : key;
        if (isObject(child)) inspectGroups(child, childPath);
        else
          add(diagnostic("group.invalid-child", childPath, "Group members must be objects", key));
      }
    }
  };
  inspectGroups(document, "");
  const resolve = (info: TokenInfo): unknown => {
    if (resolved.has(info.path)) return resolved.get(info.path);
    if (resolving.has(info.path)) {
      add(
        diagnostic(
          "reference.cycle",
          info.path,
          "Reference cycle detected",
          Object.hasOwn(info.node, "$ref") ? "$ref" : "$value",
        ),
      );
      return undefined;
    }
    resolving.add(info.path);
    let value: unknown;
    if (Object.hasOwn(info.node, "$ref")) {
      const ref = info.node.$ref;
      if (!isPointer(ref)) {
        add(
          diagnostic("ref.invalid-syntax", info.path, "$ref must be a DTCG JSON Pointer", "$ref"),
        );
      } else {
        const parts = pointerParts(ref) ?? [];
        const valueIndex = parts.indexOf("$value");
        const targetPath = valueIndex >= 0 ? parts.slice(0, valueIndex).join(".") : "";
        const target = byPath.get(targetPath);
        if (valueIndex < 0) {
          add(
            diagnostic(
              "ref.invalid-target",
              info.path,
              "$ref must target $value or a descendant of $value",
              "$ref",
            ),
          );
        } else if (!target) {
          add(
            diagnostic(
              "ref.target-not-found",
              info.path,
              `Reference target does not exist: ${ref}`,
              "$ref",
            ),
          );
        } else if (
          parts.length === valueIndex + 1 &&
          (!Object.hasOwn(target.node, "$value") || isAlias(target.node.$value))
        ) {
          add(
            diagnostic(
              "ref.target-not-found",
              info.path,
              `Reference target does not expose a concrete $value: ${ref}`,
              "$ref",
            ),
          );
        } else {
          value = getDescendant(resolve(target), parts.slice(valueIndex + 1));
          if (value === undefined)
            add(
              diagnostic(
                "ref.target-not-found",
                info.path,
                `Reference target does not exist: ${ref}`,
                "$ref",
              ),
            );
        }
      }
    } else {
      value = info.node.$value;
      if (isAlias(value)) {
        const targetPath = value.slice(1, -1);
        const target = byPath.get(targetPath);
        if (!target)
          add(
            diagnostic(
              "alias.target-not-found",
              info.path,
              `Alias target does not exist: ${value}`,
              "$value",
            ),
          );
        else value = resolve(target);
      } else if (typeof value === "string" && value.includes("{"))
        add(
          diagnostic(
            "alias.invalid-syntax",
            info.path,
            "Aliases must use the complete {token.path} syntax",
            "$value",
          ),
        );
      const containsEmbeddedReference = (candidate: unknown): boolean => {
        if (typeof candidate === "string") return candidate.includes("{");
        if (Array.isArray(candidate)) return candidate.some(containsEmbeddedReference);
        if (isObject(candidate))
          return (
            Object.keys(candidate).some((key) => key === "$ref" || key === "$value") ||
            Object.values(candidate).some(containsEmbeddedReference)
          );
        return false;
      };
      if (containsEmbeddedReference(value))
        add(
          diagnostic(
            "reference.embedded",
            info.path,
            "References are only allowed at token level",
            "$value",
          ),
        );
    }
    resolving.delete(info.path);
    resolved.set(info.path, value);
    return value;
  };
  for (const info of infos) {
    const node = info.node;
    const path = info.path;
    const parts = segments(path);
    inspectMetadata(node, path);
    if (parts.length < 2 || parts.some((s) => !tokenName.test(s)))
      add(
        diagnostic(
          "token.invalid-name",
          path,
          "Token path segments must use lowercase kebab-case or canonical numeric segments",
        ),
      );
    for (const key of Object.keys(node))
      if (key.startsWith("$") && !allowed.has(key))
        add(diagnostic("token.unknown-property", path, `Unknown token property: ${key}`, key));
    const hasValue = Object.hasOwn(node, "$value");
    const hasRef = Object.hasOwn(node, "$ref");
    if (hasValue === hasRef)
      add(
        diagnostic(
          "token.value-or-ref",
          path,
          "A token must declare exactly one of $value or $ref",
        ),
      );
    if (!Object.hasOwn(node, "$type") || typeof node.$type !== "string")
      add(
        diagnostic(
          "token.type-required",
          path,
          "Every token must declare an explicit $type",
          "$type",
        ),
      );
    else if (!(SUPPORTED_TYPES as readonly string[]).includes(node.$type))
      add(
        diagnostic(
          "token.type-unsupported",
          path,
          `Unsupported token type: ${node.$type}`,
          "$type",
        ),
      );
    if (Object.hasOwn(node, "$extensions")) {
      if (!isObject(node.$extensions))
        add(diagnostic("extensions.invalid", path, "$extensions must be an object", "$extensions"));
      else {
        for (const [name] of Object.entries(node.$extensions))
          if (!name.includes(".") || !name.split(".").every((part) => part.length > 0))
            add(
              diagnostic(
                "extensions.invalid-namespace",
                path,
                "Extension names must be namespaced",
                "$extensions",
              ),
            );
        const figma = node.$extensions["software.solenium.figma"];
        if (
          figma !== undefined &&
          (!isObject(figma) ||
            ["fileKey", "collectionKey", "variableKey"].some(
              (k) => typeof figma[k] !== "string" || !(figma[k] as string).trim(),
            ))
        )
          add(
            diagnostic(
              "figma.invalid-provenance",
              path,
              "Figma provenance requires non-empty fileKey, collectionKey, and variableKey",
              "$extensions",
            ),
          );
      }
    }
    const value = resolve(info);
    if (
      typeof node.$type === "string" &&
      (hasValue || hasRef) &&
      value !== undefined &&
      !typeCompatible(node.$type as TokenType, value)
    )
      add(
        diagnostic(
          "value.type-mismatch",
          path,
          `Resolved value is incompatible with token type ${node.$type}`,
          hasRef ? "$ref" : "$value",
        ),
      );
    if (
      node.$type === "number" &&
      parts.includes("opacity") &&
      typeof value === "number" &&
      (!Number.isInteger(value) || value < 0 || value > 100)
    )
      add(
        diagnostic(
          "number.opacity-range",
          path,
          "Opacity values must be integers from 0 to 100",
          "$value",
        ),
      );
    const targetPath = isAlias(node.$value)
      ? node.$value.slice(1, -1)
      : isPointer(node.$ref)
        ? (() => {
            const parts = pointerParts(node.$ref);
            const index = parts?.indexOf("$value") ?? -1;
            return index >= 0 ? parts?.slice(0, index).join(".") : undefined;
          })()
        : undefined;
    if (targetPath && info.layer && byPath.has(targetPath)) {
      const targetLayer = byPath.get(targetPath)?.layer;
      const rank: Record<TokenLayer, number> = { global: 0, brand: 0, semantic: 1, component: 2 };
      if (targetLayer && rank[targetLayer] > rank[info.layer])
        add(
          diagnostic(
            "layer.dependency-inverse",
            path,
            "A token cannot depend on a more specific layer",
            "$value",
          ),
        );
    }
  }
  return { valid: !diagnostics.some((d) => d.severity === "error"), diagnostics };
}
