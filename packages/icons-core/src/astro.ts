import {
  GENERATED_HEADER,
  assertSupportedIcon,
  rootDefaults,
  sortedIcons,
  type GeneratedStyle,
} from "./generate.js";
import type { IconNode } from "./normalize.js";

function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/** Serializes normalized SVG children to markup. Values come from SVGO output. */
export function serializeSvgNodes(nodes: readonly IconNode[]): string {
  return nodes
    .map((node) => {
      const attrs = Object.entries(rootDefaults(node))
        .map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`)
        .join("");
      return node.children.length > 0
        ? `<${node.tag}${attrs}>${serializeSvgNodes(node.children)}</${node.tag}>`
        : `<${node.tag}${attrs}/>`;
    })
    .join("");
}

// Shared component: generated defaults first, then size and accessibility, then consumer
// attributes, merged in one object so consumer values always win.
const SVG_COMPONENT = `---
${GENERATED_HEADER.trim()}
import { nextTitleId } from "./title-id.js";

interface Props {
  defaults: Record<string, string>;
  inner: string;
  size?: number | string;
  title?: string;
  [attribute: string]: unknown;
}

const { defaults, inner, size = 24, title, ...rest } = Astro.props;
const titleId = title ? nextTitleId() : undefined;
const accessibility = title
  ? { role: "img", "aria-labelledby": titleId }
  : { "aria-hidden": "true", focusable: "false" };
const attributes = { ...defaults, width: size, height: size, ...accessibility, ...rest };
---

<svg {...attributes}>{title && <title id={titleId}>{title}</title>}<Fragment set:html={inner} /><slot /></svg>
`;

const TITLE_ID_JS = `${GENERATED_HEADER}let counter = 0;

/** Unique id linking an icon to its <title> within a rendered page. */
export function nextTitleId() {
  counter += 1;
  return \`klima-icon-title-\${counter}\`;
}
`;

const TYPES_DTS = `${GENERATED_HEADER}export interface IconProps {
  /** Width and height of the icon. Defaults to 24. */
  size?: number | string;
  /** Accessible name. Without a title the icon is decorative and hidden from assistive technology. */
  title?: string;
  class?: string;
  /** Other attributes (stroke-width, aria-*, data-*) are applied to the <svg> element. */
  [attribute: string]: unknown;
}

/** Astro component signature, compatible with how Astro types \`.astro\` modules. */
export type IconComponent = (props: IconProps) => unknown;
`;

/** Returns the generated @klima-ds/icons-astro files keyed by path relative to dist/. */
export function renderAstro(styles: readonly GeneratedStyle[]): Map<string, string> {
  const files = new Map<string, string>([
    ["Svg.astro", SVG_COMPONENT],
    ["title-id.js", TITLE_ID_JS],
    ["types.d.ts", TYPES_DTS],
  ]);
  for (const entry of styles) {
    const { style } = entry;
    const sorted = sortedIcons(entry);
    for (const icon of sorted) {
      const file = `${style}/${icon.name}`;
      assertSupportedIcon(icon.node, file);
      const defaults = rootDefaults(icon.node);
      const inner = serializeSvgNodes(icon.node.children);
      files.set(
        `${file}.astro`,
        `---\n${GENERATED_HEADER.trim()}\nimport Svg from "../Svg.astro";\nimport type { IconProps } from "../types";\n\n` +
          `type Props = IconProps;\n\n` +
          `const defaults = ${JSON.stringify(defaults)};\nconst inner = ${JSON.stringify(inner)};\n---\n\n` +
          `<Svg {...Astro.props} defaults={defaults} inner={inner}><slot /></Svg>\n`,
      );
      files.set(
        `${file}.d.ts`,
        `${GENERATED_HEADER}import type { IconComponent } from "../types.js";\n\n` +
          `declare const ${icon.component}: IconComponent;\n\nexport default ${icon.component};\n`,
      );
    }
    files.set(
      `${style}/index.js`,
      GENERATED_HEADER +
        sorted
          .map((icon) => `export { default as ${icon.component} } from "./${icon.name}.astro";\n`)
          .join(""),
    );
    files.set(
      `${style}/index.d.ts`,
      `${GENERATED_HEADER}import type { IconComponent } from "../types.js";\n\nexport type { IconComponent, IconProps } from "../types.js";\n` +
        sorted.map((icon) => `export declare const ${icon.component}: IconComponent;\n`).join(""),
    );
  }
  return files;
}
