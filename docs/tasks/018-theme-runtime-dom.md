# TASK-018: Serializar y aplicar el tema white-label en el DOM

## Objetivo

Una aplicación convierte el resultado de `createWhiteLabelTheme` en CSS y lo aplica en el navegador o en el HTML de SSR, con soporte CSP, sin depender del orden de las hojas y sin redefinir variables a mano.

## Contexto

- TASK-012 entrega un núcleo puro: `createWhiteLabelTheme(input)` devuelve, por modo, overrides de `color.action.{primary,secondary}.*` con valores hex opacos ya validados. No serializa CSS ni toca el DOM.
- El reemplazo legacy es `injectTheme` de `@solenium-software/design-system/theme`:
  - crea o actualiza un `<style id="solenium-dynamic-theme">` en `<head>` mediante `textContent`;
  - aplica los selectores `:root` y `.dark`;
  - sin `nonce`, emite una advertencia y no hace nada si no hay `document`.

  Lo usan sunboarding (`useOnboardingTheme`, `useLifelineTheme`) y supply (`routes/__root.tsx`) tras el login, con los colores de la empresa del usuario.

- Ninguna de esas aplicaciones declara hoy una política CSP, pero el roadmap (Milestone 2) exige soporte CSP.
- El tema neutral (`:root`, `[data-theme]`, especificidad 0,1,0) y el de Solé (`[data-brand="sole"]…`, especificidad 0,2,0) no dependen del orden de las hojas. El white-label debe mantener esa propiedad.

## Lecturas requeridas

- `docs/architecture.md` (API de temas y responsabilidades de `@klima-ds/theme-runtime`).
- `docs/token-model.md` (modos y reglas).
- `docs/tasks/010-sole-theme.md` (estrategia de selectores y especificidad).
- `docs/tasks/012-theme-runtime-validation.md` (API y diagnósticos del núcleo).
- `docs/decisions/004-brand-strategy.md`.

## Dependencias

- TASK-010 y TASK-012 completadas.

## Decisiones del propietario

Se aprobaron las propuestas del borrador (2026-10-06):

1. El white-label se aplica encima de la marca activa y solo sustituye `color.action.*`.
2. Selectores `:root[data-white-label]:not([data-theme="dark"])` y `:root[data-white-label][data-theme="dark"]`, con especificidad (0,3,0). Ganan al tema neutral (0,1,0) y a los de marca (0,2,0) sin depender del orden. El atributo debe estar en `<html>`.
3. Inyección mediante un único `<style>` con `id` estable, `nonce` opcional y `textContent`.
4. `happy-dom` como devDependency para probar el DOM. Las variables resueltas se siguen verificando con la cascada estática.

## Alcance

- `serializeWhiteLabelTheme(theme, options?)` en `@klima-ds/theme-runtime`:
  - es pura, determinista y segura para SSR;
  - devuelve el CSS de todos los modos para incluirlo en el HTML del servidor (`<style nonce>`);
  - solo acepta un tema producido por `createWhiteLabelTheme` (valores hex validados) y nombres de variable derivados de `TokenPath`; no interpola texto libre.
- `applyWhiteLabelTheme(theme, options?)` en un subpath `@klima-ds/theme-runtime/dom`:
  - crea o actualiza un único `<style>` identificado por `id`, con `nonce` opcional;
  - devuelve una función para retirarlo;
  - no toca atributos `style` en línea, `body`, `*` ni el reset;
  - el import del subpath no accede al DOM en el nivel superior del módulo, así que es seguro en SSR.
- Las reglas generadas ganan al tema neutral y al de marca en ambos modos sin depender del orden de las hojas, y siguen el cambio de `data-theme` sin volver a aplicarse.
- Fixture `fixtures/white-label` desde los tarballs empaquetados de `tokens`, `themes` y `theme-runtime`:
  - una página mínima que aplica un color de tenant y alterna light/dark;
  - un test que resuelve estáticamente todas las variables para neutral + white-label y Solé + white-label, con las hojas en ambos órdenes.
- Documentar en `docs/migration-from-solenium.md` la equivalencia `injectTheme` → `createWhiteLabelTheme` + `applyWhiteLabelTheme`.

## Fuera de alcance

- Variables shadcn, charts y aliases `--brand-*` (adapter shadcn, tarea posterior).
- Hooks o componentes de framework (React, Vue, Astro).
- Obtener la configuración del tenant desde una API o almacenamiento.
- Generar estados hover/active o derivar colores dark.
- Nuevos formatos de color de entrada.

## Criterios de aceptación

- `serializeWhiteLabelTheme` produce bytes idénticos para la misma entrada y se ejecuta en Node sin DOM.
- Con una CSP `style-src 'nonce-X'`, el estilo aplicado con `nonce: "X"` lleva ese `nonce` y ningún mecanismo usa estilos en línea ni `eval`.
- Aplicar dos veces reemplaza el mismo elemento en lugar de duplicarlo, y la función de limpieza lo elimina.
- En la fixture, el white-label sustituye `color.action.*` sobre el tema neutral y sobre Solé, en light y dark, con ambos órdenes de hojas. El resto de variables conserva su valor.
- La aplicación no redefine variables `--klima-*` a mano.

## Verificación

```bash
pnpm --filter @klima-ds/theme-runtime test
pnpm --filter white-label-fixture test
pnpm lint && pnpm typecheck && pnpm format:check && pnpm build
pnpm verify:manifests && pnpm verify:repo-hygiene
```

## Implementación

- `@klima-ds/theme-runtime`:
  - `serializeWhiteLabelTheme(theme)` y `whiteLabelSelector(mode)` en `src/serialize.ts`, exportados desde la raíz. Revalida cada clave (solo `color.action.{primary,secondary}.{default,hover,active,foreground}`) y cada valor (`#rrggbb` en minúsculas). Ante cualquier otra cosa lanza `TypeError`; nunca escapa ni descarta.
  - `applyWhiteLabelTheme(theme, { id, nonce, document })` en `src/dom.ts`, exportado como `@klima-ds/theme-runtime/dom`:
    - crea o actualiza `<style id="klima-white-label">` y activa `data-white-label` en `<html>`;
    - devuelve una función de limpieza que retira ambos;
    - lanza un error si no hay `document` o si el `id` pertenece a un elemento que no es `<style>`.

    El módulo usa tipos DOM estructurales, así que el build sigue sin `lib: dom`.

  - Script `prepack` (`tsc -p tsconfig.build.json`), para que el tarball no salga con `dist` desactualizado.
- `fixtures/white-label`: página con selector de color y toggle (`index.html`, `src/main.js`, `src/app.css`). El test instala los tarballs de tokens, themes y theme-runtime.
- `fixtures/*/test/cascade.js` admite selectores de presencia (`[data-white-label]`). Las dos copias se mantienen idénticas.
- `docs/migration-from-solenium.md`: sección "White-label en runtime" con la equivalencia de `injectTheme` y las adaptaciones manuales.

## Verificación realizada

- `serialize.test.ts`:
  - salida exacta y determinista;
  - acción secundaria y selectores (0,3,0);
  - modos vacíos;
  - rechazo de valores y claves inyectadas, nombres de color, mayúsculas, tokens que no son de acción y modos desconocidos.
- `dom.test.ts` (happy-dom):
  - un único `<style>` en `<head>`, con el CSS serializado y el atributo de activación;
  - `nonce`, sin atributos `style`;
  - reaplicar actualiza el mismo elemento;
  - `id` personalizado y limpieza;
  - conflicto de `id`;
  - el código no usa `eval`, `Function`, `.style` ni `innerHTML`.
- SSR (`white-label.test.ts`): `dist`, salvo `dom.js`, no referencia APIs del navegador; en un proceso Node sin DOM se pueden importar ambos entry points, `serializeWhiteLabelTheme` funciona y `applyWhiteLabelTheme` lanza el error explicativo.
- `fixtures/white-label` (7 tests):
  - sobre el tema neutral y sobre Solé, en light y dark, y en los seis órdenes posibles de las tres hojas, solo cambian `color.action.*` y `button.primary.background.default` (alias de la acción);
  - sin `data-white-label` no hay efecto;
  - serialización determinista desde el tarball;
  - Vite construye la página y `app.css` no redefine variables.
- Prueba de mutación: un selector (0,2,0) pierde frente a Solé cuando Solé se carga después.
- `pnpm lint`, `typecheck`, `format:check`, `test`, `build`, `verify:manifests` (publint y attw en verde para `.` y `./dom`) y `verify:repo-hygiene`: todos en verde.

## Pendiente

- No se probó una CSP real en navegador: la verificación cubre el atributo `nonce` y la ausencia de estilos en línea y `eval`.
- `adoptedStyleSheets` queda como alternativa futura si alguna aplicación no puede propagar el `nonce`.

## Entrega esperada

- Resumen.
- Archivos modificados.
- Comandos y resultados.
- Riesgos o decisiones pendientes.
- Commit sugerido.
