import "@klima-ds/tokens/css";
import "@klima-ds/themes/sole.css";
import "./app.css";
import { toggleTheme } from "./theme-toggle.js";

const toggle = document.querySelector("[data-theme-toggle]");
toggle.addEventListener("click", () => {
  const mode = toggleTheme(document.documentElement);
  toggle.setAttribute("aria-pressed", String(mode === "dark"));
});
