# TASK-010: Implementar el tema Solé light/dark

## Objetivo

Asignar el contrato semántico a Solé mediante `data-brand` y `data-theme`.

## Dependencias

- TASK-009.

## Alcance

- Selectores Solé light/dark.
- Fixture visual mínima.
- Toggle de tema.
- Verificación de variables resueltas.

## Fuera de alcance

- Shadcn, white-label, utilities y componentes.

## Criterios de aceptación

- Una aplicación activa Solé light y dark sin redefinir variables.
- El paquete no modifica `body`, `*`, scrollbar ni reset global.
- La fixture valida ambos modos.

## Decisiones del propietario

- **Acción primaria.** Fuente: componente `button` del archivo `Sistema de diseño Solé`, leído el 2026-10-06.
  - Light usa la variante Indigo: fondo `brand.sole.indigo.400` y texto `brand.sole.green.400`.
  - Dark usa la variante Green: fondo `brand.sole.green.400` y texto `brand.sole.indigo.400`.
  - Figma no define hover ni active, así que repiten el valor por defecto hasta que diseño los especifique.
- **Tipografía.** Se añade el semántico `font.family.base` (`system-ui, sans-serif`) a `@klima-ds/tokens`, y Solé lo sobrescribe con `brand.sole.font.family.base` (Montserrat), según ADR-006.
- **Verificación.** Se resuelve la cascada CSS de forma estática; no se usa un navegador.

## Implementación

### Paquete `@klima-ds/themes`

- **Fuentes.** `themes.json` declara, por marca, las fuentes compartidas (`shared`) y una fuente por modo (`modes`). En Solé son `src/sole/font.json`, `src/sole/light.json` y `src/sole/dark.json`, en DTCG.
- **Validación (`resolveTheme`).** Usa `@klima-ds/tokens/tooling`. Un tema solo puede:
  - sobrescribir tokens semánticos existentes, con el mismo `$type`;
  - hacerlo mediante un alias a una primitiva global o de su propia marca.

  Además, los pares de `CONTRAST_PAIRS` deben seguir cumpliendo AA en el documento combinado; solo se toleran los `BLOCKED_PAIRS`. Si algo falla, el build se detiene con todos los problemas encontrados.

- **Salida.** `dist/sole.css` y su `.d.ts`, exportados como `@klima-ds/themes/sole.css`. Llevan el aviso de archivo generado y se publica solo el CSS. `prepack` reconstruye y verifica, igual que en tokens.
- **Selectores:**
  - `[data-brand="sole"]:not([data-theme="dark"])` aplica a light y a la ausencia de `data-theme`;
  - `[data-brand="sole"][data-theme="dark"]` aplica a dark.

  Los dos tienen especificidad (0,2,0) y superan a `:root` y a `[data-theme]` (0,1,0) de tokens sin depender del orden de las hojas. Cada token sobrescrito se redeclara en todos los modos. El CSS no toca `body`, `*`, scrollbar ni reset.

- **Componentes.** Los tokens de componente que son alias de semánticos siguen a la marca sin redeclararse. Por ejemplo, `button.primary.background.default` resuelve a indigo en Solé light.

### Cambios en `@klima-ds/tokens`

- Nueva fuente semántica sin modo, `src/tokens/semantic/font.json`, con `font.family.base`.
- `assembleTokens` expone `layerByPath`, necesario para validar los temas.
- El test de primitivas Klima filtra `font.size.` y `font.weight.` en lugar de `font.`, para no confundir el nuevo semántico con una primitiva.

### Raíz

`pnpm test` ejecuta los workspaces con `--workspace-concurrency=1`. Varias suites reconstruyen `packages/tokens/dist`: el `pack` de las fixtures y el test de themes. Con concurrencia, una podía borrar `dist` mientras otra lo leía.

## Verificación

- `packages/themes/src/__tests__/generate.test.ts`:
  - la salida es determinista y lleva el aviso de generado;
  - solo hay dos selectores y ambos están acotados a `data-brand`;
  - el mapeo Indigo/Green y la redeclaración por modo son correctos;
  - se rechazan rutas inexistentes, primitivas, literales, primitivas de otra marca, alias a semánticos, tipos distintos, contraste insuficiente, duplicados y modos faltantes;
  - se detecta salida desactualizada.
- `fixtures/themes`: página mínima con toggle (`index.html`, `src/main.js`, `src/theme-toggle.js`) que solo consume variables `--klima-*`. El test empaqueta tokens y themes, los instala desde los tarballs y comprueba:
  - todas las variables resueltas (`test/cascade.js`) coinciden con lo esperado para Solé light, sin `data-theme` y dark;
  - el resultado es el mismo con cualquier orden de hojas;
  - sin `data-brand` se mantiene el contrato neutral;
  - las reglas solo usan `data-brand`;
  - Vite construye la página y `app.css` no redefine variables;
  - el toggle alterna light y dark.

  Una prueba de mutación confirmó que un selector light de especificidad (0,1,0) hace fallar la comprobación de orden.

## Pendiente

- Diseño debe definir hover y active de la acción Solé.
- La fixture no carga Montserrat. ADR-006 pide que las fixtures carguen las fuentes, y la verificación actual solo comprueba que el token resuelve a `"Montserrat", system-ui, sans-serif`.
