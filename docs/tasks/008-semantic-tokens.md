# TASK-008: Definir tokens semánticos base

## Objetivo

Crear el contrato neutral que usarán temas y componentes.

## Dependencias

- TASK-006.
- TASK-007.
- Confirmación tipográfica cuando afecte el contrato.

## Alcance

- Background, surface, text, border, action y feedback.
- Valores light/dark mediante aliases a primitivas.
- Documentar intención de cada token.
- Validar pares foreground/background WCAG relevantes.

## Fuera de alcance

- Tokens de Button o integración shadcn.

## Criterios de aceptación

- Ningún semántico contiene un color literal si puede usar alias.
- Los nombres no incluyen Solé ni nombres visuales de color.
- Los pares requeridos cumplen el nivel de contraste acordado o quedan bloqueados con evidencia.
