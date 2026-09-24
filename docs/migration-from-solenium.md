# Migración desde Solenium

Esta guía define la frontera de migración desde los repositorios `@solenium-software`. `@klima-ds` es un contrato nuevo: las tablas orientan el trabajo de migración, pero no prometen compatibilidad de API ni aliases públicos.

## Ruta rápida

1. Identificar imports, variables CSS, iconos y componentes usados por la aplicación.
2. Consultar las tablas de equivalencias y adaptaciones manuales.
3. Reemplazar los imports y nombres en la aplicación consumidora.
4. Validar estilos, accesibilidad y comportamiento con las fixtures de Klima.

## Fuentes auditadas

| Fuente                   | Referencia auditada                                                      | Uso en esta guía                                        |
| ------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------- |
| `solenium-design-system` | `@solenium-software/design-system@0.2.2`, commit `233b0ff`               | Tokens, temas, exports y hallazgos del paquete anterior |
| `solenium-components`    | commit `6f02b12` en `develop`; catálogo `@solenium-software/icons@1.3.6` | Iconos, generadores y componentes históricos            |

Los commits fijan la evidencia de esta guía. Una rama o una versión posterior requiere una nueva revisión.

## Equivalencias respaldadas

Estas equivalencias describen roles o activos de migración, no compatibilidad automática.

| Contrato o activo anterior                 | Destino en Klima                         | Evidencia y límite                                                                                                   |
| ------------------------------------------ | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Tokens y temas como conocimiento de diseño | Modelo de tokens DTCG y temas Klima      | La auditoría confirma la separación conceptual; los nombres y valores deben revisarse en TASK-005 a TASK-010.        |
| SVG como fuente de iconos                  | Fuente revisada para `@klima-ds/icons-*` | La auditoría confirma SVG como fuente y `viewBox` en 514 archivos; la publicación depende de procedencia y licencia. |
| Repositorios anteriores como referencia    | Documentación de migración y auditoría   | ADR-001 establece que no son dependencias runtime ni contratos heredados.                                            |

## Adaptaciones manuales requeridas

| Área            | Acción                                                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Imports         | Cambiar los imports `@solenium-software/*` por los exports Klima definidos para cada paquete.                           |
| Variables CSS   | Mapear cada variable usada al token Klima revisado; no asumir equivalencia por similitud de nombre.                     |
| Iconos          | Cambiar nombres corregidos como `finger-cricle`, `money-recive` y `trush-square` por los nombres Klima que se aprueben. |
| Componentes     | Rehacer composición, props, estilos y comportamiento según el contrato Klima; el `Header` histórico no es API adoptada. |
| CSS coexistente | Aislar y coordinar los estilos durante la transición; Klima no importa CSS legacy ni evita colisiones automáticamente.  |

## Casos sin soporte

- Aliases públicos legacy de CSS, TypeScript o iconos.
- Paquete `@klima-ds/compatibility-solenium`.
- Conservación automática de exports, nombres o estructuras anteriores.
- Equivalencias de iconos cuya procedencia o licencia no haya sido confirmada.
- Compatibilidad implícita por cargar simultáneamente CSS legacy y Klima.

## Pendientes y bloqueos

- Confirmar licencia del repositorio y de los activos que se publiquen.
- Confirmar procedencia de los iconos antes de su publicación pública.
- Completar las equivalencias de tokens cuando existan los contratos Klima implementados.

## Regla de evidencia

Una equivalencia solo entra en esta guía cuando puede vincularse con una fuente auditada y una decisión aprobada del contrato Klima. Si la evidencia no alcanza, el caso se registra como adaptación manual o fuera de alcance; no se convierte en alias.
