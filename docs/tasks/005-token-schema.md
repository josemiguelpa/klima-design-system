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
- TASK-005 define la estructura para registrar procedencia de Figma; TASK-006 incorporará
  identificadores reales. Git continúa siendo la fuente de verdad.

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

### Gramática de nombres

#### Decisión

Usar rutas separadas por puntos. Cada segmento debe ser una palabra en
minúsculas y `kebab-case` o un número decimal canónico. La gramática define la
forma común de los nombres y se complementa con reglas estructurales para cada
capa, sin añadir prefijos artificiales como `primitive` o `semantic`.

#### Reglas normativas

- Una ruta DEBE contener al menos dos segmentos separados por `.`.
- Un segmento de palabra DEBE cumplir
  `[a-z][a-z0-9]*(?:-[a-z0-9]+)*`.
- Un segmento numérico DEBE cumplir `0|[1-9][0-9]*`; los ceros iniciales no
  están permitidos salvo en `0`.
- Los nombres DEBEN escribirse en minúsculas. Las palabras compuestas DEBEN
  usar `kebab-case`.
- Los nombres NO DEBEN contener espacios, `_`, `/`, `{}`, `}`, `#`, segmentos
  vacíos ni caracteres en mayúscula.
- Ningún segmento PUEDE comenzar con `$`; los nombres reservados por DTCG no
  forman parte de una ruta de token.
- Las primitivas de marca DEBEN seguir `brand.<marca>.<concepto>...`.
- Los tokens de componente DEBEN comenzar por el nombre del componente y
  continuar con su variante, parte, propiedad o estado según corresponda.
- Las primitivas globales y los tokens semánticos DEBEN comenzar por su dominio,
  por ejemplo `color`, `space`, `radius` o `font`.
- La capa exacta de una primitiva global o un token semántico NO DEBE inferirse
  únicamente desde su nombre; la organización lógica del documento determina
  esa clasificación.

#### Ejemplo mínimo

```text
color.neutral.0
space.4
brand.sole.green.600
color.background.canvas
button.primary.background.hover
```

Los siguientes nombres son inválidos:

```text
color.Neutral.950
font.fontSize.200
space.04
button_primary.background
color..text
```

#### Justificación

Esta gramática conserva los nombres ya definidos en el modelo de tokens, genera
rutas legibles y deterministas, y admite escalas numéricas sin relajar el resto
del identificador. Las reglas por capa comunican intención sin convertir la API
en una jerarquía redundante ni asumir que el nombre basta para distinguir una
primitiva de un token semántico.

#### Aspectos aplazados

- La lista cerrada de dominios admitidos se definirá cuando exista el inventario
  real de tokens.
- La clasificación mecánica de cada ruta por capa se concretará junto con la
  organización lógica y física de archivos.
- Las convenciones para conceptos todavía no modelados se añadirán cuando haya
  casos de uso reales, sin cambiar la gramática léxica.

### API del validador y formato de diagnósticos

#### Decisión

El validador se expondrá como una función pura que recibe un documento
desconocido y devuelve el resultado completo de la validación, sin mutar ni
aplanar el documento fuente.

#### Reglas normativas

- La API DEBE devolver todos los diagnósticos detectables en una ejecución.
- El resultado DEBE indicar si el documento es válido mediante `valid`.
- `valid` DEBE ser `false` cuando exista al menos un diagnóstico con severidad
  `error`.
- Cada diagnóstico DEBE incluir `severity`, `code`, `path` y `message`.
- `severity` DEBE ser `error` o `warning`.
- `code` DEBE ser estable y apto para automatización; los consumidores NO
  DEBEN depender del texto de `message` para clasificar errores.
- `path` DEBE identificar la ruta lógica completa del token afectado.
- `property` PUEDE identificar la propiedad concreta afectada, como `$type`,
  `$value` o `$ref`.
- Los incumplimientos del contrato de tokens DEBEN producir diagnósticos de
  error. Esto incluye nombres inválidos, tipos no admitidos, aliases rotos,
  ciclos, incompatibilidades de tipo y dependencias inversas entre capas.
- La resolución de referencias PUEDE utilizarse internamente para validar,
  pero NO DEBE modificar ni reemplazar las referencias del documento fuente.
- Las excepciones quedan reservadas para errores de uso de la API o fallos
  internos inesperados; un documento inválido NO DEBE interrumpir la API con
  una excepción como mecanismo normal de reporte.

#### Firma conceptual mínima

```ts
type DiagnosticSeverity = "error" | "warning";

interface Diagnostic {
  severity: DiagnosticSeverity;
  code: string;
  path: string;
  property?: string;
  message: string;
}

interface ValidationResult {
  valid: boolean;
  diagnostics: Diagnostic[];
}

function validateTokenDocument(document: unknown): ValidationResult;
```

#### Ejemplos mínimos de diagnósticos

Alias inexistente:

```json
{
  "severity": "error",
  "code": "alias.target-not-found",
  "path": "color.text.primary",
  "property": "$value",
  "message": "Alias target does not exist: {color.neutral.950}"
}
```

Nombre inválido:

```json
{
  "severity": "error",
  "code": "token.invalid-name",
  "path": "color.Neutral.950",
  "message": "Token path segments must use lowercase kebab-case or canonical numeric segments"
}
```

#### Justificación

El resultado agregado permite corregir varios problemas en una sola ejecución
y sirve tanto para CI como para tests y futuras integraciones con editores.
Separar códigos estables de mensajes legibles evita acoplar automatizaciones al
texto. La ruta lógica completa mantiene el criterio de aceptación existente y
es independiente de la organización física de archivos.

#### Aspectos aplazados

- La lista completa y definitiva de códigos de diagnóstico.
- Posiciones de línea y columna dentro de archivos fuente.
- Diagnósticos enriquecidos con rutas de archivo después del ensamblado.
- Opciones de severidad, filtros o modos de validación configurables.
- Un formato de serialización distinto de la interfaz TypeScript conceptual.

### Metadata de procedencia de Figma

#### Decisión

Registrar la procedencia de cada token mediante una extensión namespaced y
autocontenida. La identidad canónica de la fuente usa las claves estables del
archivo, la colección y la variable de Figma; Git continúa siendo la fuente
técnica reproducible.

#### Reglas normativas

- La metadata de procedencia DEBE ubicarse en
  `$extensions["software.solenium.figma"]`.
- Todo token derivado de una variable de Figma DEBE registrar `fileKey`,
  `collectionKey` y `variableKey` desde TASK-006.
- Los tres campos DEBEN ser strings no vacíos.
- La metadata PUEDE omitirse en tokens que no procedan de una variable de
  Figma.
- Los nombres visibles de archivos, colecciones, modos o variables NO DEBEN
  usarse como identidad canónica.
- `variableId`, `collectionId`, `modeId`, `subscribedId`, URLs y nombres
  visibles NO forman parte del contrato mínimo.
- La metadata DEBE preservarse sin modificar `$type`, `$value`, `$ref` ni la
  resolución de aliases.
- La disponibilidad de Figma NO DEBE ser necesaria para validar, compilar o
  consumir el documento DTCG.
- Una referencia de procedencia ausente o desactualizada en Figma DEBE tratarse
  como un problema de sincronización, no como un valor DTCG inválido.
- TASK-005 define la estructura de la metadata; TASK-006 incorporará los
  identificadores reales.

#### Interfaz conceptual mínima

```ts
interface FigmaProvenance {
  fileKey: string;
  collectionKey: string;
  variableKey: string;
}
```

#### Ejemplo mínimo

```json
{
  "color": {
    "text": {
      "primary": {
        "$type": "color",
        "$value": "{color.neutral.950}",
        "$extensions": {
          "software.solenium.figma": {
            "fileKey": "abc123",
            "collectionKey": "VariableCollectionKey",
            "variableKey": "VariableKey"
          }
        }
      }
    }
  }
}
```

#### Justificación

Las claves permiten vincular un token con su variable de origen sin depender
de nombres editables. Mantener la procedencia en cada token simplifica la
validación y la comparación entre Figma y Git, a cambio de repetir el archivo y
la colección. La extensión sigue siendo metadata auxiliar: permite detectar
diferencias y fuentes eliminadas o recreadas, pero no convierte a Figma en una
dependencia del build ni en la fuente técnica de releases.

#### Aspectos aplazados

- La carga de identificadores reales se realizará en TASK-006.
- La representación de modos, ramas y colecciones extendidas se definirá cuando
  exista un caso de sincronización concreto.
- La procedencia basada en nodos queda fuera del contrato mínimo de variables.
- La normalización de metadata compartida a nivel de documento se reconsiderará
  solo si la repetición demuestra ser un problema real.

### Organización física de archivos

#### Decisión

Organizar los archivos fuente primero por capa lógica y después por dominio,
marca o componente. Un manifiesto explícito declara los archivos participantes
y su capa; el ensamblado produce un único documento lógico antes de validar o
resolver referencias.

#### Reglas normativas

- Los archivos fuente DTCG DEBEN vivir bajo `src/tokens/`.
- Las primitivas globales DEBEN organizarse en `src/tokens/global/` y dividirse
  por dominio cuando exista más de uno.
- Las primitivas de marca DEBEN organizarse en
  `src/tokens/brands/<marca>/` y dividirse por dominio.
- Los tokens semánticos DEBEN organizarse en `src/tokens/semantic/` y dividirse
  por dominio.
- Los tokens de componente DEBEN organizarse en
  `src/tokens/components/` y dividirse por componente.
- Cada archivo DEBE declarar rutas lógicas completas. Los nombres de carpetas y
  archivos NO DEBEN añadir segmentos implícitos a una ruta.
- Un manifiesto explícito DEBE enumerar cada archivo fuente y declarar su capa.
- El ensamblado NO DEBE depender de recorridos implícitos del sistema de
  archivos ni del orden alfabético de los nombres.
- Todos los archivos DEBEN ensamblarse mediante una combinación profunda antes
  de resolver aliases y ejecutar las validaciones globales.
- Dos archivos NO DEBEN declarar la misma ruta lógica; toda colisión DEBE
  rechazarse como error.
- Los aliases y `$ref` DEBEN continuar apuntando a rutas del documento lógico,
  nunca a rutas de archivos.
- El validador, los tipos y los puntos de entrada del paquete DEBEN permanecer
  fuera de `src/tokens/`.
- Los artefactos generados NO DEBEN almacenarse junto a los archivos fuente
  DTCG ni editarse manualmente.

#### Estructura conceptual mínima

```text
packages/tokens/
├── src/
│   ├── tokens/
│   │   ├── global/
│   │   │   └── color.json
│   │   ├── brands/
│   │   │   └── sole/
│   │   │       └── color.json
│   │   ├── semantic/
│   │   │   └── color.json
│   │   └── components/
│   │       └── button.json
│   ├── manifest.ts
│   ├── validator.ts
│   ├── types.ts
│   └── index.ts
└── package.json
```

#### Ejemplo mínimo

`src/tokens/global/color.json` declara la ruta completa:

```json
{
  "color": {
    "neutral": {
      "950": {
        "$type": "color",
        "$value": {
          "colorSpace": "srgb",
          "components": [0.1, 0.1, 0.1],
          "alpha": 1
        }
      }
    }
  }
}
```

Un token ubicado en `src/tokens/semantic/color.json` lo referencia por su ruta
lógica, sin conocer el archivo que lo contiene:

```json
{
  "color": {
    "text": {
      "primary": {
        "$type": "color",
        "$value": "{color.neutral.950}"
      }
    }
  }
}
```

#### Justificación

La separación refleja las capas aprobadas y mantiene localizados los cambios
por dominio, marca o componente. El manifiesto hace explícito qué fuentes forman
el paquete y evita que el resultado dependa accidentalmente del contenido o del
orden de un directorio. Ensamblar antes de validar conserva un único espacio de
nombres, permite detectar colisiones y mantiene los aliases desacoplados de la
distribución física.

Esta estructura introduce más archivos y exige mantener el manifiesto, pero
reduce conflictos de edición y permite revisar cada cambio dentro de su frontera
arquitectónica.

#### Aspectos aplazados

- Los dominios y componentes concretos se crearán únicamente cuando existan
  tokens reales para ellos.
- La forma ejecutable del manifiesto y del ensamblador se definirá durante la
  implementación.
- La ubicación y el formato final de los artefactos generados se definirán en
  la tarea de build correspondiente.
- La proyección física de modos de marca o tema se definirá cuando se modele el
  primer caso real, sin cambiar la separación principal por capas.

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
