// TASK-008: WCAG 2.2 AA contrast contract for semantic foreground/background pairs.
// Disabled states and decorative borders (subtle, default, feedback) are exempt
// under WCAG 1.4.3 and 1.4.11, so they are intentionally absent from this list.

export type ContrastKind = "text" | "non-text";

/** Minimum ratios agreed for TASK-008 (WCAG 2.2 AA). */
export const CONTRAST_MINIMUM: Record<ContrastKind, number> = { text: 4.5, "non-text": 3 };

export interface ContrastPair {
  foreground: string;
  background: string;
  kind: ContrastKind;
}

const textSurfaces = [
  "color.background.canvas",
  "color.background.subtle",
  "color.background.sunken",
  "color.surface.default",
  "color.surface.raised",
  "color.surface.inset",
];
const feedbackTones = ["success", "info", "warning", "critical"];

/** Pairs every mode must satisfy. */
export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  ...["color.text.primary", "color.text.body", "color.text.secondary"].flatMap((foreground) =>
    textSurfaces.map((background) => ({ foreground, background, kind: "text" as const })),
  ),
  { foreground: "color.text.inverse", background: "color.background.inverse", kind: "text" },
  ...["default", "hover", "active"].map((state) => ({
    foreground: "color.action.primary.foreground",
    background: `color.action.primary.${state}`,
    kind: "text" as const,
  })),
  ...["default", "hover", "active"].map((state) => ({
    foreground: `color.action.primary.${state}`,
    background: "color.background.canvas",
    kind: "non-text" as const,
  })),
  ...textSurfaces.map((background) => ({
    foreground: "color.border.focus",
    background,
    kind: "non-text" as const,
  })),
  ...feedbackTones.flatMap((tone) =>
    [`color.feedback.${tone}.background`, "color.background.canvas", "color.background.subtle"].map(
      (background) => ({
        foreground: `color.feedback.${tone}.text`,
        background,
        kind: "text" as const,
      }),
    ),
  ),
];

export interface BlockedPair {
  foreground: string;
  background: string;
  /** Modes in which the combination fails and must not be used. */
  modes: readonly string[];
}

/**
 * Required pairs that fail with the current Figma intent. Consumers must not
 * combine them; they stay blocked until design approves passing values.
 */
export const BLOCKED_PAIRS: readonly BlockedPair[] = [
  { foreground: "color.text.secondary", background: "color.background.sunken", modes: ["light"] },
  { foreground: "color.text.secondary", background: "color.surface.inset", modes: ["light"] },
];

export interface BlockedToken {
  /** Semantic path the token would have had. */
  path: string;
  /** Figma variable that expresses the design intent. */
  figmaVariable: string;
  /** Primitives the Figma variable resolves to, per mode. */
  intent: Record<string, string>;
  /** Pair that fails, evaluated against the proposed value in every mode. */
  against: string;
  kind: ContrastKind;
}

/**
 * Tokens left out of the contract because the Figma intent fails the agreed
 * level. They stay blocked until design approves passing values.
 */
export const BLOCKED_TOKENS: readonly BlockedToken[] = [
  {
    path: "color.text.caption",
    figmaVariable: "semanticas/grey/text/caption",
    intent: { light: "color.neutral.400", dark: "color.neutral.500" },
    against: "color.background.canvas",
    kind: "text",
  },
  {
    path: "color.text.placeholder",
    figmaVariable: "semanticas/grey/text/placeholder",
    intent: { light: "color.neutral.300", dark: "color.neutral.600" },
    against: "color.background.canvas",
    kind: "text",
  },
  {
    path: "color.border.strong",
    figmaVariable: "semanticas/grey/border/strong",
    intent: { light: "color.neutral.400", dark: "color.neutral.600" },
    against: "color.background.canvas",
    kind: "non-text",
  },
];

type Obj = Record<string, unknown>;
interface SrgbColor {
  colorSpace: "srgb";
  components: [number, number, number];
  alpha?: number;
}

function isObject(value: unknown): value is Obj {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function tokenAt(document: Obj, path: string): Obj {
  let current: unknown = document;
  for (const segment of path.split(".")) {
    if (!isObject(current) || !Object.hasOwn(current, segment))
      throw new Error(`Token does not exist: ${path}`);
    current = current[segment];
  }
  if (!isObject(current) || !Object.hasOwn(current, "$value"))
    throw new Error(`Token does not exist: ${path}`);
  return current;
}

/** Follows `{alias}` chains in an assembled document down to an sRGB color. */
export function resolveColor(document: Obj, path: string): SrgbColor {
  const visited = new Set<string>();
  let current = path;
  for (;;) {
    if (visited.has(current)) throw new Error(`Reference cycle at ${current}`);
    visited.add(current);
    const value = tokenAt(document, current).$value;
    if (typeof value === "string" && /^\{[^{}]+\}$/.test(value)) {
      current = value.slice(1, -1);
      continue;
    }
    if (
      isObject(value) &&
      value.colorSpace === "srgb" &&
      Array.isArray(value.components) &&
      value.components.length === 3
    ) {
      if (value.alpha !== undefined && value.alpha !== 1)
        throw new Error(`Contrast requires opaque colors: ${path}`);
      return value as unknown as SrgbColor;
    }
    throw new Error(`Token is not an sRGB color: ${path}`);
  }
}

function relativeLuminance({ components }: SrgbColor): number {
  const [r, g, b] = components.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  ) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio between two opaque sRGB colors. */
export function contrastRatio(a: SrgbColor, b: SrgbColor): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (light + 0.05) / (dark + 0.05);
}

export interface ContrastResult extends ContrastPair {
  ratio: number;
  minimum: number;
  passes: boolean;
}

export function checkContrast(
  document: Obj,
  pairs: readonly ContrastPair[] = CONTRAST_PAIRS,
): ContrastResult[] {
  return pairs.map((pair) => {
    const ratio = contrastRatio(
      resolveColor(document, pair.foreground),
      resolveColor(document, pair.background),
    );
    const minimum = CONTRAST_MINIMUM[pair.kind];
    return { ...pair, ratio, minimum, passes: ratio >= minimum };
  });
}
