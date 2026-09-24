import { describe, expect, it } from "vitest";
import valid from "./fixtures/valid.json" with { type: "json" };
import invalid from "./fixtures/invalid.json" with { type: "json" };
import {
  assembleTokens,
  manifest,
  validateInternal,
  validateManifest,
  validateTokenDocument,
  type TokenLayer,
  type TokenManifest,
} from "../index.js";
const validateManifestForTest = validateManifest;

describe("token contract", () => {
  it("accepts valid DTCG documents and preserves aliases", () => {
    const result = validateTokenDocument(valid);
    expect(result.valid).toBe(true);
    expect(
      (valid as { color: { text: { primary: { $value: unknown } } } }).color.text.primary.$value,
    ).toBe("{color.neutral.950}");
  });
  it("aggregates stable diagnostics", () => {
    const result = validateTokenDocument(invalid);
    expect(result.valid).toBe(false);
    expect(result.diagnostics.map((d) => d.code)).toEqual(
      expect.arrayContaining(["token.invalid-name", "alias.target-not-found", "reference.cycle"]),
    );
    expect(result.diagnostics.every((d) => d.path)).toBe(true);
  });
  it("assembles declared sources", () => {
    const result = assembleTokens();
    expect(result.validation.valid).toBe(true);
    expect(result.document.button).toBeDefined();
  });

  it("resolves a JSON Pointer descendant without flattening the source", () => {
    const document = {
      color: {
        source: {
          $type: "color",
          $value: { colorSpace: "srgb", components: [0.1, 0.2, 0.3], alpha: 1 },
        },
        component: { $type: "number", $ref: "#/color/source/$value/components/0" },
      },
    };
    const result = validateTokenDocument(document);
    expect(result.valid).toBe(true);
    expect(document.color.component.$ref).toBe("#/color/source/$value/components/0");
  });

  it("rejects type inheritance and unknown dollar properties on groups", () => {
    const result = validateTokenDocument({
      color: {
        $type: "color",
        $unknown: true,
        source: { $type: "color", $value: { colorSpace: "srgb", components: [0, 0, 0] } },
      },
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining(["group.type-forbidden", "group.unknown-property"]),
    );
  });
});

it("assembles from its package root regardless of consumer cwd", async () => {
  const original = process.cwd();
  process.chdir("/tmp");
  try {
    expect(assembleTokens().validation.valid).toBe(true);
  } finally {
    process.chdir(original);
  }
});

it("propagates invalid source diagnostics through validateManifest", () => {
  const result = validateManifestForTest({
    version: "2025.10",
    layers: ["global"],
    sources: [{ layer: "global", path: "src/__tests__/fixtures/invalid-source.json" }],
  });
  expect(result.valid).toBe(false);
  expect(result.diagnostics.some((diagnostic) => diagnostic.code === "token.invalid-name")).toBe(
    true,
  );
});

it("diagnoses non-object group members", () => {
  const result = validateTokenDocument({ color: { neutral: "invalid" } });
  expect(result.valid).toBe(false);
  expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("group.invalid-child");
});

it("rejects malformed color and dimension values", () => {
  const result = validateTokenDocument({
    color: {
      invalid: {
        $type: "color",
        $value: { colorSpace: "not-a-color-space", components: [0.2, "bad", 0.3] },
      },
    },
    space: { invalid: { $type: "dimension", $value: { value: "16", unit: "furlong" } } },
  });
  expect(result.valid).toBe(false);
  expect(
    result.diagnostics.filter((diagnostic) => diagnostic.code === "value.type-mismatch"),
  ).toHaveLength(2);
});

it("rejects aliases embedded in composite values", () => {
  const result = validateTokenDocument({
    color: {
      base: { $type: "color", $value: { colorSpace: "srgb", components: [0, 0, 0] } },
    },
    shadow: {
      focus: {
        $type: "shadow",
        $value: {
          color: "{color.base}",
          offsetX: { value: 1, unit: "px" },
          offsetY: { value: 1, unit: "px" },
          blur: { value: 2, unit: "px" },
        },
      },
    },
  });
  expect(result.valid).toBe(false);
  expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("reference.embedded");
});

it("resolves a descendant reference through an alias token", () => {
  const result = validateTokenDocument({
    color: {
      source: { $type: "color", $value: { colorSpace: "srgb", components: [0.1, 0.2, 0.3] } },
      alias: { $type: "color", $value: "{color.source}" },
      component: { $type: "number", $ref: "#/color/alias/$value/components/0" },
    },
  });
  expect(result.valid).toBe(true);
});

it("rejects malformed shadow composites and nested references", () => {
  const result = validateTokenDocument({
    shadow: {
      invalid: {
        $type: "shadow",
        $value: {
          color: { $ref: "#/color/source/$value" },
          offsetX: 1,
          offsetY: null,
          blur: { value: 2, unit: "px" },
        },
      },
    },
    color: { source: { $type: "color", $value: { colorSpace: "srgb", components: [0, 0, 0] } } },
  });
  expect(result.valid).toBe(false);
  expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
    expect.arrayContaining(["reference.embedded", "value.type-mismatch"]),
  );
});

it("rejects ancestor and descendant token path collisions during assembly", () => {
  const result = validateManifest({
    version: "2025.10",
    layers: ["global"],
    sources: [
      { layer: "global", path: "src/__tests__/fixtures/ancestor-token.json" },
      { layer: "global", path: "src/__tests__/fixtures/descendant-token.json" },
    ],
  });
  expect(result.valid).toBe(false);
  expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
    "manifest.path-collision",
  );
});

it("validates font weight names and numeric bounds", () => {
  expect(
    validateTokenDocument({ font: { normal: { $type: "fontWeight", $value: "bold" } } }).valid,
  ).toBe(true);
  expect(
    validateTokenDocument({ font: { tooHeavy: { $type: "fontWeight", $value: 2000 } } }).valid,
  ).toBe(false);
});

it("restricts the integer 0-100 opacity range to the opacity domain root", () => {
  const outsideOpacityDomain = validateTokenDocument({
    space: { opacity: { $type: "number", $value: 150 } },
  });
  expect(outsideOpacityDomain.valid).toBe(true);
  const insideOpacityDomain = validateTokenDocument({
    opacity: { disabled: { $type: "number", $value: 150 } },
  });
  expect(insideOpacityDomain.valid).toBe(false);
  expect(insideOpacityDomain.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
    "number.opacity-range",
  );
});

it("rejects non-$ child properties nested inside a token node", () => {
  const result = validateTokenDocument({
    color: {
      invalid: {
        $type: "color",
        $value: { colorSpace: "srgb", components: [0, 0, 0] },
        nested: { $type: "color", $value: { colorSpace: "srgb", components: [1, 2, 3] } },
      },
    },
  });
  expect(result.valid).toBe(false);
  expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
    "token.unknown-property",
  );
});

it("rejects unsupported dimension units and incomplete shadows", () => {
  const result = validateTokenDocument({
    space: { viewport: { $type: "dimension", $value: { value: 1, unit: "vw" } } },
    shadow: {
      incomplete: {
        $type: "shadow",
        $value: {
          color: { colorSpace: "srgb", components: [0, 0, 0] },
          offsetX: { value: 1, unit: "px" },
          offsetY: { value: 1, unit: "px" },
          blur: { value: 1, unit: "px" },
        },
      },
    },
  });
  expect(result.valid).toBe(false);
});

it("does not traverse JSON Pointer prototype properties", () => {
  const result = validateTokenDocument({
    number: {
      source: { $type: "number", $value: 1 },
      ref: { $type: "number", $ref: "#/number/source/$value/constructor" },
    },
  });
  expect(result.valid).toBe(false);
  expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("ref.target-not-found");
});

it("accepts fractional font weights and shadow arrays", () => {
  const result = validateTokenDocument({
    font: { regular: { $type: "fontWeight", $value: 450.5 } },
    shadow: {
      stack: {
        $type: "shadow",
        $value: [
          {
            color: { colorSpace: "srgb", components: [0, 0, 0] },
            offsetX: { value: 1, unit: "px" },
            offsetY: { value: 1, unit: "px" },
            blur: { value: 2, unit: "px" },
            spread: { value: 0, unit: "px" },
          },
        ],
      },
    },
  });
  expect(result.valid).toBe(true);
});

it("rejects invalid JSON Pointer escapes", () => {
  const result = validateTokenDocument({
    number: {
      source: { $type: "number", $value: 1 },
      ref: { $type: "number", $ref: "#/number/source/$value/~2" },
    },
  });
  expect(result.valid).toBe(false);
  expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("ref.invalid-target");
});

it("resolves a JSON Pointer to an alias token's own $value", () => {
  const result = validateTokenDocument({
    space: {
      "4": { $type: "dimension", $value: { value: 16, unit: "px" } },
    },
    control: {
      height: { $type: "dimension", $value: "{space.4}" },
    },
    button: {
      height: { $type: "dimension", $ref: "#/control/height/$value" },
    },
  });
  expect(result.valid).toBe(true);
});

it("rejects a JSON Pointer to a token that does not expose a concrete $value", () => {
  const result = validateTokenDocument({
    color: {
      base: { $type: "color", $ref: "#/color/missing/$value" },
    },
  });
  expect(result.valid).toBe(false);
  expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("ref.target-not-found");
});

it("diagnoses malformed manifest source entries", () => {
  const result = validateManifest({
    version: "2025.10",
    layers: ["global"],
    sources: [null],
  } as never);
  expect(result.valid).toBe(false);
  expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
    "manifest.source-invalid",
  );
});

it("validates metadata on groups and tokens", () => {
  const result = validateTokenDocument({
    color: {
      $extensions: "bad",
      group: {
        $extensions: { vendor: true },
        token: {
          $type: "color",
          $description: 42,
          $value: { colorSpace: "srgb", components: [0, 0, 0] },
        },
      },
    },
  });
  expect(result.valid).toBe(false);
  expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
    expect.arrayContaining([
      "extensions.invalid",
      "extensions.invalid-namespace",
      "metadata.description-invalid",
    ]),
  );
});

it("accepts the package manifest and its physical layer layout", () => {
  const result = validateManifest(manifest as TokenManifest);
  expect(result.valid).toBe(true);
});

it("rejects a global primitive aliasing a brand primitive", () => {
  const document = {
    color: {
      global: { $type: "color", $value: "{color.brand}" },
      brand: { $type: "color", $value: { colorSpace: "srgb", components: [0, 0, 0] } },
    },
  };
  const layerByPath = new Map<string, TokenLayer>([
    ["color.global", "global"],
    ["color.brand", "brand"],
  ]);
  const result = validateInternal(document, layerByPath);
  expect(result.valid).toBe(false);
  expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
    "layer.dependency-inverse",
  );
});

it("accepts a brand primitive aliasing a global primitive", () => {
  const document = {
    color: {
      global: { $type: "color", $value: { colorSpace: "srgb", components: [0, 0, 0] } },
      brand: { $type: "color", $value: "{color.global}" },
    },
  };
  const layerByPath = new Map<string, TokenLayer>([
    ["color.global", "global"],
    ["color.brand", "brand"],
  ]);
  const result = validateInternal(document, layerByPath);
  expect(result.valid).toBe(true);
});

it("validates deprecated metadata", () => {
  const result = validateTokenDocument({
    color: {
      token: {
        $type: "color",
        $deprecated: 42,
        $value: { colorSpace: "srgb", components: [0, 0, 0] },
      },
    },
  });
  expect(result.valid).toBe(false);
  expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
    "metadata.deprecated-invalid",
  );
});
