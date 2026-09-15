# TASK-004: Inventariar contratos legacy

## Objetivo

Crear snapshots legibles por máquina de la API pública anterior sin copiar sus implementaciones completas.

## Lecturas requeridas

- `docs/current-system-audit.md`
- `docs/compatibility.md`

## Dependencias

- TASK-002.

## Alcance

- Inventariar exports públicos del paquete de diseño.
- Inventariar variables CSS y clasificarlas como usada, dudosa o interna cuando exista evidencia.
- Inventariar nombres de iconos publicados.
- Registrar versiones auditadas y origen de cada snapshot.
- Añadir tests de unicidad y formato.

## Fuera de alcance

- Implementar aliases o corregir nombres.
- Copiar tarballs, caches o repos completos.

## Criterios de aceptación

- Los snapshots son deterministas.
- Distinguen hechos observados de supuestos.
- Existe una tabla inicial de incompatibilidades conocidas.
