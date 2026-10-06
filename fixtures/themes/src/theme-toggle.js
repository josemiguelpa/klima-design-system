/** Switches data-theme between light and dark on the given element and returns the new mode. */
export function toggleTheme(root) {
  const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  return next;
}
