// Type-level contract of @klima-ds/icons-react, checked by tree-shaking.test.js after the build.
import { createRef } from "react";
import type { IconComponent, IconProps } from "@klima-ds/icons-react/linear";
import * as linear from "@klima-ds/icons-react/linear";

export const props: IconProps = { size: 16, title: "Buscar", className: "icon", strokeWidth: 2 };
export const stringSize: IconProps = { size: "1.5rem" };
// @ts-expect-error size must be a number or a string
export const invalidSize: IconProps = { size: true };
export const components: IconComponent[] = Object.values(linear);
export const ref = createRef<SVGSVGElement>();
