# Modelo de tokens

## Capas

### 1. Primitivas globales

Valores sin intención de interfaz:

```text
color.neutral.0
color.neutral.950
space.4
radius.md
font.size.200
```

### 2. Primitivas de marca

Paletas propias de cada marca:

```text
brand.sole.green.600
brand.sole.blue.500
brand.klima.primary.600
```

### 3. Tokens semánticos

Expresan propósito y cambian por marca/modo:

```text
color.background.canvas
color.background.surface
color.text.primary
color.text.inverse
color.action.primary
color.border.subtle
color.feedback.critical
```

### 4. Tokens de componente

Solo cuando un componente necesita un contrato estable adicional:

```text
button.primary.background.default
button.primary.background.hover
button.primary.foreground
```

Evitar crear tokens de componente que solo renombren un semántico sin aportar independencia.

## Fuente y formato

- El formato versionado recomendado es DTCG JSON.
- Figma representa la intención de diseño y debe mapearse al mismo contrato.
- Los artefactos CSS/TS son generados; no se editan manualmente.
- La sincronización con Figma debe fallar ante aliases rotos, nombres desconocidos o diferencias no aprobadas.

Ejemplo conceptual:

```json
{
  "color": {
    "action": {
      "primary": {
        "$type": "color",
        "$value": "{brand.sole.green.600}"
      }
    }
  }
}
```

## CSS generado

Usar un prefijo neutral para evitar colisiones:

```css
:root {
  --klima-color-text-primary: ...;
}

[data-brand="sole"][data-theme="dark"] {
  --klima-color-text-primary: ...;
}
```

## Reglas

- No usar nombres de color visual como API semántica (`text-gray`, `button-green`).
- No mezclar reset, utilities o selectores globales en el paquete de tokens.
- Los aliases antiguos viven en compatibilidad y tienen fecha/versión de retiro.
- Toda pareja foreground/background relevante debe validarse por contraste.
- No generar estados hover/active mediante mezclas arbitrarias sin validación de diseño y accesibilidad.
- Tipografía, spacing, radius, shadow y motion siguen el mismo modelo por capas.

## Trabajo previo requerido en Figma

1. Confirmar Poppins o Montserrat.
2. Renombrar colecciones y variables de forma consistente.
3. Reemplazar valores semánticos duplicados por aliases.
4. Definir scopes correctos.
5. Nombrar propiedades de variantes de componentes.
6. Eliminar o reconciliar componentes duplicados.
