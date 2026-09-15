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
  compatibility-solenium/

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
new packages -> compatibility-solenium
```

No debe existir dependencia desde tokens hacia frameworks o componentes.

## Responsabilidades

| Paquete                            | Responsabilidad                                     |
| ---------------------------------- | --------------------------------------------------- |
| `@klima-ds/tokens`                 | Contrato DTCG, CSS base y valores TypeScript        |
| `@klima-ds/themes`                 | Implementaciones Solé y futuras marcas, light/dark  |
| `@klima-ds/theme-runtime`          | Validar y aplicar white-label en runtime            |
| `@klima-ds/shadcn`                 | Traducir tokens Klima a variables shadcn            |
| `@klima-ds/icons-react`            | Componentes de icono React puros y tree-shakeables  |
| `@klima-ds/icons-vue`              | Componentes Vue sin dependencia de React            |
| `@klima-ds/icons-astro`            | Componentes Astro sin dependencia de React/Vue      |
| `@klima-ds/react`                  | Componentes React estilizados con tokens semánticos |
| `@klima-ds/compatibility-solenium` | Aliases y ayudas de migración temporal              |

## API de temas

La aplicación define una marca y un esquema:

```html
<html data-brand="sole" data-theme="light"></html>
```

Configuración de tailwind:

```css
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
```

Durante la migración pueden haber proyectos que deban soportar ambos:

```css
[data-theme="dark"],
.dark {
  /* variables oscuras */
}
```

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
- Alias de nombres antiguos para errores ortográficos, marcados deprecated.

## Storybook

Storybook será banco de estados, accesibilidad, documentación y regresión visual. No es la fuente de tokens ni reemplaza las pruebas de consumo real.
