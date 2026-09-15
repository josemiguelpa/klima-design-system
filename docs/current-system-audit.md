# Auditoría de sistemas existentes

## 1. Paquete de tokens y temas

### Fortalezas

- Separación inicial entre tokens, temas, shadcn y runtime.
- Export map existente.
- Bundle ESM/CJS para TypeScript.
- Typecheck y compilación TS exitosos durante la auditoría.
- 265 variables CSS; no se detectaron referencias `var()` internas inexistentes.
- Historial de compatibilidad documentado.

### Hallazgos

1. Los exports `./tailwind` y `./tailwind/preset` apuntan a `dist/preset.*`, pero tsup genera `dist/tailwind/preset.*`.
2. `main`, `module` y `types` repiten los paths incorrectos.
3. El CSS raíz incorpora tokens, temas y utilities, incluyendo `.bg-pattern` y `.font-poppins`.
4. El tema dark añade estilos globales de scrollbar.
5. El adaptador shadcn modifica selectores globales como `*` y `body`.
6. Primitivas, semánticos y tokens de componente están mezclados.
7. El runtime acepta colores inválidos y los convierte silenciosamente en negro.
8. El foreground se decide con `isLight()`, no con contraste WCAG; se observaron combinaciones inferiores a 4.5:1.
9. La generación white-label está acoplada a aliases shadcn.
10. Los scripts `rm`, `mkdir` y `cp` no son portables a Windows.
11. El paquete es `UNLICENSED` y está configurado para GitHub Packages privado.
12. No hay suite de tests, fixtures de consumo ni validación de paquete publicado.

## 2. Monorepo de iconos y componentes

### Fortalezas reutilizables

- pnpm workspace funcional.
- Configuración sencilla de Turborepo.
- Changesets y workflows de CI/release.
- SVG como fuente única.
- Generación para Vanilla, React, Vue y Astro.
- Los 514 SVG tienen `viewBox`.
- Los componentes React aceptan props SVG y `ref` según el modelo de React 19.

### Hallazgos de iconos

1. El diseño técnico promete SVGO y AST, pero el generador actual usa reemplazos con expresiones regulares.
2. 471 de 514 SVG conservan strokes hardcodeados en la fuente; se normalizan durante el build.
3. Cuatro SVG contienen fills hardcodeados que requieren revisión manual.
4. Hay nombres con errores heredados, por ejemplo `finger-cricle`, `money-recive` y `trush-square`.
5. El paquete único declara React como peer dependency, incluso para consumidores Vue, Astro o Vanilla.
6. Solo existen entrypoints agregados por framework; no hay subpaths por icono.
7. No se declara `sideEffects: false` ni existen pruebas de tree-shaking.
8. Los barrel files exportan los 514 iconos; el tree-shaking depende completamente del bundler consumidor.
9. El paquete no limita claramente los archivos publicados; tarballs históricos incluyen fuentes, scripts y logs de Turbo.
10. No hay tests del generador ni fixtures de consumo por framework.
11. En Astro y otros targets debe verificarse el orden de atributos para que props del consumidor no sean sobreescritas por atributos estáticos.
12. Los nombres y el color original `#292D32` sugieren que parte del catálogo podría provenir de una colección externa. Esto no prueba su origen, pero exige revisar procedencia y licencia antes de publicación pública.

### Hallazgos de UI

- Solo existe `Header` con subcomponentes `Logo`, `Nav` y `Actions`.
- La composición y desacoplamiento de Zustand/router son ideas válidas.
- La implementación depende de clases Tailwind presentes dentro del bundle JS.
- `styles.css` solo importa Tailwind; no entrega CSS de componentes realmente compilado.
- No hay tests, Storybook ni validación accesible.
- El componente no fue adoptado y no debe tratarse como contrato legado.

## 3. Auditoría de Figma

- Colección `primitivas`: 46 variables y un modo.
- Colección `semanticas`: 138 variables con Light/Dark.
- Solo una parte de los valores semánticos usa aliases; muchos valores están duplicados directamente.
- Colecciones adicionales de tipografía y foundations.
- Aproximadamente 47 componentes o component sets.
- Variantes con nombres genéricos como `Property 1`.
- Componentes duplicados, incluyendo más de un set de Icon Button.
- Descripciones ausentes y mezcla de idiomas.
- Figma contiene colores para Solé y varias marcas del conglomerado que el código anterior no representa completamente.
- El código usa Poppins, mientras el archivo actualizado parece expresar Montserrat.

## Conclusión

Los repos anteriores contienen activos y aprendizaje valiosos, pero también deuda experimental. Deben ser entradas de migración verificadas, no la arquitectura del producto nuevo.
