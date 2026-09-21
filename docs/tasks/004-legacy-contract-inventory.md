# TASK-004: Definir la frontera de migración legacy

## Objetivo

Auditar las referencias relevantes de `@solenium-software` y documentar qué conocimiento puede reutilizarse, qué contratos quedan fuera del nuevo `@klima-ds` y qué trabajo manual requiere una aplicación migrante. Esta tarea no construye infraestructura de compatibilidad.

## Lecturas requeridas

- `docs/current-system-audit.md`
- `docs/compatibility.md`
- `docs/decisions/001-new-repository.md`

## Dependencias

- TASK-002.

## Alcance

- Registrar las versiones y commits auditados de `solenium-design-system` y `solenium-components`.
- Identificar exports, tokens, iconos y componentes históricos relevantes para orientar la migración.
- Separar hechos observados de inferencias y decisiones del contrato Klima.
- Documentar equivalencias conocidas solo cuando estén respaldadas por evidencia.
- Enumerar cambios manuales, casos sin equivalencia y activos bloqueados por procedencia o licencia.
- Producir `docs/migration-from-solenium.md` como guía y tabla de migración revisable.

## Fuera de alcance

- Crear snapshots exhaustivos o una infraestructura permanente de comparación.
- Implementar aliases CSS, TypeScript o de iconos.
- Crear un paquete de compatibilidad o importar CSS legacy.
- Copiar tarballs, caches, repos completos o implementaciones sin revisión.
- Garantizar compatibilidad para consumidores externos no auditados.

## Criterios de aceptación

- Las fuentes auditadas están fijadas por versión y commit.
- La documentación distingue hechos históricos, política clean-break y decisiones pendientes.
- `docs/migration-from-solenium.md` contiene equivalencias respaldadas por evidencia, adaptaciones manuales y casos sin soporte.
- Los nombres corregidos de iconos y la procedencia no confirmada se registran como notas o bloqueos, no como aliases.
- No se modifica ningún contrato de código ni se añade dependencia runtime hacia los repositorios legacy.
