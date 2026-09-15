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
- Identificar nombres erróneos y aliases requeridos.
- Bloquear publicación de activos sin procedencia confirmada.

## Fuera de alcance

- Modificar visualmente SVG.
- Publicar el paquete.

## Criterios de aceptación

- Cada icono tiene un estado de provenance.
- Existe una lista explícita de bloqueados.
- La revisión no afirma un origen sin evidencia.
