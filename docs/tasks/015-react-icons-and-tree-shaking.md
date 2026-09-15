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
