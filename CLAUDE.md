# Klima Design System

Este repositorio construirá el sistema de diseño público y multimarca del conglomerado Klima. Solé será la primera marca implementada, no el nombre del núcleo.

## Lectura obligatoria

Antes de implementar cualquier tarea, lee:

1. `docs/project-context.md`.
2. `docs/architecture.md`.
3. El archivo de tarea indicado por el usuario.
4. Los ADR y documentos que esa tarea enlace.

Para cambios de tokens, lee además `docs/token-model.md`. Para migraciones o aliases, lee `docs/compatibility.md`.

## Reglas de trabajo

- Limítate estrictamente al alcance de la tarea activa.
- No comiences la tarea siguiente automáticamente.
- No cambies una decisión aceptada en `docs/decisions/` sin proponer un ADR nuevo.
- Preserva cambios preexistentes y no relacionados.
- Antes de editar, inspecciona el estado actual y presenta un plan breve.
- Añade pruebas o una verificación automatizada cuando sea técnicamente posible.
- Al terminar, informa archivos modificados, verificaciones, resultados y riesgos pendientes.
- No hagas commit, push, publicación ni cambios en Figma sin autorización explícita.

## Restricciones de arquitectura

- Los paquetes públicos utilizan el scope `@klima-ds/*`.
- Solé se modela como tema de marca.
- Una aplicación activa una marca principal y un esquema de color a la vez.
- Los componentes consumen tokens semánticos; no consumen colores primitivos directamente.
- Tailwind puede ser una herramienta interna, pero sus clases no constituyen la API principal.
- Los componentes deben publicar estilos consumibles sin obligar al consumidor a escanear el código fuente del paquete.
- React es el primer framework de componentes.
- Vue y Astro reciben inicialmente tokens e iconos; sus componentes se evaluarán según demanda.
- Los SVG son la fuente canónica de los iconos.
- Cada framework de iconos debe poder instalarse sin dependencias de los demás frameworks.
- El bundle final de una aplicación debe incluir únicamente los iconos importados.

## Calidad mínima

- TypeScript estricto.
- Build reproducible y portable entre Linux, macOS y Windows.
- Tests de exports y consumo desde aplicaciones fixture.
- Verificación de accesibilidad para colores y componentes.
- Changesets y SemVer.
- Ningún artefacto generado, caché, tarball o credencial debe versionarse salvo decisión explícita.
