// Type-level contract of @klima-ds/icons-vue, checked by tree-shaking.test.js after the build.
import { h } from "vue";
import type { IconComponent, IconProps } from "@klima-ds/icons-vue/linear";
import * as linear from "@klima-ds/icons-vue/linear";
import * as bold from "@klima-ds/icons-vue/bold";
import * as twotone from "@klima-ds/icons-vue/twotone";
import * as bulk from "@klima-ds/icons-vue/bulk";
import * as broken from "@klima-ds/icons-vue/broken";

export const props: IconProps = { size: 16, title: "Buscar" };
export const stringSize: IconProps = { size: "1.5rem" };
// @ts-expect-error size must be a number or a string
export const invalidSize: IconProps = { size: true };
export const components: IconComponent[] = [
  ...Object.values(linear),
  ...Object.values(bold),
  ...Object.values(twotone),
  ...Object.values(bulk),
  ...Object.values(broken),
];
export const vnode = h(components[0] as IconComponent, { size: 20, class: "icon" });
