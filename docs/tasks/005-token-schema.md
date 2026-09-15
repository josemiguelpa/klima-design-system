# TASK-005: Definir esquema DTCG de tokens

## Objetivo

Crear el paquete `@klima-ds/tokens` con esquema y validación, todavía sin cargar la paleta completa.

## Lecturas requeridas

- `docs/token-model.md`
- `docs/decisions/002-source-of-truth.md`

## Dependencias

- TASK-002.

## Alcance

- Definir estructura DTCG admitida.
- Validar tipos, aliases inexistentes, ciclos y nombres.
- Añadir un fixture mínimo válido y fixtures inválidos.
- Documentar cómo se representa `$type`, `$value` y metadata.

## Fuera de alcance

- Generar CSS.
- Importar todos los valores de Figma.

## Criterios de aceptación

- La validación acepta el fixture válido.
- Rechaza alias roto, ciclo, tipo incompatible y nombre inválido.
- Los errores indican ruta exacta del token.
