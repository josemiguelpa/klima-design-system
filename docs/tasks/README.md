# Backlog ejecutable

Ejecutar las tareas en orden, salvo que sus dependencias permitan lo contrario. Cada tarea debe ocupar una rama y, preferiblemente, una conversación de Claude Code.

## Prompt estándar

```text
Implementa únicamente docs/tasks/NNN-nombre.md.
Lee CLAUDE.md y todas las lecturas requeridas antes de editar.
Presenta primero un plan breve. No avances a otra tarea.
Al finalizar, muestra el resumen, diff conceptual, verificaciones y riesgos.
No hagas commit ni publiques sin mi autorización.
```

## Orden inicial

1. `001-bootstrap-workspace.md`
2. `002-quality-tooling.md`
3. `003-ci-and-changesets.md`
4. `004-legacy-contract-inventory.md`
5. `005-token-schema.md`
6. `006-global-primitives.md`
7. `007-sole-primitives.md`
8. `008-semantic-tokens.md`
9. `009-token-build.md`
10. `010-sole-theme.md`
11. `011-compatibility-aliases.md`
12. `012-theme-runtime-validation.md`
13. `013-icon-inventory-and-provenance.md`
14. `014-icon-normalizer.md`
15. `015-react-icons-and-tree-shaking.md`

Después se detallan Vue/Astro, Storybook y componentes usando `docs/task-template.md`, cuando las fundaciones estén validadas.
