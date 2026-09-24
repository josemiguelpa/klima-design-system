export const SUPPORTED_TYPES = [
  "color",
  "dimension",
  "fontFamily",
  "fontWeight",
  "number",
  "shadow",
] as const;
export type TokenType = (typeof SUPPORTED_TYPES)[number];
export type DiagnosticSeverity = "error" | "warning";
export interface Diagnostic {
  severity: DiagnosticSeverity;
  code: string;
  path: string;
  property?: string;
  message: string;
}
export interface ValidationResult {
  valid: boolean;
  diagnostics: Diagnostic[];
}
export interface FigmaProvenance {
  fileKey: string;
  collectionKey: string;
  variableKey: string;
}
export type TokenValue = unknown;
export interface TokenNode {
  $type?: TokenType;
  $value?: TokenValue;
  $ref?: string;
  $description?: string;
  $deprecated?: boolean | string;
  $extensions?: Record<string, unknown>;
  [key: string]: unknown;
}
export interface TokenSource {
  layer: TokenLayer;
  path: string;
}
export type TokenLayer = "global" | "brand" | "semantic" | "component";
/**
 * Dependency order for token layers, from most foundational (lowest rank) to
 * most specific (highest rank). A token may only reference another token in
 * the same layer or a more foundational one: global < brand < semantic <
 * component. In particular, global primitives must not depend on brand
 * primitives, while brand primitives may depend on global primitives.
 */
export const LAYER_RANK: Record<TokenLayer, number> = {
  global: 0,
  brand: 1,
  semantic: 2,
  component: 3,
};
export interface TokenManifest {
  version: string;
  layers: TokenLayer[];
  sources: TokenSource[];
}
export interface AssembledTokens {
  document: Record<string, unknown>;
  sources: TokenSource[];
  validation: ValidationResult;
}
