import { describe, expect, it } from "vitest";
import { validateInternal, validateTokenDocument, type TokenLayer } from "../index.js";

const px = (value: number) => ({ value, unit: "px" });
const primitives = {
  font: {
    family: { base: { $type: "fontFamily", $value: ["Be Vietnam Pro", "sans-serif"] } },
    size: { "14": { $type: "dimension", $value: px(14) } },
    weight: { "400": { $type: "fontWeight", $value: 400 } },
    "line-height": { normal: { $type: "number", $value: 1.5 } },
  },
};
const literal = {
  fontFamily: "Be Vietnam Pro",
  fontSize: px(14),
  fontWeight: 400,
  letterSpacing: px(0),
  lineHeight: 1.5,
};
const aliased = {
  fontFamily: "{font.family.base}",
  fontSize: "{font.size.14}",
  fontWeight: "{font.weight.400}",
  letterSpacing: px(0),
  lineHeight: "{font.line-height.normal}",
};
const codes = (document: unknown) =>
  validateTokenDocument(document).diagnostics.map((diagnostic) => diagnostic.code);

describe("typography tokens (ADR-005)", () => {
  it("accepts a literal typography value", () => {
    const result = validateTokenDocument({
      text: { body: { $type: "typography", $value: literal } },
    });
    expect(result.diagnostics).toEqual([]);
  });

  it("accepts property aliases and preserves them in the source", () => {
    const document = { ...primitives, text: { body: { $type: "typography", $value: aliased } } };
    const result = validateTokenDocument(document);
    expect(result.diagnostics).toEqual([]);
    expect(document.text.body.$value.fontSize).toBe("{font.size.14}");
  });

  it("accepts a whole-token alias to another typography token", () => {
    const result = validateTokenDocument({
      ...primitives,
      text: {
        body: { $type: "typography", $value: aliased },
        link: { $type: "typography", $value: "{text.body}" },
      },
    });
    expect(result.diagnostics).toEqual([]);
  });

  it("rejects missing and unknown properties", () => {
    const missing: Partial<typeof literal> = { ...literal };
    delete missing.lineHeight;
    expect(codes({ text: { body: { $type: "typography", $value: missing } } })).toContain(
      "value.type-mismatch",
    );
    expect(
      codes({
        text: { body: { $type: "typography", $value: { ...literal, fontStyle: "italic" } } },
      }),
    ).toContain("value.type-mismatch");
  });

  it("rejects literal properties of the wrong type", () => {
    expect(
      codes({ text: { body: { $type: "typography", $value: { ...literal, fontSize: 14 } } } }),
    ).toContain("value.type-mismatch");
  });

  it("rejects a property alias whose target has another type", () => {
    const result = validateTokenDocument({
      ...primitives,
      text: {
        body: { $type: "typography", $value: { ...aliased, fontSize: "{font.weight.400}" } },
      },
    });
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "typography.property-type-mismatch",
        path: "text.body",
        property: "$value.fontSize",
      }),
    );
  });

  it("rejects a property alias to another typography token", () => {
    const document = {
      ...primitives,
      text: {
        body: { $type: "typography", $value: aliased },
        link: { $type: "typography", $value: { ...aliased, fontFamily: "{text.body}" } },
      },
    };
    expect(codes(document)).toContain("typography.property-type-mismatch");
  });

  it("reports missing property alias targets", () => {
    const result = validateTokenDocument({
      ...primitives,
      text: { body: { $type: "typography", $value: { ...aliased, fontSize: "{font.size.99}" } } },
    });
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "alias.target-not-found", property: "$value.fontSize" }),
    );
  });

  it("rejects malformed aliases, $ref and deeper references inside properties", () => {
    const base = { ...primitives };
    expect(
      codes({
        ...base,
        text: { a: { $type: "typography", $value: { ...aliased, fontSize: "{font.size.14" } } },
      }),
    ).toContain("alias.invalid-syntax");
    expect(
      codes({
        ...base,
        text: {
          a: {
            $type: "typography",
            $value: { ...aliased, fontSize: { $ref: "#/font/size/14/$value" } },
          },
        },
      }),
    ).toContain("reference.embedded");
    expect(
      codes({
        ...base,
        text: {
          a: {
            $type: "typography",
            $value: { ...aliased, letterSpacing: { value: "{font.size.14}", unit: "px" } },
          },
        },
      }),
    ).toContain("reference.embedded");
  });

  it("keeps rejecting references embedded in non-typography composites", () => {
    expect(
      codes({
        ...primitives,
        shadow: {
          focus: {
            $type: "shadow",
            $value: {
              color: { colorSpace: "srgb", components: [0, 0, 0] },
              offsetX: "{font.size.14}",
              offsetY: px(1),
              blur: px(1),
              spread: px(0),
            },
          },
        },
      }),
    ).toContain("reference.embedded");
  });

  it("detects cycles through property aliases", () => {
    const result = validateTokenDocument({
      font: { size: { loop: { $type: "dimension", $value: "{text.body}" } } },
      text: { body: { $type: "typography", $value: { ...literal, fontSize: "{font.size.loop}" } } },
    });
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("reference.cycle");
  });

  it("enforces layer order for property aliases", () => {
    const document = {
      ...primitives,
      brand: { klima: { family: { $type: "fontFamily", $value: "Be Vietnam Pro" } } },
      text: {
        body: { $type: "typography", $value: { ...aliased, fontFamily: "{brand.klima.family}" } },
      },
    };
    const layers = (textLayer: TokenLayer) =>
      new Map<string, TokenLayer>([
        ["font.family.base", "global"],
        ["font.size.14", "global"],
        ["font.weight.400", "global"],
        ["font.line-height.normal", "global"],
        ["brand.klima.family", "brand"],
        ["text.body", textLayer],
      ]);
    expect(validateInternal(document, layers("semantic")).diagnostics).toEqual([]);
    expect(validateInternal(document, layers("global")).diagnostics).toContainEqual(
      expect.objectContaining({ code: "layer.dependency-inverse", property: "$value.fontFamily" }),
    );
  });
});
