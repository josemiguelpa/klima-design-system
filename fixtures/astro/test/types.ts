// Type-level contract of @klima-ds/icons-astro, checked by build.test.js after the build.
import type { IconComponent, IconProps } from "@klima-ds/icons-astro/linear";
import * as linear from "@klima-ds/icons-astro/linear";
import * as bold from "@klima-ds/icons-astro/bold";
import * as twotone from "@klima-ds/icons-astro/twotone";
import * as bulk from "@klima-ds/icons-astro/bulk";
import * as broken from "@klima-ds/icons-astro/broken";

export const props: IconProps = { size: 16, title: "Buscar", class: "icon", "stroke-width": 2 };
export const stringSize: IconProps = { size: "1.5rem" };
export const components: IconComponent[] = [
  ...Object.values(linear),
  ...Object.values(bold),
  ...Object.values(twotone),
  ...Object.values(bulk),
  ...Object.values(broken),
];
