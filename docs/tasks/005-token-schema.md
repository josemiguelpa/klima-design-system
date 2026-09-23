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

- Un objeto con exactamente una propiedad `$value` o `$ref` es un token; un
  objeto sin ninguna de ellas es un grupo.
- Todo token declara `$type` explícitamente, incluidos los aliases.
- `$value` y `$ref` son mutuamente excluyentes. `$ref` es la única excepción a
  la regla general que exige `$value` en cada token.
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

### Aliases y referencias

- Usar `$value: "{ruta.del.token}"` como sintaxis canónica para aliases entre
  tokens completos.
- Admitir `$ref` como excepción controlada para compatibilidad con DTCG
  `2025.10`. Solo puede apuntar al `$value` de un token o a uno de sus
  descendientes.
- Permitir referencias únicamente en el nivel superior del token. Un token es
  literal o es una referencia; no se admiten referencias incrustadas dentro de
  valores compuestos parcialmente literales.
- Ensamblar primero todos los archivos en un único documento lógico y resolver
  después las referencias. No se admiten rutas de archivo, URLs ni recursos
  externos.
- Permitir cadenas de aliases sin imponer una profundidad máxima arbitraria.
- Exigir que el valor finalmente resuelto sea compatible con el `$type`
  explícito del token que contiene la referencia.
- Rechazar como error una sintaxis inválida, un destino inexistente, un ciclo,
  una incompatibilidad de tipo o una dependencia inversa entre capas.
- Una referencia puede apuntar a la misma capa o a una capa más fundacional,
  nunca a una más específica. Por ejemplo, un token semántico puede depender de
  una primitiva y un token de componente puede depender de un semántico, pero
  una primitiva no puede depender de un token semántico o de componente.
- Resolver únicamente el valor. `$description`, `$deprecated`, `$extensions` y
  cualquier otra metadata pertenecen al token que las declara y no se heredan.
- Preservar la referencia en los archivos fuente. La resolución no reemplaza el
  alias por el valor materializado.

```json
{
  "space": {
    "4": {
      "$type": "dimension",
      "$value": { "value": 16, "unit": "px" }
    }
  },
  "control": {
    "height": {
      "$type": "dimension",
      "$value": "{space.4}"
    }
  },
  "button": {
    "height": {
      "$type": "dimension",
      "$ref": "#/control/height/$value"
    }
  }
}
```

Esta política mantiene legibles los tokens versionados en Git, evita acoplar
los aliases a la organización física de archivos y conserva compatibilidad con
JSON Pointer sin introducir resolución recursiva dentro de valores compuestos.

Las referencias incrustadas dentro de `shadow` u otros valores compuestos quedan
aplazadas hasta que exista un caso de uso real.

## Decisiones pendientes

- Gramática de nombres.
- API del validador y formato de diagnósticos.
- Metadata concreta de procedencia de Figma.
- Organización física de archivos.

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
