// Minimal static CSS cascade for custom properties declared on the root element (TASK-010).
// It supports exactly the selector forms Klima generates and throws on anything else, so a new
// selector shape fails loudly instead of being silently ignored.

const ATTRIBUTE = /^\[([a-z-]+)="([^"]*)"\]/;

/** Parses `:root`, `[attr="value"]` and `:not([attr="value"])` compounds. */
function parseCompound(selector) {
  const parts = [];
  let rest = selector.trim();
  while (rest) {
    let match;
    if (rest.startsWith(":root")) {
      parts.push({ kind: "root" });
      rest = rest.slice(5);
    } else if ((match = rest.match(ATTRIBUTE))) {
      parts.push({ kind: "attribute", name: match[1], value: match[2] });
      rest = rest.slice(match[0].length);
    } else if ((match = rest.match(/^:not\((\[[a-z-]+="[^"]*"\])\)/))) {
      const [, name, value] = match[1].match(ATTRIBUTE);
      parts.push({ kind: "not", name, value });
      rest = rest.slice(match[0].length);
    } else throw new Error(`Unsupported selector: ${selector}`);
  }
  return parts;
}

function matches(parts, attributes) {
  return parts.every((part) => {
    if (part.kind === "root") return true;
    if (part.kind === "attribute") return attributes[part.name] === part.value;
    return attributes[part.name] !== part.value;
  });
}

/** Parses rules, keeping their source order across every stylesheet. */
export function parseStylesheets(...sheets) {
  const rules = [];
  for (const sheet of sheets) {
    const source = sheet.replace(/\/\*[\s\S]*?\*\//g, "");
    for (const [, selectorList, body] of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const declarations = [...body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map(
        ([, name, value]) => [name, value.trim()],
      );
      for (const selector of selectorList.split(","))
        rules.push({ parts: parseCompound(selector), declarations, order: rules.length });
    }
  }
  return rules;
}

/** Resolves every custom property on a root element with the given attributes. */
export function resolveCustomProperties(rules, attributes) {
  const winners = new Map();
  for (const rule of rules) {
    if (!matches(rule.parts, attributes)) continue;
    // Every supported part has class-level specificity (0,1,0).
    const specificity = rule.parts.length;
    for (const [name, value] of rule.declarations) {
      const current = winners.get(name);
      if (
        !current ||
        specificity > current.specificity ||
        (specificity === current.specificity && rule.order > current.order)
      )
        winners.set(name, { value, specificity, order: rule.order });
    }
  }
  const resolved = new Map();
  const resolve = (name, stack = []) => {
    if (resolved.has(name)) return resolved.get(name);
    if (stack.includes(name)) throw new Error(`Cycle: ${[...stack, name].join(" -> ")}`);
    const winner = winners.get(name);
    if (!winner) throw new Error(`Undefined custom property: ${name}`);
    const value = winner.value.replace(/var\((--[a-z0-9-]+)\)/g, (_, ref) =>
      resolve(ref, [...stack, name]),
    );
    resolved.set(name, value);
    return value;
  };
  for (const name of winners.keys()) resolve(name);
  return resolved;
}
