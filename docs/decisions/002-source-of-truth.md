# ADR-002: Figma y Git como fuentes complementarias

## Estado

Aceptado.

## Decisión

Figma es la fuente de intención visual. Los tokens DTCG versionados en Git son la fuente técnica reproducible de releases. Una herramienta de sincronización compara y transforma ambos bajo revisión.

## Motivos

- Figma actual aún contiene inconsistencias que impiden generación ciega.
- Git aporta review, historial, validación y SemVer.
- El código no debe depender de disponibilidad de Figma durante cada build.

## Consecuencias

- Ningún cambio de Figma llega automáticamente a producción.
- Las diferencias se convierten en cambios revisables.
- Deben definirse identificadores y convenciones estables en Figma.
