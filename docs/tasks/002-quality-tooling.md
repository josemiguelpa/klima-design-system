# TASK-002: Configurar calidad compartida

## Objetivo

Establecer TypeScript estricto, lint y formato compartidos para el workspace.

## Dependencias

- TASK-001.

## Alcance

- Usar ECMAScript modules en todo el workspace: `"type": "module"` en el `package.json` raíz y en cada paquete; archivos de configuración en ESM.
- Crear configuración compartida de TypeScript.
- Configurar ESLint y formatter.
- Añadir scripts raíz `lint`, `format:check` y `typecheck`.
- Crear un paquete placeholder para demostrar que hereda la configuración.

## Fuera de alcance

- Tests, CI, Turborepo o lógica de design system.

## Criterios de aceptación

- Los tres comandos terminan correctamente.
- Una infracción deliberada en fixture es detectada; no debe quedar en el commit.
- La configuración funciona en Windows y Linux.
