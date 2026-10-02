# TASK-007: Incorporar primitivas de Solé

## Objetivo

Representar la paleta actual de Solé como primitivas de marca verificadas contra Figma.

## Dependencias

- TASK-005.

## Alcance

- Crear escalas de color de Solé.
- Registrar correspondencia con variables Figma.
- Detectar valores duplicados e inconsistencias sin corregirlas silenciosamente.
- Añadir snapshot visual o tabla de swatches verificable.

## Fuera de alcance

- Semánticos, white-label y otras marcas.

## Criterios de aceptación

- Cada valor tiene fuente identificable.
- No se reutilizan nombres antiguos ambiguos como contrato nuevo.
- El resultado pasa validación de esquema.

## Implementación

Fuente: archivo de Figma `Sistema de diseño Solé` (`zeWPEzMPcSIT91DT5awWiB`), colección `primitivas`, leída con un script de solo lectura el 2026-10-02.

- `brand.sole.{green,blue,indigo}.{50…950}` en `src/tokens/brands/sole/color.json`, con procedencia Figma por token.
- El paso 400 es el color base de la marca, según una anotación de diseño en Figma: green `#E2FF65`, blue `#8CC3E1`, indigo `#152644`.
- Por decisión del propietario, grises, colores de estado y marcas del Klimaverso no se duplican: Solé reutiliza los tokens importados desde el archivo de Klima (TASK-016). La comparación de 125 variables entre ambos archivos dio 124 coincidencias; la única diferencia es QuoiaGo, que conserva el valor del archivo de Klima.
- `brand.sole.font.family.base` = `["Montserrat", "system-ui", "sans-serif"]` en `src/tokens/brands/sole/font.json`, desde la variable `Typography/type/Heading`. Los 15 estilos de texto de Solé usan los mismos tamaños y pesos que Klima (400, 500 y 600, más itálica 400), así que reutilizan `font.size.*` y `font.weight.*` globales; Solé no usa el peso 300.
- Verificación: `src/__tests__/sole-primitives.test.ts` y cruce de los 33 valores contra los swatches del lienzo, sin diferencias.

## Hallazgos en Figma (sin corregir)

1. `blue/700` y `blue/800` comparten `#306F91`.
2. `indigo/500` = `indigo/700` (`#13223D`) e `indigo/600` = `indigo/800` (`#101D33`); la escala se aclara de 600 a 700.
3. Los primeros pasos de indigo saltan bruscamente: `#E5EBF8` → `#8EA8D7` → `#375B9A`.
4. `Klimaverso/quoiaGO/electric purple` vale `#3840D9` en este archivo y `#372A85` (`electric blue`) en el archivo de Klima.
5. Los swatches del lienzo están enlazados a variables de dos bibliotecas remotas no listadas, `primitives` (`brand/*`) y `primitivas` (`aliados/*`), distintas de las variables locales.
6. Todas las variables usan `ALL_SCOPES`.
