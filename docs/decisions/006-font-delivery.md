# ADR-006: Las aplicaciones cargan las fuentes tipográficas

## Estado

Aceptado.

## Contexto

ADR-005 define tokens de tipografía y establece que la familia tipográfica es una primitiva de marca, por ejemplo Be Vietnam Pro para Klima y Montserrat para Solé. Un token solo nombra la familia; el navegador necesita además los archivos de fuente para mostrarla.

Se evaluaron tres alternativas:

- que el paquete incluya los archivos de fuente;
- que el paquete publique un CSS opcional que importe Fontsource;
- que cada aplicación cargue las fuentes.

## Decisión

1. Los paquetes `@klima-ds/*` no incluyen archivos de fuente (`.woff2`, `.woff`, `.ttf`) ni reglas `@font-face`.
2. Los paquetes `@klima-ds/*` no dependen de proveedores de fuentes como Fontsource o Google Fonts.
3. El CSS generado declara la familia mediante variables, con un stack de respaldo explícito:

   ```css
   [data-brand="klima"] {
     --klima-font-family-base: "Be Vietnam Pro", system-ui, sans-serif;
   }
   ```

4. Cada aplicación descarga y carga las fuentes de su marca activa con el mecanismo que prefiera: `next/font`, Fontsource, archivos propios o un CDN. El nombre registrado en `@font-face` debe coincidir exactamente con el declarado en el token.
5. El sistema de diseño documenta, por marca, qué familias, pesos y estilos requieren sus tokens de tipografía. Esa información se deriva de los tokens para que no se desincronice.

## Fuentes requeridas por marca

| Marca | Familia        | Pesos              | Estilos             | Fuente del dato                                  |
| ----- | -------------- | ------------------ | ------------------- | ------------------------------------------------ |
| Klima | Be Vietnam Pro | 300, 400, 500, 600 | normal, itálica 400 | Figma `Sistema de diseño KLIMA`, nodo `251:2478` |
| Solé  | Montserrat     | Por confirmar      | Por confirmar       | Pendiente                                        |

## Ejemplos de carga en una aplicación

Fontsource con cualquier bundler:

```ts
import "@fontsource/be-vietnam-pro/300.css";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/400-italic.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
```

Next.js con `next/font`, conectando la fuente a la variable del sistema:

```tsx
import { Be_Vietnam_Pro } from "next/font/google";

const font = Be_Vietnam_Pro({
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-klima",
});
```

```css
[data-brand="klima"] {
  --klima-font-family-base: var(--font-klima), system-ui, sans-serif;
}
```

## Motivos

- Cada aplicación elige la estrategia de carga óptima para su framework, como la precarga y el ajuste de métricas de `next/font`.
- Los paquetes son más livianos y no fuerzan descargas de fuentes que la aplicación ya gestiona.
- Los paquetes no redistribuyen archivos de fuente y no asumen obligaciones de licencia por ellos.
- Una aplicación que usa una sola marca no recibe fuentes de otras marcas.

## Consecuencias

- Si una aplicación no carga la fuente, el texto se muestra con el stack de respaldo sin error visible. La documentación de instalación debe incluir este paso como obligatorio.
- La aplicación es responsable de cumplir la licencia de la fuente que descarga. Be Vietnam Pro y Montserrat se distribuyen bajo SIL Open Font License 1.1; hay que verificarlo al documentar cada marca.
- Las fixtures de consumo cargan las fuentes por su cuenta, igual que una aplicación real, y verifican que el nombre de familia coincide con el token.
- Storybook carga las fuentes de todas las marcas que documenta.
- Esta decisión puede revisarse si varias aplicaciones repiten la misma configuración; publicar un CSS opcional de fuentes sería un cambio compatible.
- La nota de `docs/project-context.md` sobre incluir la OFL sigue aplicando solo si en el futuro un paquete distribuye archivos de fuente.
