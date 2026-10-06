import "@klima-ds/tokens/css";
import "@klima-ds/themes/sole.css";
import "./app.css";
import { createWhiteLabelTheme } from "@klima-ds/theme-runtime";
import { applyWhiteLabelTheme } from "@klima-ds/theme-runtime/dom";

const input = document.querySelector("[data-tenant-color]");
const status = document.querySelector("[data-tenant-status]");
const toggle = document.querySelector("[data-theme-toggle]");

function applyTenant(primaryColor) {
  const result = createWhiteLabelTheme({ primaryColor });
  status.textContent = result.diagnostics.map((diagnostic) => diagnostic.message).join(" ");
  if (result.ok) applyWhiteLabelTheme(result.theme);
}

input.addEventListener("input", () => applyTenant(input.value));
applyTenant(input.value);

toggle.addEventListener("click", () => {
  const root = document.documentElement;
  const mode = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", mode);
  toggle.setAttribute("aria-pressed", String(mode === "dark"));
});
