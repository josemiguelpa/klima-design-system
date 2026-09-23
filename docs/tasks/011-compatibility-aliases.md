# TASK-011: Aliases de compatibilidad — cancelada

## Estado

**Cancelada / supersedida por la estrategia clean break.** Se conserva el número para mantener la trazabilidad del backlog.

## Motivo

`@klima-ds` define un contrato nuevo y no ofrecerá compatibilidad hacia atrás con `@solenium-software`. Los aliases CSS, TypeScript e iconos introducirían una superficie pública que el proyecto decidió no sostener.

## Decisión

No implementar esta tarea, no crear un paquete de compatibilidad y no publicar aliases legacy. Las necesidades de migración se documentan en TASK-004 y `docs/compatibility.md`.

## Alcance residual

Las equivalencias manuales, los cambios de nombres y los casos sin soporte deben registrarse como notas de migración. No deben convertirse en exports o variables adicionales del runtime Klima.
