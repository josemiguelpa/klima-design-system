# TASK-001: Inicializar el workspace Klima

## Objetivo

Crear la estructura mínima del nuevo monorepo sin migrar todavía código funcional.

## Lecturas requeridas

- `docs/architecture.md`
- `docs/decisions/001-new-repository.md`
- `docs/decisions/003-package-boundaries.md`

## Dependencias

Ninguna.

## Alcance

- Configurar pnpm workspace.
- Fijar Node 24 LTS en `engines` y `.node-version`.
- Fijar la última versión estable de pnpm, exacta, en `packageManager`.
- Añadir `engineStrict: true` en `pnpm-workspace.yaml`. Desde pnpm 11, `.npmrc` solo se usa para autenticación y registro; `engine-strict` en `.npmrc` se ignora (verificado con pnpm 12.4.2). `engineStrict` bloquea la instalación de dependencias con `engines` incompatibles, pero no valida los `engines` del paquete raíz: esa comprobación la hace `verify:bootstrap`.
- Crear directorios `apps`, `packages`, `tooling` y `fixtures` con un `.gitkeep` cada uno; no crear paquetes placeholder (corresponde a TASK-002).
- Añadir `.gitignore`, `.editorconfig` y `"private": true` en el `package.json` raíz.
- Añadir `.gitattributes` con `* text=auto eol=lf` antes del primer commit, para que los finales de línea no dependan del `core.autocrlf` local de cada colaborador.
- Añadir un único script raíz, `verify:bootstrap`, implementado en Node (`scripts/verify-bootstrap.mjs`) para ser portable.
- Versionar `pnpm-lock.yaml`.
- El repositorio es público; `"private": true` solo evita publicar la raíz en npm.

### `.gitignore` acordado

```gitignore
# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
build/
storybook-static/
*.tsbuildinfo

# Caches
.turbo/
.cache/
.eslintcache
coverage/
.astro/

# Tarballs and logs
*.tgz
*.log

# Secrets
.env
.env.*
!.env.example
*.pem

# OS and editors
.DS_Store
Thumbs.db
.idea/
.vscode/

# Local agent tooling
.claude/settings.local.json
.atl/
```

El proyecto no versiona `.npmrc`: la configuración de pnpm vive en `pnpm-workspace.yaml`. Los tokens de publicación viven en el `~/.npmrc` del usuario.

## Fuera de alcance

- Turborepo, Changesets, CI, paquetes reales, tokens o SVG.
- Scripts `lint`, `format:check` y `typecheck` (TASK-002); `test` y `build` (TASK-003).

## Criterios de aceptación

- `pnpm install` funciona en un clon limpio y genera `pnpm-lock.yaml`.
- `pnpm verify:bootstrap` pasa en Windows, macOS y Linux, y comprueba:
  - Node cumple `engines`.
  - pnpm coincide con `packageManager`.
  - Existen `apps`, `packages`, `tooling` y `fixtures`.
  - `git ls-files` no contiene outputs, caches, tarballs ni secretos.
- La verificación de reconocimiento de paquetes del workspace se hace en TASK-002 con `pnpm ls -r --depth -1` (no con `pwd`, que no es portable a Windows).

## Nota posterior (TASK-003)

`verify:bootstrap` / `scripts/verify-bootstrap.mjs` fue retirado y renombrado a `verify:repo-hygiene` / `scripts/verify-repo-hygiene.mjs` en TASK-003. El nuevo script solo conserva la comprobación de `git ls-files`. Las comprobaciones de Node y pnpm se retiraron porque CI las garantiza con `.node-version` y `packageManager`. La comprobación de directorios del workspace también se retiró, pero `pnpm ls -r --depth -1` no la sustituye por completo mientras `apps/` y `packages/` estén vacíos: ese comando solo lista directorios con `package.json`. Ver `docs/release-process.md` para el detalle del hueco y cuándo se cierra. Este archivo se conserva sin modificar como registro histórico de lo entregado en TASK-001.
