# Klima Design System — paquete documental

Este directorio contiene el contexto, las decisiones y el backlog inicial para continuar el proyecto en Claude Code sin depender del historial de una conversación.

## Uso recomendado

1. Crear un repositorio nuevo para el sistema, por ejemplo `klima-design-system`.
2. Copiar todo el contenido de este directorio a la raíz del repositorio.
3. Conservar los repositorios anteriores como referencias de migración:
   - `solenium-design-system`: tokens, temas y runtime white-label existentes.
   - `solenium-components`: SVG, generador multiplataforma e infraestructura de monorepo.
4. Iniciar Claude Code en el nuevo repositorio.
5. Pedir una sola tarea por conversación, siguiendo `docs/tasks/README.md`.

## Primer prompt para Claude

```text
Lee CLAUDE.md y los documentos que este referencia. No modifiques código todavía.
Resume la arquitectura acordada, las decisiones pendientes y los riesgos de migración.
Después indica si TASK-001 está suficientemente especificada para implementarse.
```

Cuando el resumen sea correcto:

```text
Implementa únicamente docs/tasks/001-bootstrap-workspace.md.
No avances a la siguiente tarea.
```

## Regla principal

El repositorio conserva el conocimiento; cada conversación ejecuta una tarea pequeña.
