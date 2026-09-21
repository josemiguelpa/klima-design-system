# Política de clean break y migración

## Decisión vigente

`@klima-ds` es un contrato nuevo. Los paquetes Klima no ofrecen compatibilidad hacia atrás con `@solenium-software`, aunque reutilicen conocimiento o activos auditados de esos repositorios.

Esto implica:

- no publicar aliases legacy de CSS, TypeScript ni iconos;
- no crear un paquete `@klima-ds/compatibility-solenium`;
- no importar CSS legacy desde ningún entrypoint Klima;
- no conservar exports, nombres o estructuras anteriores solo por compatibilidad;
- no asumir que cargar simultáneamente CSS legacy y Klima sea un escenario soportado.

## Qué sí ofrecemos

La compatibilidad se sustituye por una frontera de migración documentada en [`docs/migration-from-solenium.md`](./migration-from-solenium.md). Cada migración debe:

1. identificar los imports, variables, iconos y componentes usados por la aplicación;
2. elegir el contrato Klima equivalente cuando exista una equivalencia revisada;
3. adaptar manualmente los casos sin equivalencia directa;
4. validar estilos, accesibilidad y comportamiento en la aplicación consumidora.

Las equivalencias documentadas son orientación de migración, no una promesa de API compatible.

## Repositorios anteriores

- `solenium-design-system` y `solenium-components` permanecen como referencias históricas y fuentes de auditoría.
- No reciben nuevas funcionalidades por parte de este repositorio.
- Pueden mantenerse durante la transición de aplicaciones, pero no son dependencias de los paquetes Klima.
- Los hechos históricos deben distinguirse de la política vigente: que un nombre o variable haya existido no implica que Klima deba conservarlo.

## CSS y tokens

Los tokens Klima usan el prefijo `--klima-` y una semántica propia. No se generan aliases como `--brand-primary: var(--klima-...)`. Los nombres ambiguos, visuales o mal formados deben corregirse en el punto de migración.

La coexistencia temporal de CSS legacy y Klima queda bajo responsabilidad de la aplicación. Debe evitarse la colisión de variables y no puede asumirse que ambos contratos tengan la misma semántica.

## TypeScript e iconos

- Los imports deben cambiarse a los exports Klima definidos para cada paquete.
- Las formas antiguas, incluidas variantes `snake_case`, no se mantienen mediante adapters publicados.
- Los nombres de iconos corregidos forman parte del catálogo nuevo. Los nombres antiguos se registran como notas de migración, no como aliases deprecated.
- La procedencia y licencia de los SVG se verifica antes de su publicación; esa revisión es independiente de la migración de nombres.

## Componentes

El paquete UI experimental no se considera una API legacy adoptada. Sus ideas pueden reutilizarse, pero no se requiere conservar su `Header`, su estructura ni sus props.

## Versionado y documentación

Los paquetes pueden comenzar en `0.x` mientras se validan con aplicaciones reales, pero cada cambio de contrato debe documentarse. Changesets registra releases; no convierte los paquetes Klima en compatibles con los paquetes anteriores.

[`docs/migration-from-solenium.md`](./migration-from-solenium.md) debe registrar solo equivalencias respaldadas por evidencia. Cuando no exista equivalencia, debe indicarse la adaptación manual requerida o que el caso queda fuera de alcance.
