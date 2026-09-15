# TASK-011: Añadir aliases CSS de compatibilidad

## Objetivo

Permitir una migración gradual de variables antiguas inequívocas al tema Solé.

## Lecturas requeridas

- `docs/compatibility.md`

## Dependencias

- TASK-004.
- TASK-010.

## Alcance

- Implementar únicamente mappings equivalentes.
- Documentar aliases deprecated.
- Crear tabla de variables que requieren migración manual.
- Publicar compatibilidad como import separado.

## Fuera de alcance

- Incluir compatibilidad en el CSS raíz por defecto.
- Inventar equivalencias para nombres ambiguos.

## Criterios de aceptación

- La fixture legacy conserva los valores esperados.
- La aplicación nueva no recibe aliases si no importa compatibilidad.
