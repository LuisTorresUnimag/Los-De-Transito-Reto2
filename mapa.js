/**
 * mapa.js
 * Mapa base OpenStreetMap con Leaflet, capa de calor (Leaflet.heat)
 * y capa de puntos individuales con popups informativos.
 */
(function (root) {
  'use strict';

  const ETIQUETAS_CATEGORIA = {
    doble_fila: 'Estacionamiento en vía prohibida / doble fila',
    bloqueo_rampa_cebra_paradero: 'Bloqueo de rampa, cebra o paradero',
    invasion_anden: 'Invasión de andén por comercio o mercancía'
  };

  const ETIQUETAS_ACTOR = {
    vehiculo_particular: 'Vehículo particular',
    motocicleta: 'Motocicleta',
    vehiculo_carga: 'Vehículo de carga descargando',
    mobiliario_comercial: 'Mobiliario comercial'
  };

  let map = null;
  let heatLayer = null;
  let markersLayer = null;
  let captureMap = null;
  let captureMarker = null;

  function colorPorNivel(nivel) {
    if (nivel === 'Alto') return '#dc2626';
    if (nivel === 'Medio') return '#d97706';
    return '#16a34a';
  }

  function inicializarMapaTablero(containerId) {
    if (map) {
      map.invalidateSize();
      return map;
    }
    map = L.map(containerId).setView([11.2438, -74.2090], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
    return map;
  }

  function actualizarCapasMapa(reportes, mostrarCalor, mostrarPuntos) {
    if (!map) return;

    if (heatLayer) {
      map.removeLayer(heatLayer);
      heatLayer = null;
    }
    if (markersLayer) {
      markersLayer.clearLayers();
    }

    if (mostrarCalor && typeof L.heatLayer === 'function' && reportes.length > 0) {
      const heatPoints = reportes.map((r) => {
        const puntaje = r.criticidad ? r.criticidad.puntaje : 1;
        return [r.lat, r.lng, Math.max(0.2, puntaje / 9)];
      });
      heatLayer = L.heatLayer(heatPoints, {
        radius: 28,
        blur: 20,
        maxZoom: 17,
        gradient: { 0.3: '#22c55e', 0.6: '#f59e0b', 1.0: '#dc2626' }
      }).addTo(map);
    }

    if (mostrarPuntos && markersLayer) {
      for (const r of reportes) {
        const nivel = r.criticidad ? r.criticidad.nivel : 'Bajo';
        const puntaje = r.criticidad ? r.criticidad.puntaje : 0;
        const color = colorPorNivel(nivel);

        const marker = L.circleMarker([r.lat, r.lng], {
          radius: 7,
          fillColor: color,
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9
        });

        const fotoHtml =
          r.foto && r.foto.startsWith('data:image')
            ? `<img src="${r.foto}" alt="Evidencia" style="width:100%;max-width:200px;border-radius:6px;margin-top:6px;">`
            : '';

        marker.bindPopup(`
          <div style="font-family:sans-serif;font-size:13px;min-width:190px;">
            <strong>${r.id}</strong> · <span style="color:${color};font-weight:700;">${nivel} (${puntaje} pts)</span><br>
            <b>Cuadra:</b> ${r.cuadra}<br>
            <b>Fecha/Hora:</b> ${r.fecha_hora.replace('T', ' ')}<br>
            <b>Categoría:</b> ${ETIQUETAS_CATEGORIA[r.categoria] || r.categoria}<br>
            <b>Actor:</b> ${ETIQUETAS_ACTOR[r.actor] || r.actor}
            ${fotoHtml}
          </div>
        `);
        marker.addTo(markersLayer);
      }
    }
  }

  function inicializarMapaCaptura(containerId, onSelectCoords) {
    if (captureMap) {
      captureMap.invalidateSize();
      return captureMap;
    }
    captureMap = L.map(containerId).setView([11.2438, -74.2090], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(captureMap);

    captureMap.on('click', (e) => {
      fijarMarcadorCaptura(e.latlng.lat, e.latlng.lng);
      if (typeof onSelectCoords === 'function') {
        onSelectCoords(e.latlng.lat, e.latlng.lng);
      }
    });
    return captureMap;
  }

  function fijarMarcadorCaptura(lat, lng) {
    if (!captureMap) return;
    if (captureMarker) {
      captureMarker.setLatLng([lat, lng]);
    } else {
      captureMarker = L.marker([lat, lng]).addTo(captureMap);
    }
    captureMap.setView([lat, lng], 17);
  }

  root.MapaModule = {
    inicializarMapaTablero,
    actualizarCapasMapa,
    inicializarMapaCaptura,
    fijarMarcadorCaptura,
    ETIQUETAS_CATEGORIA,
    ETIQUETAS_ACTOR
  };
})(typeof window !== 'undefined' ? window : globalThis);
