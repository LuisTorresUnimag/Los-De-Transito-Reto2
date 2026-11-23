# Control de mal parqueo e invasión del espacio público en Santa Marta

Prototipo web desarrollado para **Introducción a la Ingeniería de Sistemas (2026-2)** — Universidad del Magdalena (Reto No. 2).

## Integrantes y roles
- **[YEISON DAVID PEREZ GAMERO]** — Analista de campo y privacidad
- **[LUISA FERNANDA GOMEZ JIMENEZ]** — Integrador del mapa e instrucciones para la IA
- **[Luis Carlos Torres Avila]** — Ingeniero de lógica y clasificación
- **[SAMUEL ELIAS LUQUE RIVAS]** — Diseñador de interfaz y documentador

## Cómo abrir el proyecto
1. Descarga o clona este repositorio.
2. Abre la carpeta en VS Code y ejecuta **Live Server** sobre `index.html` (o publícalo directamente con **GitHub Pages**).
   > Nota: no lo abras con `file://` porque `fetch()` requiere un servidor HTTP local o GitHub Pages para leer `datos/*.json`.

## Estructura del proyecto
- `index.html`: Vista móvil de captura rápida (< 30 s) y tablero operativo.
- `styles.css`: Diseño adaptable a celular y estilos de impresión.
- `app.js`: Carga los archivos de `datos/`, combina con `localStorage` y actualiza el tablero.
- `captura.js`: Geolocalización, compresión de fotos a máximo 800 px de ancho y almacenamiento local.
- `criticidad.js`: Función pura que calcula puntaje y nivel (`Bajo`, `Medio`, `Alto`) a partir de `vias.json` y `criterios.json`.
- `filtros.js`: Función pura para filtrar reportes y calcular porcentajes por categoría.
- `resumen.js`: Agrupación por cuadra, Top 5 de criticidad acumulada y reglas explícitas de recomendación.
- `mapa.js`: Mapa base OpenStreetMap con Leaflet, capa de calor (`Leaflet.heat`) y puntos individuales.
- `datos/`: `vias.json`, `criterios.json` y `reportes.json` (30 registros iniciales de ejemplo listos para reemplazar por los de campo).
