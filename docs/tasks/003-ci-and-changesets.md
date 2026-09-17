# TASK-003: Configurar CI y versionado

## Objetivo

Validar cada PR y preparar versionado independiente sin publicar todavía.

## Dependencias

- TASK-002.

## Alcance

- Configurar Changesets con acceso público pendiente de activación.
- Añadir CI para install congelado, lint, typecheck, test y build.
- Añadir una imagen Docker reproducible para ejecutar la verificación en Linux desde Windows o macOS, pendiente desde TASK-002.
- Añadir validación de manifests/exports.
- Documentar el flujo de release.
- Revisar la vigencia de `scripts/verify-bootstrap.mjs` (TASK-001), que es un andamio temporal:
  - Retirar la comprobación de directorios del workspace; `pnpm ls -r --depth -1` (TASK-002) la sustituye.
  - Retirar las comprobaciones de Node y pnpm si la CI las garantiza mediante `.node-version` y `packageManager`.
  - Conservar la comprobación de `git ls-files` (outputs, caches, tarballs y secretos), ejecutarla en CI y renombrar el script para reflejar su propósito, p. ej. `verify:repo-hygiene`.
  - No dejar en el repositorio scripts con nombre `bootstrap` que ya no apliquen.

## Fuera de alcance

- Configurar tokens de publicación o ejecutar un publish.
- Elegir licencia en nombre del propietario.

## Criterios de aceptación

- Workflow válido y con permisos mínimos.
- `pnpm changeset` está disponible.
- La validación local equivalente a CI pasa.
