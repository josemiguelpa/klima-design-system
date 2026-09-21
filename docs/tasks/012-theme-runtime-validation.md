# TASK-012: Crear núcleo validado de white-label

## Objetivo

Generar un tema runtime seguro a partir de colores de marca sin depender de DOM ni shadcn.

## Dependencias

- TASK-008.

## Alcance

- API pura con nombres camelCase.
- No incluye adapter para nombres legacy; las aplicaciones migran a camelCase antes de invocar la API.
- Rechazar colores inválidos.
- Elegir foreground por contraste medido.
- Retornar advertencias o errores estructurados para combinaciones inseguras.
- Tests de frontera y regresión.

## Fuera de alcance

- Inyectar `<style>` en DOM.
- Generar variables shadcn.
- Definir paletas de charts sin especificación de diseño.

## Criterios de aceptación

- Ningún input inválido se convierte silenciosamente en negro.
- Los pares de texto cumplen el umbral acordado.
- El módulo puede ejecutarse en SSR.
