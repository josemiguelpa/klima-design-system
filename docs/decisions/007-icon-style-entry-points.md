# ADR-007: Un punto de entrada por estilo de icono

## Estado

Aceptado.

Modifica el criterio de aceptación de TASK-015 que esperaba `import { Search } from "@klima-ds/icons-react"`.

## Contexto

El archivo de Figma `Iconos` (`pbtOYKpfVOnSF30SJft7Hq`) organiza el catálogo en cinco estilos, uno por página:

| Estilo    | Página Figma       |
| --------- | ------------------ |
| `linear`  | `oficiales`        |
| `bold`    | `Rellenos - ready` |
| `twotone` | `Duo tono`         |
| `bulk`    | `Duo tono relleno` |
| `broken`  | `Broken`           |

Una aplicación suele usar uno o dos estilos. Una prop `variant` obligaría a incluir en el bundle los cinco estilos de cada icono importado.

## Decisión

1. Cada paquete de iconos publica un punto de entrada por estilo, sin punto de entrada raíz:

   ```ts
   import { SearchNormal } from "@klima-ds/icons-react/linear";
   import { SearchNormal as SearchNormalBold } from "@klima-ds/icons-react/bold";
   import SearchNormal from "@klima-ds/icons-react/linear/search-normal";
   ```

2. Dentro de un estilo, el nombre del componente es el mismo para todos los estilos; el consumidor usa alias de import cuando combina estilos.
3. Los subpaths por icono usan el nombre kebab-case corregido, por ejemplo `money-receive`.
4. Un estilo se añade a `exports` solo cuando su generación y sus pruebas existen.

## Consecuencias

- El bundle contiene solo los estilos e iconos importados; `fixtures/react-vite` lo verifica.
- Vue, Astro y Vanilla siguen el mismo esquema de rutas.
- Combinar estilos en un mismo archivo requiere alias de import.
