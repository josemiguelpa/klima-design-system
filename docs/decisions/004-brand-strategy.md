# ADR-004: Una marca activa por aplicación

## Estado

Aceptado.

## Decisión

Cada aplicación activa una marca principal mediante `data-brand` y un esquema mediante `data-theme`. Los logos y colores puntuales de otras marcas se consumen como activos o primitivas explícitas, sin anidar sistemas de tema completos.

## Motivos

- Corresponde al uso actual.
- Evita una matriz compleja de temas anidados.
- Mantiene abierta la expansión a nuevas marcas.

## Consecuencias

- Los componentes siempre consumen semánticos de la marca activa.
- El uso de un color externo debe ser explícito.
