export const ICON_STYLES = ["linear", "bold", "twotone", "bulk", "broken"] as const;
export type IconStyle = (typeof ICON_STYLES)[number];

/**
 * Known misspellings inherited from the Iconsax catalog. Corrected names are the
 * new contract; previous names are documented as migration notes, never aliased.
 */
export const WORD_CORRECTIONS: Readonly<Record<string, string>> = {
  cricle: "circle",
  presention: "presentation",
  recive: "receive",
  trush: "trash",
};

export interface ProposedName {
  /** Kebab-case public name, e.g. `money-receive`. */
  name: string;
  /** Original slug when a correction changed it. */
  renamedFrom?: string;
}

/** Splits a Figma component name such as `vuesax/linear/money-recive`. */
export function parseFigmaName(figmaName: string): { style?: IconStyle; base: string } {
  const parts = figmaName.split("/").map((part) => part.trim());
  if (parts.length === 3 && parts[0] === "vuesax") {
    const style = parts[1] as IconStyle;
    if ((ICON_STYLES as readonly string[]).includes(style)) return { style, base: parts[2] ?? "" };
  }
  return { base: parts.at(-1) ?? figmaName };
}

export function slugify(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replaceAll("&", "-and-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function proposeName(base: string): ProposedName {
  const slug = slugify(base);
  const name = slug
    .split("-")
    .map((word) => WORD_CORRECTIONS[word] ?? word)
    .join("-");
  return name === slug ? { name } : { name, renamedFrom: slug };
}

/** PascalCase React/Vue component name; a leading digit gets an `Icon` prefix. */
export function componentName(name: string): string {
  const pascal = name
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
  return /^[0-9]/.test(pascal) ? `Icon${pascal}` : pascal;
}
