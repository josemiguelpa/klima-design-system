# Arquitectura objetivo

## Repositorio

Nuevo monorepo público `klima-design-system`, sujeto a confirmación del nombre.

```text
apps/
  storybook/

packages/
  tokens/
  themes/
  theme-runtime/
  shadcn/
  icons-core/
  icons-react/
  icons-vue/
  icons-astro/
  react/
  # No se crea un paquete de compatibilidad legacy.

tooling/
  eslint-config/
  typescript-config/

fixtures/
  react-vite/
  vue-vite/
  astro/
```

`icons-core` puede permanecer privado dentro del workspace si solo contiene herramientas y SVG fuente.

## Dependencias permitidas

```text
tokens <- themes <- shadcn
tokens <- theme-runtime
tokens + themes + icons-react <- react
icons-core -> icons-react | icons-vue | icons-astro
new packages do not depend on legacy packages
```

No debe existir dependencia desde tokens hacia frameworks o componentes.

## Responsabilidades

| Paquete                           | Responsabilidad                                      |
| --------------------------------- | ---------------------------------------------------- |
| `@klima-ds/tokens`                | Contrato DTCG, CSS base y valores TypeScript         |
| `@klima-ds/themes`                | Implementaciones Solé y futuras marcas, light/dark   |
| `@klima-ds/theme-runtime`         | Validar y aplicar white-label en runtime             |
| `@klima-ds/shadcn`                | Traducir tokens Klima a variables shadcn             |
| `@klima-ds/icons-react`           | Componentes de icono React puros y tree-shakeables   |
| `@klima-ds/icons-vue`             | Componentes Vue sin dependencia de React             |
| `@klima-ds/icons-astro`           | Componentes Astro sin dependencia de React/Vue       |
| `@klima-ds/react`                 | Componentes React estilizados con tokens semánticos  |
| Guía de migración (documentación) | Límites, pasos y equivalencias revisadas manualmente |

## API de temas

La aplicación define una marca y un esquema:

```html
<html data-brand="sole" data-theme="light"></html>
```

Configuración de tailwind:

```css
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
```

La coexistencia de contratos legacy y Klima no está soportada por los paquetes nuevos. Una aplicación que necesite migrar por etapas debe aislar y coordinar explícitamente sus hojas de estilo; Klima no importará CSS legacy ni ofrecerá aliases globales.

Los colores puntuales de otras marcas se exponen como primitivas explícitas; no cambian el tema activo.

## Componentes

- API principal mediante props semánticas: `variant`, `size`, `tone`, `disabled`.
- `className` es un escape hatch, no el mecanismo principal de diseño.
- Los estilos publicados deben funcionar sin escanear `node_modules` con Tailwind.
- Para interacción compleja se pueden evaluar primitivas headless accesibles.
- El componente no conoce stores, routers ni servicios de una aplicación.
- Compound components se usan cuando expresan una composición real, no como regla universal.

## Iconos

- Un SVG canónico por icono.
- Normalización estructural con parser XML/AST y SVGO configurado, no regex como mecanismo principal.
- `currentColor` para fills y paths.
- Export individual por archivo y barrel conveniente.
- ESM, `sideEffects: false` y fixtures que inspeccionan el bundle final.
- Los nombres corregidos son parte del contrato nuevo; la migración desde nombres antiguos se documenta, pero no se publican aliases.

## Storybook

Storybook será banco de estados, accesibilidad, documentación y regresión visual. No es la fuente de tokens ni reemplaza las pruebas de consumo real.
