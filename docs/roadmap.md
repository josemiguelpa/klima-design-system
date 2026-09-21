# Roadmap

## Milestone 0 — Fundaciones del repositorio

- Bootstrap del workspace.
- Configuración compartida.
- CI, Changesets y validación de publicación.
- Auditoría de referencias legacy y definición de la frontera de migración.

Salida: monorepo vacío pero confiable y publicable.

## Milestone 1 — Tokens y tema Solé

- Esquema DTCG.
- Primitivas globales y de Solé.
- Semánticos light/dark.
- Build CSS/TypeScript.
- Adapter shadcn.
- Guía de migración y límites del clean break.

Salida: una aplicación fixture puede adoptar el nuevo tema sin componentes y conoce los cambios explícitos requeridos desde el contrato legacy.

## Milestone 2 — Runtime white-label

- Validación de entradas.
- Contraste WCAG.
- Aplicación a `HTMLElement`.
- Serialización CSS opcional con soporte CSP.
- Tests SSR/browser.

Salida: tenant theme seguro y desacoplado de shadcn.

## Milestone 3 — Iconos React

- Auditoría legal y visual del catálogo.
- Normalizador con AST/SVGO.
- Paquete React con exports individuales.
- Tests de accesibilidad, atributos y tree-shaking.

Salida: una implementación React nueva, con una guía de migración explícita; no es un reemplazo directo del paquete React anterior.

## Milestone 4 — Iconos Vue, Astro y Vanilla

- Generadores por target.
- Paquetes sin peer dependencies cruzadas.
- Fixtures y medición de bundles.

## Milestone 5 — Componentes React

- Storybook y pruebas de interacción.
- Button e IconButton como primer vertical slice.
- Inputs y feedback.
- Componentes de navegación y overlays cuando exista demanda real.

## Milestone 6 — Publicación y adopción

- Licencia y provenance completos.
- Documentación pública.
- Release candidato.
- Migración de una aplicación piloto.
- Ajustes y release estable.

## Criterio para avanzar

Un milestone no se considera completo solo porque compila. Debe existir al menos una fixture consumidora que valide sus exports, estilos y bundle.
