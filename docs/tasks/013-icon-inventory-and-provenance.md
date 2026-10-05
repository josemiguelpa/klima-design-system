# TASK-013: Auditar catálogo y procedencia de iconos

## Objetivo

Determinar qué SVG pueden migrarse y publicarse legalmente antes de copiarlos al paquete público.

## Lecturas requeridas

- `docs/current-system-audit.md`
- `docs/architecture.md`

## Dependencias

- TASK-001.

## Alcance

- Inventariar 514 SVG, hashes, nombres, atributos y categoría propuesta.
- Separar iconos funcionales, personalizados y logos.
- Registrar fuente/licencia conocida o estado `unknown`.
- Identificar nombres erróneos y registrar las notas de migración hacia los nombres corregidos; no crear aliases.
- Bloquear publicación de activos sin procedencia confirmada.
- Separar la decisión de publicación de la decisión de nomenclatura; un nombre corregido no implica compatibilidad con el nombre anterior.

## Fuera de alcance

- Modificar visualmente SVG.
- Publicar el paquete.

## Criterios de aceptación

- Cada icono tiene un estado de provenance.
- Existe una lista explícita de bloqueados.
- La revisión no afirma un origen sin evidencia.

## Implementación

- Fuente: archivo de Figma `Iconos` (`pbtOYKpfVOnSF30SJft7Hq`), no el repositorio anterior. Las páginas por estilo y los frames de logos de terceros están en `packages/icons-core/figma.config.json`.
- `pnpm --filter @klima-ds/icons-core pull [estilo...]` descarga los componentes por la API REST de Figma con un token de solo lectura (`FIGMA_TOKEN` o `~/.config/figma/token`).
  - Los SVG quedan en `packages/icons-core/sources/` (ignorado por git mientras la procedencia no esté confirmada).
  - El inventario revisable queda en `packages/icons-core/inventory/<estilo>.json`.
- El inventario registra por icono: nombre propuesto, componente, nodo y frame de Figma, tamaño, `sha256` del SVG fuente, origen (`iconsax` o `custom`), procedencia y estado.

### Resultado por estilo

| Estilo    | Componentes | `candidate` | `blocked` | `duplicate` | `excluded` |
| --------- | ----------- | ----------- | --------- | ----------- | ---------- |
| `linear`  | 707         | 593         | 93        | 12          | 9          |
| `bold`    | 520         | 443         | 72        | 0           | 5          |
| `twotone` | 996         | 721         | 172       | 0           | 103        |
| `bulk`    | 998         | 723         | 172       | 0           | 103        |
| `broken`  | 850         | 685         | 164       | 0           | 1          |

Motivos:

- **`blocked`**:
  - mismo nombre con SVG distinto (28–74 nombres por estilo); por decisión del propietario no se publican;
  - componentes sin nombre (`Group 80xx`, `Vector`, `Component`).
- **`duplicate`**: mismo nombre y mismo SVG; se publica una sola vez.
- **`excluded`**:
  - logos de marcas de terceros: los frames `two-tone` y `bulk` (101 logos de empresas y criptomonedas cada uno), más `Instagram` y `LinkedIn`;
  - variantes del component set `checkbox` (UI, no iconos);
  - componentes ubicados en la página de otro estilo;
  - componentes que Figma no puede exportar a SVG.

- Nombres corregidos, sin alias: `finger-cricle` → `finger-circle`, `money-recive` → `money-receive`, `play-cricle` → `play-circle`, `presention-chart` → `presentation-chart`, `trush-square` → `trash-square`.
- Los 28 conflictos difieren incluso tras normalizar; probablemente correspondan a variantes numeradas de Iconsax (`brush-1`, `brush-2`…) que perdieron el sufijo. Requieren decisión de diseño.
- Los iconos propios del frame `Personalizados - Solenium` no tienen nombre (`Group 8013`…`Group 8040`) y tienen tamaños distintos de 24×24.
- `vuesax/linear/grid-solarview` y `vuesax/linear/cronograma` usan el prefijo de Iconsax, pero sus nombres no parecen de Iconsax; hay que verificar su origen antes de atribuirlos.

### Bloqueo de publicación

- Todos los iconos tienen procedencia `unconfirmed`.
- `@klima-ds/icons-react` ejecuta `scripts/check-publishable.mjs` en `prepublishOnly` y rechaza publicar mientras haya iconos sin procedencia confirmada o la build sea sintética.
