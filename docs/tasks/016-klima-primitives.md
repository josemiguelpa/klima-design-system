# TASK-016: Incorporar primitivas de Klima

## Objetivo

Representar como primitivas DTCG los colores y la tipografía base del archivo de Figma `Sistema de diseño KLIMA` (`pEieSZyQwDGKiAbeADq3ah`), incluidas las marcas del Klimaverso, con procedencia verificable.

## Dependencias

- TASK-005.
- ADR-005 y ADR-006.

## Decisiones del propietario

- La escala `grey` de Figma es el neutral global `color.neutral`.
- Los colores de estados son primitivas globales `color.<tono>`.
- Las marcas del Klimaverso se incluyen como `brand.<marca>.<color>`; Solé queda fuera por ahora.
- La procedencia se obtuvo con un script de solo lectura en Figma (2026-10-02).

## Alcance

| Fuente Figma                                     | Tokens                                                                              | Archivo                     |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- | --------------------------- |
| `semanticas/grey/*` (valor del modo Light)       | `color.neutral.{0,50…950,925}`                                                      | `global/color.json`         |
| `semanticas/status/*`                            | `color.{mint,teal,forest-moss,royal-blue,red,yellow,orange,wine,lavender}.{50…950}` | `global/color.json`         |
| Swatch del lienzo `205:2` (sin variable)         | `color.electric-green.{50…950}`                                                     | `global/color.json`         |
| `Typography/size/*`, `Typography/weight/*`       | `font.size.{10,12,14,16,18,20,24,28,32,48,64}`, `font.weight.{300,400,500,600}`     | `global/font.json`          |
| `primitivas/Klima/{blue,white,black}/*`          | `brand.klima.{blue,white,black}.{50…950}`                                           | `brands/klima/color.json`   |
| `Typography/type/Heading`                        | `brand.klima.font.family.base`                                                      | `brands/klima/font.json`    |
| `primitivas/Klimaverso/<marca>/*` (excepto Solé) | `brand.{unergy,quoiago,zentrack,inpel,suno}.*`                                      | `brands/<marca>/color.json` |

Los nombres de paso de Figma (`Lighter`, `Normal-hover`, etc.) no forman parte del contrato: describen estados de uso y pertenecen a la capa semántica.

## Fuera de alcance

- Tokens semánticos: los modos Light/Dark de `semanticas/grey/*` y los aliases `grey/background|text|border|interactive|surface/*` corresponden a TASK-008.
- Estilos de texto `typography`: requieren implementar ADR-005 en el validador.
- Colección `Foundations` (espaciado, radios y opacidades).
- Solé, incluido `Klimaverso/Solé/*`.

## Hallazgos en Figma (sin corregir)

1. `grey/700` no existe; el valor está en `grey/background/700`, una ruta de fondo semántico que contiene valores literales por modo.
2. `grey/925` (`#0A101D`) existe como variable, pero no aparece en el lienzo de swatches.
3. `forest-moss` existe como variable, pero no aparece en el lienzo; `electric-green` aparece en el lienzo, pero no tiene variable.
4. `forest-moss/400` y `Klimaverso/QuoiaGo/lime` comparten `#BDFF24`; la prueba de duplicados lo documenta explícitamente.
5. Los colores de estado están en la colección `semanticas`, aunque sus valores no cambian entre Light y Dark; aquí se modelan como primitivas.
6. `Typography/size/64` tiene dos duplicados llamados `size/64 2`; se usa la variable `size/64`.
7. La variable de familia se llama `type/Heading`, pero también la usan los estilos de cuerpo.
8. Los estilos de texto usan `lineHeight: AUTO`; los estilos itálicos no enlazan `weight/*` y `Detail` no enlaza `size/10`.
9. Todas las variables usan `ALL_SCOPES`.
10. La etiqueta del swatch `white 500` muestra `AEAEAE` sin `#`.

## Verificación

- `packages/tokens/src/__tests__/klima-primitives.test.ts`:
  - ensamblado sin diagnósticos;
  - componentes sRGB consistentes con `hex`;
  - procedencia Figma obligatoria salvo `electric-green`;
  - escalas completas 50–950;
  - duplicados documentados;
  - snapshot aprobado de valores.
- Los 157 valores también presentes en el lienzo se cruzaron contra los swatches sin diferencias.

## Criterios de aceptación

- Ningún valor semántico en primitivas.
- Todos los tokens pasan el esquema.
- Cada valor tiene fuente identificable.
- Las inconsistencias quedan registradas y no asumidas.
