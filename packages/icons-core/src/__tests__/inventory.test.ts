import { describe, expect, it } from "vitest";
import {
  buildInventory,
  componentName,
  generatableEntries,
  parseFigmaName,
  proposeName,
  unconfirmedEntries,
  type RawIcon,
} from "../index.js";

const raw = (
  nodeId: string,
  figmaName: string,
  svg = `<svg>${nodeId}</svg>`,
  size = 24,
): RawIcon => ({
  nodeId,
  figmaName,
  frame: "Test",
  width: size,
  height: size,
  svg,
});

describe("naming", () => {
  it("parses Iconsax Figma names", () => {
    expect(parseFigmaName("vuesax/linear/search-normal")).toEqual({
      style: "linear",
      base: "search-normal",
    });
    expect(parseFigmaName("Group 8013")).toEqual({ base: "Group 8013" });
  });

  it("corrects inherited misspellings without keeping the old name", () => {
    expect(proposeName("money-recive")).toEqual({
      name: "money-receive",
      renamedFrom: "money-recive",
    });
    expect(proposeName("finger-cricle").name).toBe("finger-circle");
    expect(proposeName("trush-square").name).toBe("trash-square");
    expect(proposeName("search-normal")).toEqual({ name: "search-normal" });
  });

  it("slugifies unsafe names", () => {
    expect(proposeName("ruler&pen").name).toBe("ruler-and-pen");
    expect(proposeName("LinkedIn").name).toBe("linked-in");
  });

  it("builds valid component identifiers", () => {
    expect(componentName("search-normal")).toBe("SearchNormal");
    expect(componentName("3square")).toBe("Icon3square");
  });
});

describe("buildInventory", () => {
  it("classifies origin, status and issues", () => {
    const { entries } = buildInventory("file", "linear", [
      raw("1:1", "vuesax/linear/money-recive"),
      raw("1:2", "Group 8013"),
      raw("1:3", "vuesax/linear/Instagram"),
      raw("1:4", "vuesax/linear/small", undefined, 20),
      { ...raw("1:5", "State=checked, Type=Square"), variantOf: "checkbox" },
      raw("1:6", "vuesax/bulk/add"),
      { ...raw("1:7", "vuesax/linear/empty", ""), exportFailed: true },
    ]);
    const byNode = Object.fromEntries(entries.map((entry) => [entry.figma.nodeId, entry]));
    expect(byNode["1:1"]).toMatchObject({
      name: "money-receive",
      component: "MoneyReceive",
      origin: "iconsax",
      provenance: "unconfirmed",
      status: "candidate",
      renamedFrom: "money-recive",
    });
    expect(byNode["1:2"]).toMatchObject({ origin: "custom", status: "blocked" });
    expect(byNode["1:2"]?.issues).toContain("generic-name");
    expect(byNode["1:3"]).toMatchObject({ status: "excluded" });
    expect(byNode["1:4"]?.issues).toContain("non-standard-size:20x20");
    expect(byNode["1:5"]).toMatchObject({ status: "excluded" });
    expect(byNode["1:5"]?.issues).toContain("component-variant:checkbox");
    expect(byNode["1:6"]).toMatchObject({ status: "excluded" });
    expect(byNode["1:6"]?.issues).toContain("style-mismatch:bulk");
    expect(byNode["1:7"]).toMatchObject({ status: "excluded" });
    expect(byNode["1:7"]?.issues).toContain("no-svg-export");
  });

  it("excludes every component of a third-party logo frame", () => {
    const { entries } = buildInventory(
      "file",
      "twotone",
      [
        { ...raw("1:1", "vuesax/twotone/binance-coin-bnb"), frame: "two-tone" },
        raw("1:2", "vuesax/twotone/add"),
      ],
      { thirdPartyLogoFrames: ["two-tone"] },
    );
    expect(entries.map((entry) => [entry.name, entry.status])).toEqual([
      ["add", "candidate"],
      ["binance-coin-bnb", "excluded"],
    ]);
  });

  it("collapses identical duplicates and blocks conflicting ones", () => {
    const { entries } = buildInventory("file", "linear", [
      raw("1:1", "vuesax/linear/star", "<svg>same</svg>"),
      raw("1:2", "vuesax/linear/star", "<svg>same</svg>"),
      raw("2:1", "vuesax/linear/flash", "<svg>a</svg>"),
      raw("2:2", "vuesax/linear/flash", "<svg>b</svg>"),
    ]);
    const statuses = entries.map((entry) => [entry.figma.nodeId, entry.status, entry.duplicateOf]);
    expect(statuses).toEqual([
      ["2:1", "blocked", undefined],
      ["2:2", "blocked", undefined],
      ["1:1", "candidate", undefined],
      ["1:2", "duplicate", "1:1"],
    ]);
  });

  it("only generates candidates and reports their unconfirmed provenance", () => {
    const inventory = buildInventory("file", "linear", [
      raw("1:1", "vuesax/linear/add"),
      raw("1:2", "Vector"),
    ]);
    expect(generatableEntries(inventory).map((entry) => entry.name)).toEqual(["add"]);
    expect(unconfirmedEntries(inventory)).toHaveLength(1);
  });
});
