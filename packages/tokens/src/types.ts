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
