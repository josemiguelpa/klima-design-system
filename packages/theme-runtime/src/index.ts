// TASK-012: validated white-label themes built from tenant brand colors.
// Pure and environment-agnostic: no DOM, no Node APIs, safe to run during SSR.
import { modes, values, type Mode, type TokenPath } from "@klima-ds/tokens";

export type { Mode, TokenPath };

/** Tenant brand colors. Only `primaryColor` is required. */
export interface WhiteLabelInput {
  primaryColor: string;
  /** Primary color for dark mode; defaults to `primaryColor`. */
  darkPrimaryColor?: string;
  secondaryColor?: string;
  /** Secondary color for dark mode; defaults to `secondaryColor`. */
  darkSecondaryColor?: string;
}
export type WhiteLabelField = keyof WhiteLabelInput;

export type DiagnosticSeverity = "error" | "warning";
export interface ThemeDiagnostic {
  severity: DiagnosticSeverity;
  /** Stable, automation-friendly code. */
  code: string;
  message: string;
  field?: string;
  mode?: Mode;
  /** Measured contrast ratio, truncated to two decimals. */
  ratio?: number;
  minimum?: number;
}

/** Overrides per mode, keyed by token path, with opaque `#rrggbb` values. */
export type WhiteLabelTheme = Record<Mode, Partial<Record<TokenPath, string>>>;

export type WhiteLabelResult =
  | { ok: true; theme: WhiteLabelTheme; diagnostics: ThemeDiagnostic[] }
  | { ok: false; diagnostics: ThemeDiagnostic[] };

/** WCAG 2.2 AA minimums agreed in TASK-008. */
export const CONTRAST_MINIMUM = { text: 4.5, nonText: 3 } as const;

/** Foreground candidates; the one with the highest contrast against the fill wins. */
const FOREGROUND_CANDIDATES: readonly TokenPath[] = ["color.neutral.0", "color.neutral.950"];

const FIELDS: readonly WhiteLabelField[] = [
  "primaryColor",
  "darkPrimaryColor",
  "secondaryColor",
  "darkSecondaryColor",
];
const LEGACY_FIELDS: Record<string, WhiteLabelField> = {
  primary_color: "primaryColor",
  secondary_color: "secondaryColor",
};

const OPAQUE_HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const TRANSLUCENT_HEX = /^#(?:[0-9a-f]{4}|[0-9a-f]{8})$/i;

/** Parses an opaque `#rgb` or `#rrggbb` color into lowercase `#rrggbb`. */
export function parseHexColor(value: string): string | undefined {
  const trimmed = value.trim();
  if (!OPAQUE_HEX.test(trimmed)) return undefined;
  const digits = trimmed.slice(1).toLowerCase();
  return `#${digits.length === 3 ? [...digits].map((digit) => digit + digit).join("") : digits}`;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((index) => {
    const channel = Number.parseInt(hex.slice(index, index + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio between two opaque `#rrggbb` colors. */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

// Truncated, never rounded up: a failing 4.496 must not be reported as 4.5.
const round = (ratio: number) => Math.floor(ratio * 100) / 100;

function validateInput(input: unknown): {
  colors: Partial<Record<WhiteLabelField, string>>;
  diagnostics: ThemeDiagnostic[];
} {
  const diagnostics: ThemeDiagnostic[] = [];
  const colors: Partial<Record<WhiteLabelField, string>> = {};
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    diagnostics.push({
      severity: "error",
      code: "input.invalid",
      message: "White-label input must be an object with camelCase color fields",
    });
    return { colors, diagnostics };
  }
  for (const [field, value] of Object.entries(input)) {
    if (!(FIELDS as readonly string[]).includes(field)) {
      const replacement = LEGACY_FIELDS[field];
      diagnostics.push({
        severity: "error",
        code: "input.unknown-field",
        field,
        message: replacement
          ? `Unknown field ${field}; rename it to ${replacement} (legacy snake_case is not supported)`
          : `Unknown field ${field}`,
      });
      continue;
    }
    if (value === undefined) continue;
    const parsed = typeof value === "string" ? parseHexColor(value) : undefined;
    if (parsed) colors[field as WhiteLabelField] = parsed;
    else if (typeof value === "string" && TRANSLUCENT_HEX.test(value.trim()))
      diagnostics.push({
        severity: "error",
        code: "color.translucent",
        field,
        message: `${field} must be opaque; contrast cannot be guaranteed for ${value}`,
      });
    else
      diagnostics.push({
        severity: "error",
        code: "color.invalid",
        field,
        message: `${field} must be a #rgb or #rrggbb color, received ${JSON.stringify(value)}`,
      });
  }
  if (
    !Object.hasOwn(input, "primaryColor") ||
    (input as WhiteLabelInput).primaryColor === undefined
  )
    diagnostics.push({
      severity: "error",
      code: "input.required",
      field: "primaryColor",
      message: "primaryColor is required",
    });
  return { colors, diagnostics };
}

/**
 * Builds a white-label theme from tenant brand colors. Never throws for bad
 * input and never falls back to a default color: invalid input returns
 * `ok: false` with structured diagnostics.
 */
export function createWhiteLabelTheme(input: unknown): WhiteLabelResult {
  const { colors, diagnostics } = validateInput(input);
  const theme = Object.fromEntries(modes.map((mode) => [mode, {}])) as WhiteLabelTheme;
  const actions = [
    { action: "primary", field: "primaryColor", darkField: "darkPrimaryColor" },
    { action: "secondary", field: "secondaryColor", darkField: "darkSecondaryColor" },
  ] as const;
  for (const { action, field: baseField, darkField } of actions) {
    for (const mode of modes) {
      const field: WhiteLabelField = mode === "dark" && colors[darkField] ? darkField : baseField;
      const fill = colors[field];
      if (!fill) continue;
      const tokens = values[mode];
      const candidates = FOREGROUND_CANDIDATES.map((path) => ({
        color: tokens[path],
        ratio: contrastRatio(tokens[path], fill),
      }));
      // Highest measured contrast wins; ties keep the candidate order.
      const foreground = candidates.reduce((best, candidate) =>
        candidate.ratio > best.ratio ? candidate : best,
      );
      if (foreground.ratio < CONTRAST_MINIMUM.text) {
        diagnostics.push({
          severity: "error",
          code: "contrast.foreground-unavailable",
          field,
          mode,
          ratio: round(foreground.ratio),
          minimum: CONTRAST_MINIMUM.text,
          message: `No foreground reaches ${CONTRAST_MINIMUM.text}:1 on ${fill} in ${mode} mode`,
        });
        continue;
      }
      const canvas = tokens["color.background.canvas"];
      const nonText = contrastRatio(fill, canvas);
      if (nonText < CONTRAST_MINIMUM.nonText)
        diagnostics.push({
          severity: "warning",
          code: "contrast.non-text",
          field,
          mode,
          ratio: round(nonText),
          minimum: CONTRAST_MINIMUM.nonText,
          message: `${fill} is hard to distinguish from the ${mode} canvas ${canvas}`,
        });
      // Hover and active repeat the fill: token-model forbids unvalidated color mixes.
      Object.assign(theme[mode], {
        [`color.action.${action}.default`]: fill,
        [`color.action.${action}.hover`]: fill,
        [`color.action.${action}.active`]: fill,
        [`color.action.${action}.foreground`]: foreground.color,
      });
    }
  }
  return diagnostics.some((diagnostic) => diagnostic.severity === "error")
    ? { ok: false, diagnostics }
    : { ok: true, theme, diagnostics };
}
export * from "./serialize.js";
