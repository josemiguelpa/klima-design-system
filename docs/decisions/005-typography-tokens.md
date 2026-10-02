# ADR-005: Admitir tokens compuestos de tipografía

## Estado

Aceptado.

Modifica parcialmente las decisiones aprobadas en TASK-005, secciones "Versión y tipos admitidos" y "Aliases y referencias".

## Contexto

TASK-005 dejó fuera el tipo compuesto `typography` hasta que existiera un caso de uso concreto, y prohibió las referencias incrustadas dentro de valores compuestos.

El archivo de Figma `Sistema de diseño KLIMA` define estilos de texto completos (Title Hero, Heading, Body Base, Detail, etc.) construidos sobre variables de familia, tamaño y peso. Esos estilos son el caso de uso concreto: el diseño los trata como unidades y deben llegar al contrato técnico sin que cada consumidor recombine propiedades sueltas.

## Decisión

1. Añadir `typography` a los tipos admitidos por `@klima-ds/tokens`, siguiendo la definición DTCG `2025.10`.
2. Un token `typography` tiene un `$value` objeto con exactamente estas propiedades, todas obligatorias:

   | Propiedad       | Tipo esperado |
   | --------------- | ------------- |
   | `fontFamily`    | `fontFamily`  |
   | `fontSize`      | `dimension`   |
   | `fontWeight`    | `fontWeight`  |
   | `letterSpacing` | `dimension`   |
   | `lineHeight`    | `number`      |

   Se rechazan propiedades desconocidas o ausentes.

3. Como excepción acotada a la regla de TASK-005 que prohíbe referencias incrustadas, cada propiedad de un valor `typography` puede ser un literal o un alias `"{ruta.del.token}"` a un token completo cuyo tipo coincida con el de la tabla.
   - No se admite `$ref` dentro de las propiedades.
   - No se admiten alias a otros tokens `typography` desde una propiedad.
   - El token completo también puede ser un alias a otro token `typography`.
   - Las reglas de orden entre capas, detección de ciclos y compatibilidad de tipos se aplican a cada referencia incrustada igual que a una referencia de nivel superior.
   - La excepción no se extiende a `shadow` ni a otros tipos compuestos.

4. Capas:
   - La familia tipográfica es una primitiva de marca, porque cada marca tiene su propia fuente: `brand.<marca>.font.family.<rol>`. Por ejemplo, Klima usa Be Vietnam Pro y Solé usa Montserrat.
   - Tamaños y pesos son primitivas globales: `font.size.<n>` y `font.weight.<n>`.
   - Los estilos de texto completos (`typography`) son tokens semánticos, porque expresan propósito (`text.heading`, `text.body.base`, etc.) y pueden variar por marca.

5. `lineHeight` se expresa como multiplicador sin unidad (DTCG `number`). Un valor de Figma expresado en porcentaje, por ejemplo `100`, se convierte dividiendo entre 100.

6. Decoraciones como subrayado o itálica no forman parte de `typography` en DTCG.
   - La itálica se modela con una familia o un estilo explícito cuando se necesite y queda fuera de esta decisión.
   - El subrayado de enlaces pertenece a los estilos del componente, no al token.

## Ejemplo

```json
{
  "text": {
    "body": {
      "base": {
        "$type": "typography",
        "$value": {
          "fontFamily": "{brand.klima.font.family.base}",
          "fontSize": "{font.size.14}",
          "fontWeight": "{font.weight.400}",
          "letterSpacing": { "value": 0, "unit": "px" },
          "lineHeight": 1
        }
      }
    }
  }
}
```

## Motivos

- Figma ya trabaja con estilos de texto completos; representarlos como una unidad conserva la intención de diseño y facilita la sincronización.
- Un estilo compuesto impide combinaciones accidentales, como el tamaño de un estilo con el peso de otro.
- Sin alias internos, cada estilo duplicaría literales de tamaño, peso y familia, rompiendo la relación con las primitivas.
- Acotar la excepción a `typography` mantiene simple la resolución del resto de tipos compuestos.

## Consecuencias

- El validador debe aceptar `typography`, validar su estructura y resolver las referencias de cada propiedad. Se requieren pruebas para alias válidos, tipo incompatible, destino inexistente, ciclo y dependencia inversa entre capas dentro de un valor `typography`.
- La generación CSS deberá descomponer cada token `typography` en propiedades individuales, por ejemplo `--klima-text-body-base-font-size`, y puede ofrecer además una forma abreviada `font`.
- Cambiar la familia de una marca afecta a todos sus estilos sin tocar cada token.
- Si un paquete incluye los archivos de Be Vietnam Pro, debe incluir el texto de su licencia, igual que con Montserrat. Hay que verificar la licencia antes de distribuir.
- Un line-height de 1 en texto de cuerpo debe revisarse con diseño y accesibilidad antes de fijarse en los estilos semánticos.
