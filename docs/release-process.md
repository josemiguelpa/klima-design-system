# Flujo de release

## Objetivo

Documentar cómo se valida cada cambio y cómo se preparará el versionado independiente de los paquetes públicos, sin publicar todavía (TASK-003).

## Validación en cada Pull Request

`.github/workflows/ci.yml` corre en cada Pull Request y en cada push a `main`, con permisos mínimos (`contents: read`, sin permisos de escritura). Instala con lockfile congelado (`pnpm install --frozen-lockfile`) y ejecuta, en este orden:

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm format:check`
4. `pnpm test`
5. `pnpm build`
6. `pnpm verify:manifests`
7. `pnpm verify:repo-hygiene`

Node se fija con `.node-version` (`actions/setup-node`) y pnpm con el campo `packageManager` del `package.json` raíz (`pnpm/action-setup`). Ninguna versión se declara por duplicado en el workflow.

## Verificación local equivalente a CI

### Con Docker (recomendado desde Windows o macOS)

El `Dockerfile` de la raíz reproduce el entorno Linux de CI. La imagen solo contiene el toolchain (Node, pnpm, git); el árbol de trabajo se monta como volumen para que la verificación corra siempre contra el código actual.

```sh
docker build -t klima-verify .
docker run --rm --user "$(id -u):$(id -g)" -v "$PWD:/workspace" -w /workspace klima-verify
```

El `CMD` de la imagen ejecuta la misma secuencia que el workflow de CI.

`--user "$(id -u):$(id -g)"` es obligatorio en Linux: sin él, el contenedor corre como `root` y cualquier archivo que escriba en el volumen montado (`node_modules`, el store de pnpm) queda con dueño `root` en el host, lo que después rompe `rm -rf node_modules` y una reinstalación normal fuera de Docker. En Windows y macOS con Docker Desktop el volumen usa un daemon con su propio mapeo de usuario y no sufre este problema, pero pasar el flag no hace daño.

### Sin Docker (Linux, macOS o Windows)

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm format:check
pnpm test
pnpm build
pnpm verify:manifests
pnpm verify:repo-hygiene
```

## `test` y `build` hoy vs. cuando existan paquetes reales

`packages/`, `apps/` y `fixtures/` están vacíos o son fixtures de calidad (TASK-002); ningún paquete declara todavía scripts `test` o `build`. Los scripts raíz `pnpm test` y `pnpm build` recorren el workspace con `pnpm -r --if-present`, así que hoy no ejecutan nada y terminan con código de salida `0` legítimamente, no por un `try/catch` que oculte un fallo. En cuanto un paquete real declare `test` o `build`, el recorrido empezará a ejecutarlos sin cambios en el script raíz.

Vitest se agrega como `devDependency` raíz para que cualquier paquete pueda declarar su propio `test` sin volver a decidir el runner.

## Validación de manifests y exports

`scripts/verify-manifests.mjs` (`pnpm verify:manifests`) busca paquetes publicables bajo `packages/*` (aquellos sin `"private": true`, ver `docs/architecture.md`). Hoy no existe ninguno, así que el script lo reporta explícitamente y termina en `0`: es lógica de descubrimiento real, no un resultado fijo que simule éxito. En cuanto exista un paquete publicable bajo `packages/`, el script ejecutará contra él:

- [`publint`](https://publint.dev/): valida que el `package.json` (exports, tipos, `main`, etc.) sea consumible por distintos bundlers y runtimes.
- [`@arethetypeswrong/cli`](https://github.com/arethetypeswrong/arethetypeswrong.github.io) (`attw --pack`): valida que los tipos declarados coincidan con lo que el paquete realmente exporta una vez empaquetado.

## Higiene del repositorio

`scripts/verify-repo-hygiene.mjs` (`pnpm verify:repo-hygiene`) es la comprobación de `git ls-files` heredada de TASK-001 (antes `scripts/verify-bootstrap.mjs`, script `verify:bootstrap`), retirada y renombrada en TASK-003: confirma que ningún output generado, caché, tarball o secreto quede versionado. Las comprobaciones de versiones de Node y pnpm que tenía el andamio original se retiraron porque CI las garantiza con `.node-version` y `packageManager`.

La comprobación de directorios del workspace también se retiró, pero con una salvedad que conviene dejar escrita: `pnpm ls -r --depth -1` **no la sustituye por completo hoy**. Ese comando solo lista directorios que contienen un `package.json`, así que cubre `tooling/` y `fixtures/`, pero no `apps/` ni `packages/`, que por ahora solo contienen un `.gitkeep`. Si alguien borrara `apps/` o `packages/`, ninguna verificación lo detectaría. El hueco se cierra solo en cuanto esos directorios alojen paquetes reales (TASK-005 en adelante); hasta entonces, la protección efectiva es la revisión del diff, donde la desaparición de un `.gitkeep` es visible.

## Changesets

Changesets está configurado (`.changeset/config.json`) con `"access": "public"`, pensado para cuando los paquetes bajo `packages/` sean publicables. Esto **no publica nada todavía**: no hay workflow de publish, no hay token de npm configurado y `access: public` solo describe la intención de acceso del futuro publish, no lo ejecuta.

Flujo esperado una vez existan paquetes reales:

1. Cada Pull Request que cambie un paquete publicable agrega un changeset: `pnpm changeset`.
2. Los changesets se acumulan en `.changeset/*.md` hasta que se decida cortar una versión.
3. Fuera de alcance de esta tarea: un workflow de CI que ejecute `changeset version` y `changeset publish` con un token de npm. Se definirá cuando exista al menos un paquete publicable (ver TASK-005 en adelante) y se resuelva la decisión pendiente de licencia en `docs/project-context.md`.

## Fuera de alcance de TASK-003

- Tokens de publicación o ejecución de un publish real.
- Elegir la licencia del repositorio.
- Cualquier lógica de design system o paquete real bajo `packages/`.
