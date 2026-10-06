# TASK-012: Crear núcleo validado de white-label

## Objetivo

Generar un tema runtime seguro a partir de colores de marca sin depender de DOM ni shadcn.

## Dependencias

- TASK-008.

## Alcance

- API pura con nombres camelCase.
- No incluye adapter para nombres legacy; las aplicaciones migran a camelCase antes de invocar la API.
- Rechazar colores inválidos.
- Elegir foreground por contraste medido.
- Retornar advertencias o errores estructurados para combinaciones inseguras.
- Tests de frontera y regresión.

## Fuera de alcance

- Inyectar `<style>` en DOM.
- Generar variables shadcn.
- Definir paletas de charts sin especificación de diseño.

## Criterios de aceptación

- Ningún input inválido se convierte silenciosamente en negro.
- Los pares de texto cumplen el umbral acordado.
- El módulo puede ejecutarse en SSR.

## Decisiones del propietario

- **Acción secundaria.** Se añade `color.action.secondary.{default,hover,active,foreground}` al contrato semántico de `@klima-ds/tokens` para alimentar `secondaryColor`. Los valores neutrales por defecto son provisionales; ningún diseño los define todavía:
  - light: `neutral.500` / `600` / `700` con texto `neutral.0`;
  - dark: `neutral.400` / `300` / `200` con texto `neutral.950`.

  Todos cumplen AA en texto y no-texto, y entran en `CONTRAST_PAIRS`.

- **Modo dark.** `darkPrimaryColor` y `darkSecondaryColor` son opcionales; si faltan, se usa el color base. No se generan mezclas, porque token-model las prohíbe sin validación de diseño.
- **Contraste no-texto.** Si la acción no alcanza 3:1 frente al canvas, se emite una advertencia y el tema se genera igualmente.

## Implementación

Paquete `@klima-ds/theme-runtime`. Depende solo de la raíz de `@klima-ds/tokens` (valores sin Node).

```ts
import { createWhiteLabelTheme } from "@klima-ds/theme-runtime";

const result = createWhiteLabelTheme({ primaryColor: "#2244a8", darkPrimaryColor: "#6b8fe8" });
if (result.ok)
  result.theme.dark["color.action.primary.default"]; // "#6b8fe8"
else result.diagnostics; // [{ severity, code, field, mode?, ratio?, minimum?, message }]
```

- **Entrada.** `createWhiteLabelTheme(input: unknown)` acepta `primaryColor` (obligatorio), `darkPrimaryColor`, `secondaryColor` y `darkSecondaryColor`. Cada color es un hex opaco `#rgb` o `#rrggbb`; se recortan los espacios y se normaliza a `#rrggbb` en minúsculas.
- **Salida.** `{ ok: true, theme, diagnostics }` o `{ ok: false, diagnostics }`. La función nunca lanza excepciones por un input inválido ni usa un color por defecto. `theme.<modo>` contiene solo `color.action.{primary,secondary}.*`, con claves `TokenPath`.
- **Foreground.** Se elige entre `color.neutral.0` y `color.neutral.950` el candidato con mayor contraste medido (WCAG 2.x). Si ninguno alcanza 4.5:1, se devuelve el error `contrast.foreground-unavailable`.
- **Hover y active.** Repiten el relleno, igual que en el tema Solé.
- **Ratios.** Los diagnósticos los truncan a dos decimales, para que un fallo de 4.496 no se muestre como 4.5.
- **Códigos de diagnóstico:**
  - `input.invalid`
  - `input.required`
  - `input.unknown-field`: incluye una pista de migración para `primary_color` y `secondary_color`
  - `color.invalid`
  - `color.translucent`
  - `contrast.foreground-unavailable`
  - `contrast.non-text` (advertencia)
- **SSR.** `tsconfig.build.json` compila con `lib: ES2022` y `types: []`. Cualquier uso de `document`, `window` o API de Node rompe el build.

### Diferencias con el legacy

| Legacy (`@solenium-software/design-system/theme`)     | Klima                                                 |
| ----------------------------------------------------- | ----------------------------------------------------- |
| `primary_color`, `secondary_color`                    | `primaryColor`, `secondaryColor` (snake_case → error) |
| Color inválido → negro                                | Error estructurado `color.invalid`                    |
| Foreground por `isLight()`                            | Foreground por contraste medido; error si no hay      |
| Dark, hover y active por mezclas con `colord`         | Colores dark explícitos; estados iguales al relleno   |
| Genera variables shadcn, charts y aliases `--brand-*` | Solo tokens semánticos de acción                      |
| Inyecta `<style>` en el DOM                           | Puro; la aplicación al DOM queda fuera de alcance     |

**Regresión documentada:** `#915BD8`, el fallback de primario en sunboarding, no alcanza 4.5:1 ni con blanco (4.47) ni con `neutral.950` (4.49). El legacy lo combinaba con blanco.

## Verificación

- `packages/theme-runtime/src/__tests__/white-label.test.ts` (37 tests):
  - mapeo primario, secundario y dark;
  - normalización y determinismo;
  - 17 inputs inválidos, ninguno de los cuales produce un tema;
  - campos legacy y agregación de diagnósticos;
  - colores frontera: `#767676` toma blanco, `#787878` toma casi negro y `#777777` da error;
  - regresión de `#915BD8`;
  - barrido de los 4096 colores `#rgb`: todo tema aceptado cumple 4.5:1 en texto;
  - paridad con `contrastRatio` del tooling;
  - advertencias no-texto;
  - SSR: `dist` sin `document`, `window` ni storage, y ejecución en un proceso Node sin DOM.
- Pruebas de mutación: redondear en vez de truncar hace fallar dos tests, y añadir `document` al runtime rompe el build.

## Pendiente

- Diseño debe validar los valores neutrales de la acción secundaria y decidir si Solé la tematiza. La variante Blue del botón (`blue.400`) no alcanza 3:1 frente al canvas en light.
- La serialización CSS con soporte CSP y la aplicación a `HTMLElement` (Milestone 2) quedan fuera de esta tarea.
