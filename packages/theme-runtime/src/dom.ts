// TASK-018: applies a white-label theme in the browser. Importing this module never touches
// the DOM; only calling applyWhiteLabelTheme does, so it is safe to import during SSR.
import type { WhiteLabelTheme } from "./index.js";
import { WHITE_LABEL_ATTRIBUTE, serializeWhiteLabelTheme } from "./serialize.js";

// Structural DOM types keep the package build free of the DOM lib (SSR guarantee of TASK-012).
export interface StyleElementLike {
  id: string;
  textContent: string | null;
  setAttribute(name: string, value: string): void;
  remove(): void;
}
export interface DocumentLike {
  head: { appendChild(node: StyleElementLike): unknown };
  documentElement: {
    setAttribute(name: string, value: string): void;
    removeAttribute(name: string): void;
  };
  getElementById(id: string): unknown;
  createElement(tagName: "style"): StyleElementLike;
}

export interface ApplyWhiteLabelOptions {
  /** Id of the managed `<style>` element. */
  id?: string;
  /** CSP nonce for `style-src 'nonce-…'` policies. */
  nonce?: string;
  /** Document to apply the theme to; defaults to the global document. */
  document?: DocumentLike;
}

export const DEFAULT_STYLE_ID = "klima-white-label";

/**
 * Creates or updates a single `<style>` element with the serialized theme and
 * activates it on the root element. Returns a function that removes both.
 */
export function applyWhiteLabelTheme(
  theme: WhiteLabelTheme,
  options: ApplyWhiteLabelOptions = {},
): () => void {
  const doc = options.document ?? (globalThis as { document?: DocumentLike }).document;
  if (!doc)
    throw new Error(
      "applyWhiteLabelTheme needs a document; during SSR use serializeWhiteLabelTheme instead",
    );
  const id = options.id ?? DEFAULT_STYLE_ID;
  const css = serializeWhiteLabelTheme(theme);
  const existing = doc.getElementById(id) as (StyleElementLike & { tagName?: string }) | null;
  if (existing && existing.tagName?.toLowerCase() !== "style")
    throw new Error(`Element #${id} exists and is not a <style>; pass another id`);
  const style = existing ?? doc.createElement("style");
  style.id = id;
  if (options.nonce !== undefined) style.setAttribute("nonce", options.nonce);
  style.textContent = css;
  if (!existing) doc.head.appendChild(style);
  doc.documentElement.setAttribute(WHITE_LABEL_ATTRIBUTE, "");
  return () => {
    style.remove();
    doc.documentElement.removeAttribute(WHITE_LABEL_ATTRIBUTE);
  };
}
