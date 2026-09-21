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

## Estrategia de contrato

`@klima-ds` es un contrato nuevo. El backlog no implementa compatibilidad con `@solenium-software`: no habrá aliases legacy, paquete de compatibilidad ni CSS legacy importado por defecto. TASK-004 documenta la frontera de migración y TASK-011 queda cancelada/supersedida sin renumerar las tareas posteriores.

Las tareas canceladas o supersedidas no son ejecutables, aunque permanezcan en el listado para conservar la trazabilidad. En particular, TASK-011 debe omitirse y no debe implementarse.

## Orden inicial

1. `001-bootstrap-workspace.md`
2. `002-quality-tooling.md`
3. `003-ci-and-changesets.md`
4. `004-legacy-contract-inventory.md` — frontera de migración, no snapshots exhaustivos
5. `005-token-schema.md`
6. `006-global-primitives.md`
7. `007-sole-primitives.md`
8. `008-semantic-tokens.md`
9. `009-token-build.md`
10. `010-sole-theme.md`
11. `011-compatibility-aliases.md` — **cancelada/supersedida; no ejecutar ni implementar**
12. `012-theme-runtime-validation.md`
13. `013-icon-inventory-and-provenance.md` — inventario, procedencia y notas de nombres corregidos
14. `014-icon-normalizer.md`
15. `015-react-icons-and-tree-shaking.md`

Después se detallan Vue/Astro, Storybook y componentes usando `docs/task-template.md`, cuando las fundaciones estén validadas.
