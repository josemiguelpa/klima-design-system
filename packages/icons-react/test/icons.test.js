import { readFile, readdir } from "node:fs/promises";
import { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as linear from "../dist/linear/index.js";

const dist = new URL("../dist/", import.meta.url);
const buildInfo = JSON.parse(await readFile(new URL("build-info.json", dist), "utf8"));
const names = Object.keys(linear).sort();
const [firstName] = names;
const Icon = linear[firstName];
const render = (props) => renderToStaticMarkup(createElement(Icon, props));

describe("@klima-ds/icons-react/linear", () => {
  it("exports one component per generated icon", () => {
    expect(names.length).toBe(buildInfo.styles.linear.count);
    expect(names.length).toBeGreaterThan(0);
  });

  it("forwards refs and sets display names", () => {
    for (const name of names) {
      expect(linear[name].$$typeof).toBe(Symbol.for("react.forward_ref"));
      expect(linear[name].displayName).toBe(name);
    }
    expect(() => renderToStaticMarkup(createElement(Icon, { ref: createRef() }))).not.toThrow();
  });

  it("renders a decorative 24px icon by default", () => {
    const html = render();
    expect(html).toMatch(/^<svg /);
    expect(html).toContain('width="24"');
    expect(html).toContain('height="24"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('viewBox="');
    expect(html).not.toContain("<title");
  });

  it("exposes an accessible name when a title is given", () => {
    const html = render({ title: "Buscar" });
    expect(html).toContain('role="img"');
    expect(html).not.toContain("aria-hidden");
    const id = html.match(/aria-labelledby="([^"]+)"/)?.[1];
    expect(id).toBeTruthy();
    expect(html).toContain(`<title id="${id}">Buscar</title>`);
  });

  it("lets consumer props override generated defaults", () => {
    const html = render({ size: 16, className: "icon", fill: "red", "aria-hidden": false });
    expect(html).toContain('width="16"');
    expect(html).toContain('class="icon"');
    expect(html).toContain('fill="red"');
    expect(html).toContain('aria-hidden="false"');
  });

  it("keeps each subpath module equivalent to the barrel export", async () => {
    const files = (await readdir(new URL("linear/", dist))).filter(
      (file) => file.endsWith(".js") && file !== "index.js",
    );
    expect(files.length).toBe(names.length);
    for (const file of files) {
      const module = await import(new URL(`linear/${file}`, dist).href);
      const [named] = Object.keys(module).filter((key) => key !== "default");
      expect(module.default).toBe(module[named]);
      expect(linear[named]).toBe(module.default);
    }
  });
});
