# TASK-005: Definir esquema DTCG de tokens

## Objetivo

Crear el paquete `@klima-ds/tokens` con esquema y validación, todavía sin cargar la paleta completa.

## Lecturas requeridas

- `docs/token-model.md`
- `docs/decisions/002-source-of-truth.md`

## Dependencias

- TASK-002.

## Decisiones aprobadas

Estas decisiones forman el contrato provisional de la tarea. Se consolidarán con
el modelo general de tokens cuando se cierren todos los puntos pendientes.

### Versión y tipos admitidos

- Adoptar DTCG `2025.10` como versión del formato.
- Admitir inicialmente `color`, `dimension`, `fontFamily`, `fontWeight`, `number`
  y `shadow`.
- Representar las opacidades por capas como tokens `number` con valores enteros
  entre `0` y `100`. Esta restricción solo aplica al dominio de opacidad; otros
  tokens `number` pueden usar cualquier valor permitido por DTCG.
- Dejar fuera por ahora `duration`, `cubicBezier`, `transition`, `strokeStyle`,
  `border`, `gradient` y `typography`. Podrán añadirse de forma compatible cuando
  exista un caso de uso concreto.
- La futura generación CSS será responsable de convertir una opacidad como `40`
  a la representación requerida por la plataforma, por ejemplo `0.4`.

```json
{
  "opacity": {
    "disabled": {
      "$type": "number",
      "$value": 40
    }
  }
}
```

### Perfil estricto del documento

- Un objeto con `$value` es un token; un objeto sin `$value` es un grupo.
- Todo token declara `$type` explícitamente, incluidos los aliases.
- Los grupos no declaran `$type`; no se admite herencia de tipo desde grupos.
- Rechazar propiedades desconocidas que comiencen por `$`.
- Admitir `$description`, `$deprecated` y `$extensions` donde DTCG los permita.
- `$extensions` es opcional, debe ser un objeto con claves namespaced y debe
  preservarse aunque una herramienta no comprenda su contenido.
- Ningún consumidor debe necesitar `$extensions` para interpretar correctamente
  el tipo o el valor de un token.
- La estructura concreta para registrar procedencia de Figma se definirá en
  TASK-006 con identificadores reales. Git continúa siendo la fuente de verdad.

```json
{
  "color": {
    "text": {
      "primary": {
        "$type": "color",
        "$value": "{color.neutral.950}",
        "$extensions": {
          "software.solenium.figma": {
            "variableKey": "placeholder"
          }
        }
      }
    }
  }
}
```

## Decisiones pendientes

- Reglas de aliases y referencias.
- Gramática de nombres.
- API del validador y formato de diagnósticos.
- Metadata concreta de procedencia de Figma.
- Organización física y resolución entre archivos.

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
