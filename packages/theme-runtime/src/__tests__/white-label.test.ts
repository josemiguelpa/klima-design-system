import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { values } from "@klima-ds/tokens";
import { contrastRatio as toolingContrast } from "@klima-ds/tokens/tooling";
import { describe, expect, it } from "vitest";
import {
  CONTRAST_MINIMUM,
  contrastRatio,
  createWhiteLabelTheme,
  parseHexColor,
  type ThemeDiagnostic,
  type WhiteLabelResult,
} from "../index.js";

const WHITE = values.light["color.neutral.0"];
const NEAR_BLACK = values.light["color.neutral.950"];

function theme(result: WhiteLabelResult) {
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return result.theme;
}
const codes = (diagnostics: ThemeDiagnostic[]) => diagnostics.map((d) => `${d.code}:${d.field}`);

describe("createWhiteLabelTheme", () => {
  it("maps the primary color to the primary action in both modes", () => {
    const result = createWhiteLabelTheme({ primaryColor: "#2244A8" });
    expect(result).toEqual({
      ok: true,
      diagnostics: [
        expect.objectContaining({ code: "contrast.non-text", mode: "dark", severity: "warning" }),
      ],
      theme: {
        light: {
          "color.action.primary.default": "#2244a8",
          "color.action.primary.hover": "#2244a8",
          "color.action.primary.active": "#2244a8",
          "color.action.primary.foreground": WHITE,
        },
        dark: {
          "color.action.primary.default": "#2244a8",
          "color.action.primary.hover": "#2244a8",
          "color.action.primary.active": "#2244a8",
          "color.action.primary.foreground": WHITE,
        },
      },
    });
  });

  it("uses darkPrimaryColor in dark mode", () => {
    const { light, dark } = theme(
      createWhiteLabelTheme({ primaryColor: "#2244a8", darkPrimaryColor: "#6b8fe8" }),
    );
    expect(light["color.action.primary.default"]).toBe("#2244a8");
    expect(dark["color.action.primary.default"]).toBe("#6b8fe8");
    expect(dark["color.action.primary.foreground"]).toBe(NEAR_BLACK);
  });

  it("maps secondary colors to the secondary action", () => {
    const { light, dark } = theme(
      createWhiteLabelTheme({
        primaryColor: "#2244a8",
        darkPrimaryColor: "#6b8fe8",
        secondaryColor: "#1c7b5f",
        darkSecondaryColor: "#87e2c9",
      }),
    );
    expect(light["color.action.secondary.default"]).toBe("#1c7b5f");
    expect(light["color.action.secondary.foreground"]).toBe(WHITE);
    expect(dark["color.action.secondary.default"]).toBe("#87e2c9");
    expect(dark["color.action.secondary.foreground"]).toBe(NEAR_BLACK);
  });

  it("only overrides existing action tokens", () => {
    const { light, dark } = theme(
      createWhiteLabelTheme({ primaryColor: "#2244a8", secondaryColor: "#1c7b5f" }),
    );
    for (const path of [...Object.keys(light), ...Object.keys(dark)]) {
      expect(path).toMatch(
        /^color\.action\.(primary|secondary)\.(default|hover|active|foreground)$/,
      );
      expect(values.light).toHaveProperty([path]);
    }
  });

  it("normalizes #rgb and surrounding whitespace to lowercase #rrggbb", () => {
    expect(parseHexColor("  #ABC ")).toBe("#aabbcc");
    expect(parseHexColor("#A1B2C3")).toBe("#a1b2c3");
  });

  it("is deterministic", () => {
    const input = { primaryColor: "#915bd8", secondaryColor: "#3bb339" };
    expect(createWhiteLabelTheme(input)).toEqual(createWhiteLabelTheme(input));
  });
});

describe("invalid input never becomes black", () => {
  it.each([
    ["null", null, "input.invalid:undefined"],
    ["a string", "#915bd8", "input.invalid:undefined"],
    ["an array", ["#915bd8"], "input.invalid:undefined"],
    ["an empty object", {}, "input.required:primaryColor"],
    ["an undefined primary", { primaryColor: undefined }, "input.required:primaryColor"],
    ["an empty string", { primaryColor: "" }, "color.invalid:primaryColor"],
    ["a named color", { primaryColor: "red" }, "color.invalid:primaryColor"],
    ["rgb()", { primaryColor: "rgb(255 0 0)" }, "color.invalid:primaryColor"],
    ["a missing hash", { primaryColor: "915bd8" }, "color.invalid:primaryColor"],
    ["two digits", { primaryColor: "#12" }, "color.invalid:primaryColor"],
    ["five digits", { primaryColor: "#12345" }, "color.invalid:primaryColor"],
    ["non-hex digits", { primaryColor: "#gggggg" }, "color.invalid:primaryColor"],
    ["a number", { primaryColor: 0 }, "color.invalid:primaryColor"],
    ["null color", { primaryColor: null }, "color.invalid:primaryColor"],
    ["#rgba", { primaryColor: "#0008" }, "color.translucent:primaryColor"],
    ["#rrggbbaa", { primaryColor: "#00000080" }, "color.translucent:primaryColor"],
    [
      "an invalid dark color",
      { primaryColor: "#2244a8", darkPrimaryColor: "black" },
      "color.invalid:darkPrimaryColor",
    ],
  ])("rejects %s", (_name, input, expected) => {
    const result = createWhiteLabelTheme(input);
    expect(result.ok).toBe(false);
    expect(result).not.toHaveProperty("theme");
    expect(codes(result.diagnostics)).toContain(expected);
    expect(result.diagnostics.every((d) => d.message.length > 0)).toBe(true);
  });

  it("rejects legacy snake_case fields with a migration hint", () => {
    const result = createWhiteLabelTheme({ primary_color: "#915bd8", secondary_color: "#3bb339" });
    expect(result.ok).toBe(false);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "input.unknown-field",
          field: "primary_color",
          message: expect.stringContaining("rename it to primaryColor"),
        }),
        expect.objectContaining({ code: "input.unknown-field", field: "secondary_color" }),
        expect.objectContaining({ code: "input.required", field: "primaryColor" }),
      ]),
    );
  });

  it("reports every problem in one call", () => {
    const result = createWhiteLabelTheme({
      primaryColor: "nope",
      secondaryColor: "#00000080",
      extra: 1,
    });
    expect(codes(result.diagnostics).sort()).toEqual(
      [
        "color.invalid:primaryColor",
        "color.translucent:secondaryColor",
        "input.unknown-field:extra",
      ].sort(),
    );
  });
});

describe("foreground selection by measured contrast", () => {
  it.each([
    ["#767676", WHITE],
    ["#787878", NEAR_BLACK],
    ["#3bb339", NEAR_BLACK],
    ["#e2ff65", NEAR_BLACK],
    ["#152644", WHITE],
  ])("picks the higher-contrast foreground for %s", (color, expected) => {
    const { light } = theme(createWhiteLabelTheme({ primaryColor: color }));
    expect(light["color.action.primary.foreground"]).toBe(expected);
    expect(contrastRatio(expected, color.toLowerCase())).toBeGreaterThanOrEqual(
      CONTRAST_MINIMUM.text,
    );
  });

  it.each(["#777777", "#915bd8"])(
    "returns an error when no foreground reaches 4.5:1 on %s",
    (color) => {
      // Regression: the legacy isLight() heuristic paired #915bd8 (a production fallback) with white at 4.48:1.
      const result = createWhiteLabelTheme({ primaryColor: color });
      expect(result.ok).toBe(false);
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({
          code: "contrast.foreground-unavailable",
          field: "primaryColor",
          mode: "light",
          minimum: 4.5,
          ratio: 4.49,
        }),
      );
    },
  );

  it("guarantees text contrast for every #rgb color it accepts", () => {
    for (let index = 0; index < 4096; index += 1) {
      const color = `#${index.toString(16).padStart(3, "0")}`;
      const result = createWhiteLabelTheme({ primaryColor: color, secondaryColor: color });
      if (!result.ok) {
        expect(codes(result.diagnostics).every((c) => c.startsWith("contrast.foreground"))).toBe(
          true,
        );
        continue;
      }
      for (const overrides of Object.values(result.theme))
        for (const action of ["primary", "secondary"]) {
          const fill = overrides[
            `color.action.${action}.default` as keyof typeof overrides
          ] as string;
          const text = overrides[
            `color.action.${action}.foreground` as keyof typeof overrides
          ] as string;
          expect(contrastRatio(text, fill), `${text} on ${fill}`).toBeGreaterThanOrEqual(4.5);
        }
    }
  });

  it("matches the token tooling contrast formula", () => {
    const srgb = (hex: string) => ({
      colorSpace: "srgb" as const,
      components: [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255) as [
        number,
        number,
        number,
      ],
    });
    for (const [a, b] of [
      ["#915bd8", "#ffffff"],
      ["#3bb339", "#030712"],
      ["#777777", "#0a101d"],
    ] as const)
      expect(contrastRatio(a, b)).toBeCloseTo(toolingContrast(srgb(a), srgb(b)), 10);
  });
});

describe("non-text contrast against the canvas", () => {
  it("warns but still builds the theme", () => {
    const result = createWhiteLabelTheme({ primaryColor: "#e2ff65", darkPrimaryColor: "#152644" });
    expect(result.ok).toBe(true);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        severity: "warning",
        code: "contrast.non-text",
        field: "primaryColor",
        mode: "light",
        ratio: 1.12,
        minimum: 3,
      }),
      expect.objectContaining({
        severity: "warning",
        code: "contrast.non-text",
        field: "darkPrimaryColor",
        mode: "dark",
        ratio: 1.26,
      }),
    ]);
  });
});

describe("SSR safety", () => {
  const dist = fileURLToPath(new URL("../../dist", import.meta.url));

  it("ships no DOM or browser storage access", () => {
    for (const file of readdirSync(dist).filter((name) => name.endsWith(".js")))
      expect(readFileSync(`${dist}/${file}`, "utf8")).not.toMatch(
        /\b(document|window|localStorage|sessionStorage|navigator|CSS)\b/,
      );
  });

  it("runs in a plain Node process without a DOM", () => {
    const script = [
      `const { createWhiteLabelTheme } = await import(${JSON.stringify(`${dist}/index.js`)});`,
      'if (typeof document !== "undefined") throw new Error("unexpected DOM");',
      'console.log(JSON.stringify(createWhiteLabelTheme({ primaryColor: "#2244a8" }).ok));',
    ].join("\n");
    expect(
      execFileSync(process.execPath, ["--input-type=module", "-e", script], {
        encoding: "utf8",
      }).trim(),
    ).toBe("true");
  });
});
