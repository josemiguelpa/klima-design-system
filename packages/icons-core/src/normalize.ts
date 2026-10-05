import { optimize, type CustomPlugin, type XastElement, type XastRoot } from "svgo";

/** Serializable SVG element tree used by framework generators. */
export interface IconNode {
  tag: string;
  attrs: Record<string, string>;
  children: IconNode[];
}

export interface NormalizedIcon {
  /** Normalized SVG markup. Normalizing it again yields the same string. */
  svg: string;
  /** Root `<svg>` element of the normalized markup. */
  node: IconNode;
  /** True when the icon keeps its own colors (logos, multicolor assets). */
  multicolor: boolean;
}

export interface NormalizeOptions {
  /** Source file name, used in error messages. */
  file: string;
  /** Prefix that keeps `id` attributes unique when several icons share a document. */
  idPrefix: string;
  /** Colors replaced by `currentColor`. Defaults to the Iconsax base color. */
  themeColors?: readonly string[];
}

const DEFAULT_THEME_COLORS = ["#292d32"];
const COLOR_ATTRIBUTES = ["fill", "stroke", "stop-color", "flood-color", "lighting-color", "color"];
const NEUTRAL_COLORS = new Set(["none", "currentcolor", "transparent", "inherit"]);

// Colors inside clip paths and masks define geometry or luminance, not the icon palette.
const GEOMETRY_CONTAINERS = new Set(["clipPath", "mask"]);

function paintedElements(node: XastRoot | XastElement): XastElement[] {
  return node.children.flatMap((child) =>
    child.type === "element" && !GEOMETRY_CONTAINERS.has(child.name)
      ? [child, ...paintedElements(child)]
      : [],
  );
}

function toIconNode(element: XastElement): IconNode {
  return {
    tag: element.name,
    attrs: { ...element.attributes },
    children: element.children.flatMap((child) =>
      child.type === "element" ? [toIconNode(child)] : [],
    ),
  };
}

/**
 * Replaces theme colors with `currentColor`, unless the icon uses other colors,
 * in which case it is treated as multicolor and keeps every color unchanged.
 */
function themeColorPlugin(themeColors: Set<string>, result: { multicolor: boolean }): CustomPlugin {
  return {
    name: "klimaThemeColor",
    fn: () => ({
      root: {
        enter(root) {
          const nodes = paintedElements(root);
          const colors = nodes.flatMap((node) =>
            COLOR_ATTRIBUTES.flatMap((attribute) => {
              const value = node.attributes[attribute]?.trim().toLowerCase();
              return value && !NEUTRAL_COLORS.has(value) && !value.startsWith("url(")
                ? [value]
                : [];
            }),
          );
          result.multicolor = colors.some((color) => !themeColors.has(color));
          if (result.multicolor) return;
          for (const node of nodes)
            for (const attribute of COLOR_ATTRIBUTES) {
              const value = node.attributes[attribute]?.trim().toLowerCase();
              if (value && themeColors.has(value)) node.attributes[attribute] = "currentColor";
            }
        },
      },
    }),
  };
}

function capturePlugin(result: { root?: XastElement }): CustomPlugin {
  return {
    name: "klimaCapture",
    fn: () => ({
      root: {
        exit(root) {
          result.root = root.children.find(
            (child): child is XastElement => child.type === "element",
          );
        },
      },
    }),
  };
}

export function normalizeSvg(source: string, options: NormalizeOptions): NormalizedIcon {
  const themeColors = new Set(
    (options.themeColors ?? DEFAULT_THEME_COLORS).map((color) => color.toLowerCase()),
  );
  const state: { multicolor: boolean; root?: XastElement } = { multicolor: false };
  let svg: string;
  try {
    svg = optimize(source, {
      path: options.file,
      multipass: false,
      plugins: [
        {
          name: "preset-default",
          params: {
            overrides: {
              // Color conversion is handled by klimaThemeColor so logos keep their palette.
              convertColors: { currentColor: false, shorthex: false, shortname: false },
            },
          },
        },
        "removeDimensions",
        { name: "prefixIds", params: { prefix: options.idPrefix, delim: "-" } },
        themeColorPlugin(themeColors, state),
        capturePlugin(state),
      ],
    }).data;
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error);
    throw new Error(`${options.file}: invalid SVG (${cause})`, { cause: error });
  }
  const root = state.root;
  if (!root || root.name !== "svg")
    throw new Error(`${options.file}: invalid SVG (missing <svg> root element)`);
  if (!root.attributes.viewBox)
    throw new Error(`${options.file}: invalid SVG (missing viewBox attribute)`);
  return { svg, node: toIconNode(root), multicolor: state.multicolor };
}
