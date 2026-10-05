import { createHash } from "node:crypto";
import { componentName, parseFigmaName, proposeName, type IconStyle } from "./naming.js";

/** A component exported from the Figma icon file, before any normalization. */
export interface RawIcon {
  nodeId: string;
  figmaName: string;
  /** Top-level frame that groups the component in Figma (category). */
  frame: string;
  width: number;
  height: number;
  svg: string;
  /** Component set that owns this component when it is a variant (UI components, not icons). */
  variantOf?: string;
}

export type IconOrigin = "iconsax" | "custom";
/**
 * - `candidate`: publishable once its provenance is confirmed.
 * - `blocked`: needs a design or legal decision before it can be published.
 * - `excluded`: intentionally not part of the icon packages.
 * - `duplicate`: identical to another entry with the same name.
 */
export type IconStatus = "candidate" | "blocked" | "excluded" | "duplicate";
export type ProvenanceStatus = "unconfirmed" | "confirmed";

export interface InventoryEntry {
  name: string;
  component: string;
  style: IconStyle;
  figma: { nodeId: string; name: string; frame: string };
  size: { width: number; height: number };
  sha256: string;
  origin: IconOrigin;
  provenance: ProvenanceStatus;
  status: IconStatus;
  renamedFrom?: string;
  duplicateOf?: string;
  issues: string[];
}

export interface Inventory {
  figmaFileKey: string;
  style: IconStyle;
  entries: InventoryEntry[];
}

/** Third-party brand marks are trademarks; they are never shipped as icons. */
const THIRD_PARTY_LOGOS = new Set([
  "apple",
  "behance",
  "dribbble",
  "facebook",
  "figma",
  "google",
  "instagram",
  "linked-in",
  "linkedin",
  "slack",
  "spotify",
  "twitter",
  "whatsapp",
  "youtube",
]);
const GENERIC_NAME = /^(group|vector|frame|component|rectangle|ellipse|union|subtract)(-\d+)?$/;

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function buildInventory(
  figmaFileKey: string,
  style: IconStyle,
  icons: readonly RawIcon[],
): Inventory {
  const entries = icons.map((icon): InventoryEntry => {
    const parsed = parseFigmaName(icon.figmaName);
    const proposed = proposeName(parsed.base);
    const origin: IconOrigin = parsed.style ? "iconsax" : "custom";
    const issues: string[] = [];
    let status: IconStatus = "candidate";
    if (parsed.style && parsed.style !== style) issues.push(`style-mismatch:${parsed.style}`);
    if (proposed.renamedFrom) issues.push(`renamed:${proposed.renamedFrom}`);
    if (proposed.name !== parsed.base) issues.push(`normalized-name:${parsed.base}`);
    if (icon.width !== 24 || icon.height !== 24)
      issues.push(`non-standard-size:${icon.width}x${icon.height}`);
    if (icon.variantOf) {
      issues.push(`component-variant:${icon.variantOf}`);
      status = "excluded";
    } else if (THIRD_PARTY_LOGOS.has(proposed.name)) {
      issues.push("third-party-logo");
      status = "excluded";
    } else if (!proposed.name || GENERIC_NAME.test(proposed.name)) {
      issues.push("generic-name");
      status = "blocked";
    }
    return {
      name: proposed.name,
      component: componentName(proposed.name),
      style,
      figma: { nodeId: icon.nodeId, name: icon.figmaName, frame: icon.frame },
      size: { width: icon.width, height: icon.height },
      sha256: sha256(icon.svg),
      origin,
      provenance: "unconfirmed",
      status,
      ...(proposed.renamedFrom ? { renamedFrom: proposed.renamedFrom } : {}),
      issues,
    };
  });

  entries.sort(
    (a, b) => a.name.localeCompare(b.name) || a.figma.nodeId.localeCompare(b.figma.nodeId),
  );

  const byName = new Map<string, InventoryEntry[]>();
  for (const entry of entries)
    if (entry.status === "candidate")
      byName.set(entry.name, [...(byName.get(entry.name) ?? []), entry]);
  for (const group of byName.values()) {
    if (group.length < 2) continue;
    const [first, ...rest] = group as [InventoryEntry, ...InventoryEntry[]];
    if (rest.every((entry) => entry.sha256 === first.sha256))
      for (const entry of rest) {
        entry.status = "duplicate";
        entry.duplicateOf = first.figma.nodeId;
      }
    else
      for (const entry of group) {
        entry.status = "blocked";
        entry.issues.push(`name-conflict:${group.length}`);
      }
  }

  const byComponent = new Map<string, string>();
  for (const entry of entries) {
    if (entry.status !== "candidate") continue;
    const other = byComponent.get(entry.component);
    if (other && other !== entry.name) {
      entry.status = "blocked";
      entry.issues.push(`component-collision:${other}`);
    } else byComponent.set(entry.component, entry.name);
  }

  return { figmaFileKey, style, entries };
}

/** Entries the generators may emit. Provenance is enforced separately at publish time. */
export function generatableEntries(inventory: Inventory): InventoryEntry[] {
  return inventory.entries.filter((entry) => entry.status === "candidate");
}

/** Entries that would be shipped without confirmed provenance. */
export function unconfirmedEntries(inventory: Inventory): InventoryEntry[] {
  return generatableEntries(inventory).filter((entry) => entry.provenance !== "confirmed");
}
