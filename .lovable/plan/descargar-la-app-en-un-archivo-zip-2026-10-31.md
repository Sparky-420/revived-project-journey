# Descargar la app en un archivo ZIP

Crear un archivo ZIP con todo el código de Don Cangrejo Pro y dejarlo en tus Archivos para que lo descargues.

## Qué incluye
- Todo el código de la app (las 5 secciones, estilos, recetas y cálculos).
- Archivos de configuración necesarios para instalarla y ejecutarla.
- Las pruebas de las recetas.

## Qué no incluye
- Carpetas que se regeneran solas (dependencias instaladas, compilaciones).
- Datos internos de control de versiones.

## Detalles técnicos
- Copiar en /tmp/don-cangrejo-pro solo el código fuente (src, public, package.json, bun.lock, configs, README, AGENTS.md), sin node_modules, dist, .output, .git.
- Revisar el listado completo, crear el ZIP en /tmp, inspeccionar entradas y copiarlo a /mnt/documents/don-cangrejo-pro.zip.
