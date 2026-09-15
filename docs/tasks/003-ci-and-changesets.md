# TASK-003: Configurar CI y versionado

## Objetivo

Validar cada PR y preparar versionado independiente sin publicar todavía.

## Dependencias

- TASK-002.

## Alcance

- Configurar Changesets con acceso público pendiente de activación.
- Añadir CI para install congelado, lint, typecheck, test y build.
- Añadir validación de manifests/exports.
- Documentar el flujo de release.

## Fuera de alcance

- Configurar tokens de publicación o ejecutar un publish.
- Elegir licencia en nombre del propietario.

## Criterios de aceptación

- Workflow válido y con permisos mínimos.
- `pnpm changeset` está disponible.
- La validación local equivalente a CI pasa.
