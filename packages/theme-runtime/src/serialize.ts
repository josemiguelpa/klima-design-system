// TASK-018: turns a validated white-label theme into a CSS string; pure and SSR-safe.
import { cssVariables, modes, type TokenPath } from "@klima-ds/tokens";
import type { WhiteLabelTheme } from "./index.js";

/** Attribute that activates the white-label theme on the root element. */
export const WHITE_LABEL_ATTRIBUTE = "data-white-label";

const ACTION_PATH = /^color\.action\.(primary|secondary)\.(default|hover|active|foreground)$/;
const HEX = /^#[0-9a-f]{6}$/;

/**
 * Selector of one mode. `:root` plus two attributes (0,3,0) outrank the neutral
 * tokens (0,1,0) and brand themes (0,2,0) regardless of stylesheet order.
 */
export function whiteLabelSelector(mode: string): string {
  const [defaultMode, ...others] = modes;
  const base = `:root[${WHITE_LABEL_ATTRIBUTE}]`;
  if (mode !== defaultMode) return `${base}[data-theme="${mode}"]`;
  return `${base}${others.map((other) => `:not([data-theme="${other}"])`).join("")}`;
}

/**
 * Serializes a theme returned by `createWhiteLabelTheme`. Every key and value is
 * re-checked so that no unvalidated text can reach the stylesheet; anything else
 * throws a TypeError instead of being escaped or dropped.
 */
export function serializeWhiteLabelTheme(theme: WhiteLabelTheme): string {
  const blocks: string[] = [];
  for (const mode of Object.keys(theme))
    if (!(modes as readonly string[]).includes(mode))
      throw new TypeError(`Unknown white-label mode: ${mode}`);
  for (const mode of modes) {
    const overrides = theme[mode] ?? {};
    const lines = Object.entries(overrides).map(([path, value]) => {
      if (!ACTION_PATH.test(path)) throw new TypeError(`Unsupported white-label token: ${path}`);
      if (typeof value !== "string" || !HEX.test(value))
        throw new TypeError(`White-label values must be lowercase #rrggbb: ${path}`);
      return `  ${cssVariables[path as TokenPath]}: ${value};`;
    });
    if (lines.length > 0) blocks.push(`${whiteLabelSelector(mode)} {\n${lines.join("\n")}\n}\n`);
  }
  return blocks.join("\n");
}
