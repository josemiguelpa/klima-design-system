# ADR-001: Crear un repositorio nuevo

## Estado

Aceptado.

## Decisión

Crear un monorepo nuevo para Klima. Los repositorios `solenium-design-system` y `solenium-components` permanecen como referencias de migración y compatibilidad temporal.

## Motivos

- El alcance nuevo es Klima, no únicamente Solé/Solenium.
- Los repos anteriores tienen responsabilidades separadas y deuda experimental.
- El paquete UI anterior nunca fue adoptado.
- Un inicio limpio permite definir licencia, publicación, naming y boundaries coherentes.

## Consecuencias

- El código se migra selectivamente con revisión.
- No se arrastran `.git`, caches, tarballs ni outputs generados.
- La historia de decisiones se preserva mediante estos documentos, no fusionando historiales completos.
