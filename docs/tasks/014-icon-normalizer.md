# TASK-014: Construir normalizador seguro de SVG

## Objetivo

Reemplazar el generador basado en regex por una transformación estructural testeada.

## Dependencias

- TASK-013 con al menos un subconjunto publicable.

## Alcance

- Parser XML/AST y configuración SVGO conservadora.
- Preservar `viewBox`.
- Eliminar dimensiones fijas cuando corresponda.
- Convertir color personalizable a `currentColor`.
- Preservar logos y assets multicolor mediante metadata.
- Normalizar stroke width sin romper iconos fill.
- Tests snapshot para casos representativos.

## Fuera de alcance

- Generar componentes React/Vue/Astro.

## Criterios de aceptación

- Idempotencia: normalizar dos veces produce el mismo resultado.
- Los snapshots incluyen stroke, fill, clip paths y logo multicolor.
- Un SVG inválido falla con nombre de archivo y causa.
