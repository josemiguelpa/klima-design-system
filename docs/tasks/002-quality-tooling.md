# TASK-002: Configurar calidad compartida

## Objetivo

Establecer TypeScript estricto, lint y formato compartidos para el workspace.

## Dependencias

- TASK-001.

## Alcance

- Usar ECMAScript modules en todo el workspace: `"type": "module"` en el `package.json` raíz y en cada paquete; archivos de configuración en ESM.
- Crear `tooling/typescript-config` con `base.json`, `library.json` y `react.json`, heredando en cadena. Usa `moduleResolution: "nodenext"` para detectar errores de `exports` antes de publicar.
- Crear `tooling/eslint-config` con configuración plana (`eslint.config.js`).
- Ambos paquetes de `tooling/` son `"private": true` y conservan el scope `@klima-ds/*`. Se consumen como `devDependencies` con `workspace:*`; un paquete privado nunca puede aparecer en `dependencies` de un paquete publicable.
- Usar Prettier como formatter y ESLint como linter, con responsabilidades separadas.
- Añadir scripts raíz `lint`, `format:check` y `typecheck`. El recorrido del workspace se hace con `pnpm -r`; las project references de TypeScript (`tsc -b`) se evalúan más adelante si el tiempo de `typecheck` molesta.
- Crear un paquete placeholder en `fixtures/` para demostrar que hereda la configuración. No va en `packages/`, para no mezclarlo con paquetes reales.

## Fuera de alcance

- Tests, CI, Docker, Turborepo o lógica de design system.

## Restricciones de versiones

Verificado en npm el 2026-09-15:

- `typescript-eslint` declara `typescript >=4.8.4 <6.1.0`. TypeScript 7 es la versión estable, pero el lint con información de tipos obliga a usar TypeScript 6.0.x. Revisar en cada actualización.
- `eslint-plugin-jsx-a11y` declara soporte hasta ESLint 9. Es un riesgo a verificar en TASK-015, cuando entren las reglas de accesibilidad de React, no en esta tarea.

## Criterios de aceptación

- Los tres comandos terminan correctamente.
- `pnpm ls -r --depth -1` lista el paquete del workspace; verificación pendiente desde TASK-001.
- Una infracción deliberada en fixture es detectada; no debe quedar en el commit.
- La configuración funciona en Windows y Linux. La verificación en Linux se hace en TASK-003, con Docker o CI.
