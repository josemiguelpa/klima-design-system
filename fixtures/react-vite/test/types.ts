// Type-level contract of @klima-ds/icons-react, checked by tree-shaking.test.js after the build.
import { createRef } from "react";
import type { IconComponent, IconProps } from "@klima-ds/icons-react/linear";
import type { IconProps as BoldIconProps } from "@klima-ds/icons-react/bold";
import * as linear from "@klima-ds/icons-react/linear";
import * as bold from "@klima-ds/icons-react/bold";
import * as twotone from "@klima-ds/icons-react/twotone";
import * as bulk from "@klima-ds/icons-react/bulk";
import * as broken from "@klima-ds/icons-react/broken";

export const props: IconProps = { size: 16, title: "Buscar", className: "icon", strokeWidth: 2 };
export const boldProps: BoldIconProps = props;
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
export const ref = createRef<SVGSVGElement>();
