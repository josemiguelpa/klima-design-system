# TASK-009: Generar artefactos CSS y TypeScript

## Objetivo

Transformar los tokens DTCG en outputs deterministas consumibles.

## Dependencias

- TASK-008.

## Alcance

- Generar CSS custom properties con prefijo `--klima-`.
- Generar valores y tipos TypeScript.
- Definir exports públicos.
- Marcar outputs como generados.
- Añadir test que falle si outputs están desactualizados.

## Fuera de alcance

- Tema Solé completo, aliases legacy y shadcn.

## Criterios de aceptación

- Dos builds consecutivos producen bytes idénticos.
- Todos los export targets existen después del build.
- Una fixture importa CSS y TypeScript desde el paquete empaquetado.
