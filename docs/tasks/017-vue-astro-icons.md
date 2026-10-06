# TASK-017: Publicar iconos para Vue y Astro

## Objetivo

Ofrecer el catálogo de iconos de TASK-015 como componentes Vue y Astro, instalables sin React ni el otro framework, con tree-shaking verificado.

## Contexto

Vue y Astro reciben inicialmente tokens e iconos (`docs/project-context.md`). Ambos paquetes siguen el contrato de puntos de entrada por estilo de [ADR-007](../decisions/007-icon-style-entry-points.md) y generan desde el mismo inventario y los mismos SVG normalizados que `@klima-ds/icons-react`.

## Lecturas requeridas

- `docs/architecture.md`
- `docs/decisions/003-package-boundaries.md`
- `docs/decisions/007-icon-style-entry-points.md`
- `docs/tasks/015-react-icons-and-tree-shaking.md`

## Dependencias

- TASK-014 y TASK-015.

## Alcance

- `@klima-ds/icons-core`:
  - `src/build.ts` centraliza la lectura del inventario, la normalización, el set sintético y el bloqueo de publicación para los tres frameworks;
  - `renderVue` y `renderAstro` generan cada paquete.
- `@klima-ds/icons-vue` (peer `vue ^3.5.0`):
  - componentes `defineComponent` + `h`, sin compilación de SFC;
  - props `size` y `title`; el resto de atributos (`class`, `stroke-width`, `aria-*`) pasa al `<svg>`;
  - `title` usa `useId` (Vue 3.5) para `aria-labelledby`.
- `@klima-ds/icons-astro` (peer `astro ^7.0.0`):
  - un `.astro` por icono, compilado por el proyecto consumidor;
  - un `Svg.astro` compartido que combina defaults, tamaño, accesibilidad y atributos del consumidor en un solo objeto, para que el consumidor siempre tenga prioridad;
  - el título se escapa automáticamente.
- Contrato de imports idéntico en los tres frameworks:

  ```ts
  import { SearchNormal } from "@klima-ds/icons-vue/linear";
  import SearchNormal from "@klima-ds/icons-vue/linear/search-normal";
  ```

  ```astro
  ---
  import { SearchNormal } from "@klima-ds/icons-astro/linear";
  import SearchNormalBold from "@klima-ds/icons-astro/bold/search-normal";
  ---
  <SearchNormal title="Buscar" size={20} class="icon" />
  ```

## Fuera de alcance

- Vanilla/Web Components (pendiente de decisión del propietario).
- Publicación: bloqueada por la procedencia de TASK-013.

## Criterios de aceptación

- Cada paquete declara solo su framework como peer dependency y no importa los otros.
- `fixtures/vue-vite` prueba tree-shaking por barrel, subpath y entre estilos, y los tipos con `tsc`.
- `fixtures/astro` compila un sitio estático con `astro build`. Verifica:
  - que el HTML contiene solo los iconos importados;
  - que aplica accesibilidad y atributos del consumidor;
  - que no emite JavaScript de cliente.
- Las pruebas pasan con fuentes reales y con el set sintético de CI.
- `prepublishOnly` rechaza publicar sin procedencia confirmada.

## Verificación

```bash
pnpm --filter "@klima-ds/icons-vue..." --filter "@klima-ds/icons-astro..." build
pnpm --filter vue-vite-fixture --filter astro-fixture test
```

## Decisiones de cadena de suministro

- `astro` se fija en `7.3.5`. La versión `7.3.6` se publicó el mismo día de la implementación y la política `minimumReleaseAge` de pnpm la rechaza; no se añadieron excepciones a esa política.
- `pnpm-workspace.yaml` declara `allowBuilds: { esbuild: false }`: el script de instalación de `esbuild` (dependencia de Astro y Vite) no se ejecuta. Las pruebas de Astro y Vite pasan sin él. Habilitarlo requiere revisión explícita.
