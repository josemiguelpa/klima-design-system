# Contexto del proyecto

## Objetivo

Construir un sistema de diseño público, escalable y multimarca bajo Klima. Debe entregar tokens, temas, iconos y componentes reutilizables. Solé será su primera implementación y debe existir un camino razonable de compatibilidad para aplicaciones Solenium actuales.

## Escenario de consumo

- La mayoría de aplicaciones usa TypeScript y Tailwind CSS.
- React será el primer framework soportado para componentes.
- Los iconos deben estar disponibles para Vanilla, React, Vue y Astro.
- Una aplicación utiliza una sola marca principal.
- Puede mostrar elementos puntuales de otra marca, como un logo o su color principal, sin cambiar el tema activo.
- Se requieren modos light y dark.
- Algunas aplicaciones necesitan white-label configurado en runtime.

## Fuentes existentes

### `solenium-design-system`

Paquete `@solenium-software/design-system` versión auditada `0.2.2`. Contiene CSS custom properties, aliases, light/dark, integración shadcn, preset Tailwind y helpers `createTheme`/`injectTheme`.

### `solenium-components`

Monorepo experimental con pnpm, Turborepo y Changesets:

- `@solenium-software/icons` versión auditada `1.3.6`.
- `@solenium-software/ui` versión auditada `0.1.2`.
- 514 SVG y generación Vanilla/React/Vue/Astro.
- El paquete UI nunca se adoptó y solo contiene un `Header` experimental.

### Figma

Archivo de diseño: `Sistema de diseño Solé`.

Figma expresa la intención visual actual, pero necesita normalización antes de ser una fuente automatizada: nombres inconsistentes, aliases parciales, propiedades genéricas, componentes duplicados y diferencias con el código existente.

## Estrategia acordada

- Crear un repositorio nuevo, tentativamente `klima-design-system`.
- No fusionar ciegamente los repositorios anteriores.
- Migrar selectivamente conocimiento, SVG, contratos compatibles e infraestructura útil.
- Mantener los repositorios anteriores disponibles durante la transición.
- Establecer Git como fuente versionada del artefacto técnico y Figma como fuente de intención de diseño; una sincronización controlada conectará ambos.

## Decisiones del propietario

### Resueltas

1. Repositorio `klima-design-system` y scope npm `@klima-ds`.
2. Licencia propuesta, sujeta a revisión legal: Apache-2.0 para el código, `TRADEMARKS.md` para nombres e identidad de marca, y logos excluidos de la licencia abierta (todos los derechos reservados).
3. Tipografía de Solé: Montserrat.
   - **MUST:** Montserrat se distribuye bajo SIL Open Font License 1.1. Si un paquete incluye archivos de la fuente, debe incluir también el texto de la OFL y respetar sus condiciones.
4. Versiones mínimas: React `>=18`; Vue y Astro en su última versión estable al momento de implementar.
   - **MUST:** Soportar React 18 implica usar `forwardRef` en componentes e iconos; `ref` como prop solo existe en React 19.
5. Registro público: npmjs.
6. Visibilidad del repositorio: público. Sin archivo `LICENSE`, el contenido es "todos los derechos reservados" hasta publicar la licencia.

### Pendientes

1. **Bloqueante para TASK-013:** procedencia y licencia de los 514 iconos.
   - Los nombres con errores heredados (`finger-cricle`, `money-recive`, `trush-square`) y el color `#292D32` coinciden con Iconsax (Vuesax).
   - Según el propietario, los SVG provienen de una copia de una librería de Figma Community publicada bajo CC BY 4.0. CC BY 4.0 es irrevocable para el material recibido y permite redistribución, adaptación y uso comercial con atribución.
   - Los términos actuales de iconsax.io prohíben la redistribución; no aplican a material recibido bajo CC BY 4.0 si el archivo fue publicado por el titular de los derechos.
   - Evidencia requerida antes de publicar: URL del archivo de Figma, cuenta publicadora (debe ser el titular, p. ej. Vuesax), licencia visible y fecha de la copia.
   - Condiciones de CC BY 4.0 a cumplir: crédito al autor, aviso de copyright y licencia, enlace a la licencia e indicación de modificaciones (p. ej. conversión a `currentColor`); no añadir términos que restrinjan esas libertades. Los SVG de iconos se distribuyen bajo CC BY 4.0, separados de la licencia del código.
   - Requiere revisión legal.
2. Navegadores mínimos soportados.
3. Formato de iconos sin framework: paquete Vanilla y/o Web Components.
