import { describe, expect, it } from "vitest";
import {
  createWhiteLabelTheme,
  serializeWhiteLabelTheme,
  whiteLabelSelector,
  type WhiteLabelTheme,
} from "../index.js";

function theme(input: Parameters<typeof createWhiteLabelTheme>[0]): WhiteLabelTheme {
  const result = createWhiteLabelTheme(input);
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return result.theme;
}
const tenant = theme({
  primaryColor: "#2244a8",
  darkPrimaryColor: "#6b8fe8",
  secondaryColor: "#1c7b5f",
  darkSecondaryColor: "#87e2c9",
});

describe("serializeWhiteLabelTheme (TASK-018)", () => {
  it("serializes every mode with root-scoped selectors", () => {
    expect(
      serializeWhiteLabelTheme(theme({ primaryColor: "#2244a8", darkPrimaryColor: "#6b8fe8" })),
    ).toBe(`:root[data-white-label]:not([data-theme="dark"]) {
  --klima-color-action-primary-default: #2244a8;
  --klima-color-action-primary-hover: #2244a8;
  --klima-color-action-primary-active: #2244a8;
  --klima-color-action-primary-foreground: #ffffff;
}

:root[data-white-label][data-theme="dark"] {
  --klima-color-action-primary-default: #6b8fe8;
  --klima-color-action-primary-hover: #6b8fe8;
  --klima-color-action-primary-active: #6b8fe8;
  --klima-color-action-primary-foreground: #030712;
}
`);
  });

  it("is byte-identical for the same input", () => {
    expect(serializeWhiteLabelTheme(tenant)).toBe(
      serializeWhiteLabelTheme(structuredClone(tenant)),
    );
  });

  it("includes secondary actions", () => {
    expect(serializeWhiteLabelTheme(tenant)).toContain(
      "--klima-color-action-secondary-default: #87e2c9;",
    );
  });

  it("outranks brand themes with (0,3,0) selectors", () => {
    expect(whiteLabelSelector("light")).toBe(':root[data-white-label]:not([data-theme="dark"])');
    expect(whiteLabelSelector("dark")).toBe(':root[data-white-label][data-theme="dark"]');
  });

  it("omits modes without overrides", () => {
    expect(serializeWhiteLabelTheme({ light: {}, dark: {} })).toBe("");
  });

  it.each([
    [
      "an injected value",
      { light: { "color.action.primary.default": "#000000; } body { color: red" } },
    ],
    ["a named color", { light: { "color.action.primary.default": "red" } }],
    ["an uppercase hex", { light: { "color.action.primary.default": "#ABCDEF" } }],
    ["a non-action token", { light: { "color.text.primary": "#000000" } }],
    ["an injected key", { light: { "color.action.primary.default}body{": "#000000" } }],
    ["an unknown mode", { sepia: {} }],
  ])("refuses %s instead of escaping it", (_name, tampered) => {
    expect(() => serializeWhiteLabelTheme(tampered as unknown as WhiteLabelTheme)).toThrow(
      TypeError,
    );
  });
});
