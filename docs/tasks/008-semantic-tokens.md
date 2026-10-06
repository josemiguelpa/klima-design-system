# TASK-008: Definir tokens semánticos base

## Objetivo

Crear el contrato neutral que usarán temas y componentes.

## Dependencias

- TASK-006.
- TASK-007.
- Confirmación tipográfica cuando afecte el contrato.

## Alcance

- Background, surface, text, border, action y feedback.
- Valores light/dark mediante aliases a primitivas.
- Documentar intención de cada token.
- Validar pares foreground/background WCAG relevantes.

## Fuera de alcance

- Tokens de Button o integración shadcn.

## Criterios de aceptación

- Ningún semántico contiene un color literal si puede usar alias.
- Los nombres no incluyen Solé ni nombres visuales de color.
- Los pares requeridos cumplen el nivel de contraste acordado o quedan bloqueados con evidencia.

## Decisiones del propietario

- Modos mediante archivos por modo: `src/tokens/semantic/<modo>/color.json`. El manifiesto declara `modes` y cada fuente modal declara `mode`. Resuelve el aspecto aplazado de TASK-005 sobre la proyección física de modos.
- Contrato neutral: `action` y `border.focus` apuntan a `color.neutral.*`, según `grey/interactive/*` de Figma. Los valores de Solé corresponden a TASK-010.
- Nivel de contraste: WCAG 2.2 AA. Texto 4.5:1; no-texto (foco y relleno de acción frente al canvas) 3:1. Los estados deshabilitados y los bordes decorativos están exentos.
- Feedback en cuatro tonos con `text`, `background` y `border`: `success` → `mint`, `info` → `royal-blue`, `warning` → `yellow` y `critical` → `red`.

## Implementación

Fuente: colección `semanticas` (modos Light y Dark) del archivo `Sistema de diseño KLIMA` (`pEieSZyQwDGKiAbeADq3ah`), leída con un script de solo lectura el 2026-10-06. La colección del archivo de Solé (`zeWPEzMPcSIT91DT5awWiB`) contiene los mismos alias.

### Modos en el manifiesto

- `manifest.json` declara `"modes": ["light", "dark"]`. Las fuentes sin `mode` se comparten entre modos.
- `assembleTokens(manifest, root, { mode })` ensambla las fuentes compartidas y las del modo indicado. Sin `mode`, usa el primer modo declarado (`light`) y un modo no declarado lanza un error de uso.
- `validateManifest` valida cada modo y emite:
  - `manifest.modes-invalid`: lista de modos vacía, duplicada o con nombres inválidos.
  - `manifest.mode-unknown`: la fuente declara un modo que el manifiesto no declara.
  - `manifest.mode-layer-invalid`: solo las capas `semantic` y `component` admiten `mode`.
  - `manifest.source-path-invalid`: la fuente modal no está bajo `src/tokens/<capa>/<modo>/`.
  - `manifest.mode-parity` y `manifest.mode-type-mismatch`: los modos no declaran las mismas rutas con los mismos tipos.
- El validador emite `semantic.literal-color` cuando un token semántico `color` declara un literal en lugar de un alias.

### Tokens

| Token                              | Light         | Dark          | Variable Figma              |
| ---------------------------------- | ------------- | ------------- | --------------------------- |
| `color.background.canvas`          | `neutral.0`   | `neutral.925` | `grey/background/page`      |
| `color.background.subtle`          | `neutral.50`  | `neutral.900` | `grey/background/subtle`    |
| `color.background.sunken`          | `neutral.100` | `neutral.950` | `grey/background/sunken`    |
| `color.background.inverse`         | `neutral.900` | `neutral.50`  | `grey/background/inverse`   |
| `color.surface.default`            | `neutral.0`   | `neutral.925` | `grey/surface/base`         |
| `color.surface.raised`             | `neutral.0`   | `neutral.800` | `grey/surface/raised`       |
| `color.surface.inset`              | `neutral.100` | `neutral.950` | `grey/surface/inset`        |
| `color.text.primary`               | `neutral.900` | `neutral.50`  | `grey/text/heading`         |
| `color.text.body`                  | `neutral.700` | `neutral.200` | `grey/text/body`            |
| `color.text.secondary`             | `neutral.500` | `neutral.400` | `grey/text/secondary`       |
| `color.text.disabled`              | `neutral.300` | `neutral.700` | `grey/text/disabled`        |
| `color.text.inverse`               | `neutral.0`   | `neutral.900` | `grey/text/inverse`         |
| `color.border.subtle`              | `neutral.100` | `neutral.800` | `grey/border/subtle`        |
| `color.border.default`             | `neutral.200` | `neutral.700` | `grey/border/default`       |
| `color.border.focus`               | `neutral.900` | `neutral.50`  | `grey/border/focus`         |
| `color.action.primary.default`     | `neutral.700` | `neutral.300` | `grey/interactive/default`  |
| `color.action.primary.hover`       | `neutral.800` | `neutral.200` | `grey/interactive/hover`    |
| `color.action.primary.active`      | `neutral.900` | `neutral.100` | `grey/interactive/active`   |
| `color.action.primary.foreground`  | `neutral.0`   | `neutral.900` | — (nuevo)                   |
| `color.action.disabled`            | `neutral.200` | `neutral.700` | `grey/interactive/disabled` |
| `color.feedback.<tono>.text`       | `<hue>.700`   | `<hue>.200`   | — (nuevo)                   |
| `color.feedback.<tono>.background` | `<hue>.50`    | `<hue>.950`   | — (nuevo)                   |
| `color.feedback.<tono>.border`     | `<hue>.200`   | `<hue>.800`   | — (nuevo)                   |

Cada token documenta su intención en `$description`. Los 19 tokens derivados de Figma registran su procedencia, que es idéntica en ambos modos.

`color.action.primary` pasó de token a grupo. `button.json`, que pertenece a la capa de componente y queda fuera del alcance, solo actualizó su alias a `color.action.primary.default` para seguir resolviendo.

### Bloqueados con evidencia

No forman parte del contrato hasta que diseño apruebe valores que cumplan el umbral. `src/contrast.ts` registra la evidencia en `BLOCKED_TOKENS` y `BLOCKED_PAIRS`.

| Elemento                                                                      | Intención Figma (light / dark)    | Contraste frente al canvas | Mínimo |
| ----------------------------------------------------------------------------- | --------------------------------- | -------------------------- | ------ |
| Token `color.text.caption`                                                    | `neutral.400` / `neutral.500`     | 2.54 / 3.93                | 4.5    |
| Token `color.text.placeholder`                                                | `neutral.300` / `neutral.600`     | 1.47 / 2.52                | 4.5    |
| Token `color.border.strong` (borde de control)                                | `neutral.400` / `neutral.600`     | 2.54 / 2.52                | 3      |
| Par `text.secondary` sobre `background.sunken` y `surface.inset` (solo light) | `neutral.500` sobre `neutral.100` | 4.39                       | 4.5    |

### No adoptados

- `grey/background/elevated` duplica `grey/surface/raised` (`0` / `800`) y se representa con `color.surface.raised`.
- `grey/background/overlay` es un color sólido que copia `subtle` en light y `sunken` en dark, sin una intención distinguible.
- `grey/surface/header` es específico de un componente.
- `grey/text/subheading` solo difiere de `grey/text/body` en dark (`100` frente a `200`).

## Hallazgos en Figma (sin corregir)

1. **Dark doblemente invertido.** En Dark, `grey/*` invierte la escala (`grey/50` = `#030712`) y los semánticos ya apuntan al paso opuesto. La resolución literal da `text/heading` sobre `background/page` = 1.06:1 en dark. Se interpreta cada alias `grey/N` como la primitiva `color.neutral.N`, lo que da 18.19:1.
2. `grey/background/700` contiene literales (`#374151` / `#D1D5DB`) y se usa como alias de texto, borde e interacción. Se interpreta como `color.neutral.700` en ambos modos, coherente con TASK-016. La lectura literal haría que `text.disabled` en dark (`#D1D5DB`) tuviera más contraste que `text.secondary`.
3. Figma no define semánticos de acción de marca ni de feedback; `status/*` solo agrupa paletas.

## Verificación

- `packages/tokens/src/__tests__/semantic-tokens.test.ts`:
  - el manifiesto completo se valida sin diagnósticos en ambos modos;
  - ambos modos tienen paridad de rutas y procedencia;
  - solo hay aliases a primitivas globales;
  - cada token documenta su intención;
  - las rutas no contienen nombres de marca ni de color visual;
  - el contraste AA de `CONTRAST_PAIRS` se cumple por modo, y los fallos deben coincidir exactamente con `BLOCKED_PAIRS`;
  - los tokens bloqueados no existen y su intención Figma sigue fallando;
  - se prueban los diagnósticos de manifiesto modal y de `semantic.literal-color`.
