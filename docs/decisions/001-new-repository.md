# ADR-001: Crear un repositorio nuevo

## Estado

Aceptado.

## Decisión

Crear un monorepo nuevo para Klima. Los repositorios `solenium-design-system` y `solenium-components` permanecen como referencias históricas y de migración, pero el contrato `@klima-ds` no será compatible hacia atrás con ellos.

## Motivos

- El alcance nuevo es Klima, no únicamente Solé/Solenium.
- Los repos anteriores tienen responsabilidades separadas y deuda experimental.
- El paquete UI anterior nunca fue adoptado.
- Un inicio limpio permite definir licencia, publicación, naming y boundaries coherentes.

## Consecuencias

- El código y los activos se migran selectivamente con revisión.
- No se arrastran `.git`, caches, tarballs ni outputs generados.
- No se publican aliases ni un paquete de compatibilidad.
- La migración se explica mediante una frontera documental, no mediante infraestructura runtime.
- La historia de decisiones se preserva mediante estos documentos, no fusionando historiales completos.
