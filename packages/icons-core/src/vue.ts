import {
  GENERATED_HEADER as HEADER,
  assertSupportedIcon,
  rootDefaults,
  sortedIcons,
  type GeneratedStyle,
} from "./generate.js";
import type { IconNode } from "./normalize.js";

/** Compact element tuple consumed by the runtime: [tag, attributes, children?]. */
type NodeTuple = [string, Record<string, string>, NodeTuple[]?];

// Vue passes SVG attributes through unchanged, so names stay kebab-case.
function toTuple(node: IconNode): NodeTuple {
  const attrs = rootDefaults(node);
  return node.children.length > 0
    ? [node.tag, attrs, node.children.map(toTuple)]
    : [node.tag, attrs];
}

const RUNTIME_JS = `${HEADER}import { defineComponent, h, useId } from "vue";

function renderNode(node) {
  const [tag, attrs, children] = node;
  return h(tag, attrs, children ? children.map(renderNode) : undefined);
}

export function createIcon(name, rootAttrs, nodes) {
  return defineComponent({
    name,
    inheritAttrs: false,
    props: {
      size: { type: [Number, String], default: 24 },
      title: { type: String, default: undefined },
    },
    setup(props, { attrs, slots }) {
      const titleId = useId();
      return () => {
        const accessibility = props.title
          ? { role: "img", "aria-labelledby": titleId }
          : { "aria-hidden": "true", focusable: "false" };
        return h(
          "svg",
          { ...rootAttrs, width: props.size, height: props.size, ...accessibility, ...attrs },
          [
            props.title ? h("title", { id: titleId }, props.title) : null,
            ...nodes.map(renderNode),
            slots.default?.(),
          ],
        );
      };
    },
  });
}
`;

const RUNTIME_DTS = `${HEADER}import type { DefineComponent } from "vue";

export interface IconProps {
  /** Width and height of the icon. Defaults to 24. */
  size?: number | string;
  /** Accessible name. Without a title the icon is decorative and hidden from assistive technology. */
  title?: string;
}

/** Other attributes (class, style, stroke-width, aria-*) fall through to the <svg> element. */
export type IconComponent = DefineComponent<IconProps>;

/** @internal */
export declare function createIcon(
  name: string,
  rootAttrs: Record<string, string>,
  nodes: readonly unknown[],
): IconComponent;
`;

/** Returns the generated @klima-ds/icons-vue files keyed by path relative to dist/. */
export function renderVue(styles: readonly GeneratedStyle[]): Map<string, string> {
  const files = new Map<string, string>([
    ["create-icon.js", RUNTIME_JS],
    ["create-icon.d.ts", RUNTIME_DTS],
  ]);
  for (const entry of styles) {
    const { style } = entry;
    const sorted = sortedIcons(entry);
    for (const icon of sorted) {
      const file = `${style}/${icon.name}`;
      assertSupportedIcon(icon.node, file);
      const root = rootDefaults(icon.node);
      const nodes = icon.node.children.map(toTuple);
      files.set(
        `${file}.js`,
        `${HEADER}import { createIcon } from "../create-icon.js";\n\n` +
          `const ${icon.component} = /* @__PURE__ */ createIcon(${JSON.stringify(icon.component)}, ${JSON.stringify(root)}, ${JSON.stringify(nodes)});\n\n` +
          `export default ${icon.component};\nexport { ${icon.component} };\n`,
      );
      files.set(
        `${file}.d.ts`,
        `${HEADER}import type { IconComponent } from "../create-icon.js";\n\n` +
          `declare const ${icon.component}: IconComponent;\n\n` +
          `export default ${icon.component};\nexport { ${icon.component} };\n`,
      );
    }
    const reexports = sorted
      .map((icon) => `export { ${icon.component} } from "./${icon.name}.js";\n`)
      .join("");
    files.set(`${style}/index.js`, `${HEADER}${reexports}`);
    files.set(
      `${style}/index.d.ts`,
      `${HEADER}export type { IconComponent, IconProps } from "../create-icon.js";\n${reexports}`,
    );
  }
  return files;
}
