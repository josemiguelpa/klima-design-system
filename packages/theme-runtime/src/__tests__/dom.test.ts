// @vitest-environment happy-dom
/// <reference lib="dom" />
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_STYLE_ID, applyWhiteLabelTheme } from "../dom.js";
import { createWhiteLabelTheme, serializeWhiteLabelTheme, type WhiteLabelTheme } from "../index.js";

function theme(primaryColor: string): WhiteLabelTheme {
  const result = createWhiteLabelTheme({ primaryColor });
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return result.theme;
}
const managed = () => document.querySelectorAll(`style#${DEFAULT_STYLE_ID}`);

afterEach(() => {
  document.head.innerHTML = "";
  document.documentElement.removeAttribute("data-white-label");
});

describe("applyWhiteLabelTheme (TASK-018)", () => {
  it("creates one <style> with the serialized theme and activates it on <html>", () => {
    const tenant = theme("#2244a8");
    applyWhiteLabelTheme(tenant);
    expect(managed()).toHaveLength(1);
    expect(managed()[0]?.parentElement).toBe(document.head);
    expect(managed()[0]?.textContent).toBe(serializeWhiteLabelTheme(tenant));
    expect(document.documentElement.hasAttribute("data-white-label")).toBe(true);
  });

  it("sets the CSP nonce and never uses inline style attributes", () => {
    applyWhiteLabelTheme(theme("#2244a8"), { nonce: "r4nd0m" });
    expect(managed()[0]?.getAttribute("nonce")).toBe("r4nd0m");
    expect(document.querySelectorAll("[style]")).toHaveLength(0);
  });

  it("updates the same element when applied again", () => {
    applyWhiteLabelTheme(theme("#2244a8"));
    applyWhiteLabelTheme(theme("#1c7b5f"));
    expect(managed()).toHaveLength(1);
    expect(managed()[0]?.textContent).toContain("#1c7b5f");
    expect(managed()[0]?.textContent).not.toContain("#2244a8");
  });

  it("supports a custom id", () => {
    applyWhiteLabelTheme(theme("#2244a8"), { id: "tenant-theme" });
    expect(document.getElementById("tenant-theme")?.tagName).toBe("STYLE");
    expect(managed()).toHaveLength(0);
  });

  it("removes the element and the activation attribute on cleanup", () => {
    const remove = applyWhiteLabelTheme(theme("#2244a8"));
    remove();
    expect(managed()).toHaveLength(0);
    expect(document.documentElement.hasAttribute("data-white-label")).toBe(false);
  });

  it("refuses to overwrite an element that is not a <style>", () => {
    const div = document.createElement("div");
    div.id = DEFAULT_STYLE_ID;
    document.body.append(div);
    expect(() => applyWhiteLabelTheme(theme("#2244a8"))).toThrow("is not a <style>");
    div.remove();
  });

  it("does not use eval, Function or inline style APIs", () => {
    const source = readFileSync(resolve(process.cwd(), "src/dom.ts"), "utf8");
    expect(source).not.toMatch(/\beval\(|new Function|\.style\b|setAttribute\("style"|innerHTML/);
  });
});
