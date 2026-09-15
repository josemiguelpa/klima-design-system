# ADR-003: Paquetes por responsabilidad y framework

## Estado

Aceptado.

## Decisión

Separar tokens, temas, runtime, shadcn, React UI e iconos por framework. No publicar un único paquete que obligue a Vue o Astro a instalar React.

## Motivos

- Mejor aislamiento de dependencias.
- Releases y bundles más pequeños.
- Tree-shaking verificable.
- Permite evolucionar cada framework según demanda.

## Consecuencias

- Existen más paquetes, pero con contratos pequeños.
- La configuración de Changesets debe gestionar dependencias internas.
- Se requieren fixtures por framework.
