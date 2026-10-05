# TASK-015: Publicar primer vertical slice de iconos React

## Objetivo

Generar un subconjunto representativo de iconos React con imports individuales y tree-shaking demostrado.

## Dependencias

- TASK-014.

## Alcance

- Crear `@klima-ds/icons-react`.
- Props SVG, `currentColor`, tamaño, title accesible y ref según versión React acordada.
- Barrel export y subpath por icono.
- ESM y `sideEffects: false`.
- Fixture Vite que importe uno y varios iconos.
- Test que inspeccione bundle para confirmar ausencia de iconos no usados.

## Fuera de alcance

- Migrar los 514 iconos de una vez.
- Vue, Astro, Vanilla o componentes UI.

## Criterios de aceptación

- `import { Search } from "@klima-ds/icons-react"` funciona.
- `import Search from "@klima-ds/icons-react/search"` o contrato equivalente funciona.
- El bundle de un solo icono no contiene paths de los iconos de control.
- El paquete no incluye Vue, Astro ni el catálogo SVG fuente.

## Implementación

- Contrato de imports por estilo según [ADR-007](../decisions/007-icon-style-entry-points.md): `@klima-ds/icons-react/<estilo>` y `@klima-ds/icons-react/<estilo>/<icono>` para `linear`, `bold`, `twotone`, `bulk` y `broken` (593, 443, 721, 723 y 685 iconos).
- `scripts/build.mjs` genera `dist/` desde el inventario y los SVG normalizados.
  - Sin fuentes descargadas (CI), genera un set sintético desde los fixtures de `icons-core`.
  - Ese set nunca puede publicarse.
- Cada icono es un módulo ESM con `/* @__PURE__ */ createIcon(...)`, `forwardRef` (React ≥ 18), `size`, `title` accesible (`role="img"` + `aria-labelledby`; sin título, `aria-hidden`) y props del consumidor aplicadas después de los defaults.
- `fixtures/react-vite/test/tree-shaking.test.js` compila con Vite:
  - un import desde el barrel;
  - varios imports;
  - un import por subpath.

  - un mismo icono en uno y dos estilos.

  En cada caso verifica que el bundle no contiene la geometría de iconos ni estilos no importados. También ejecuta `tsc` sobre `test/types.ts`.

- La prueba se validó rompiendo a propósito el tree-shaking (sin `@__PURE__` y con `sideEffects: true`): falla.
