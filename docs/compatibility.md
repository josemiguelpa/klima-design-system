# Estrategia de compatibilidad

## Principio

La compatibilidad es importante, pero no debe congelar la arquitectura nueva. Se conservarán contratos usados y verificables; no se prometerá compatibilidad con archivos internos no exportados.

## Repositorios anteriores

- No reciben nuevas funcionalidades salvo correcciones críticas durante la migración.
- Se mantienen disponibles hasta migrar los consumidores conocidos.
- La deprecación pública solo ocurre cuando existe guía, telemetría o inventario de adopción suficiente.

## CSS

Crear aliases deprecated cuando el significado sea equivalente:

```css
--brand-primary: var(--klima-color-action-primary);
```

No mapear automáticamente un nombre antiguo si su significado cambió. Registrar esos casos en una tabla de migración.

## TypeScript

- Mantener temporalmente formas snake_case como adapter si existen consumidores:

```ts
createTheme({ primary_color, secondary_color })
```

- La API nueva puede utilizar camelCase y un contrato más rico.
- Emitir warnings solo en desarrollo y únicamente cuando aporten una acción clara.

## Iconos

- Mantener aliases para nombres corregidos durante al menos un ciclo mayor.
- Ejemplo: exportar `FingerCricle` como alias deprecated de `FingerCircle`.
- Preservar el aspecto visual de iconos existentes salvo cambio explícito aprobado.
- Los logos deben separarse del catálogo de iconos funcionales cuando tengan reglas de color distintas.

## Componentes

El paquete UI experimental no se considera API legado porque no fue adoptado. Sus ideas pueden reutilizarse, pero no se requiere conservar su `Header` ni su estructura exacta.

## Matriz de migración

Antes del primer release estable, mantener un archivo generado o tabla con:

| Contrato anterior | Contrato nuevo | Estado | Retiro esperado |
| --- | --- | --- | --- |
| Variable CSS | Token Klima | compatible/deprecated/manual | versión |
| Import TS | Import nuevo | compatible/deprecated/manual | versión |
| Nombre de icono | Nombre corregido | alias/manual | versión |

## Versionado

- Iniciar paquetes nuevos en `0.x` mientras el contrato se valida con aplicaciones reales.
- No interpretar `0.x` como permiso para romper consumidores sin guía.
- Usar Changesets para toda modificación publicable.
