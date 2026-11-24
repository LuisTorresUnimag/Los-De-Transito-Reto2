/**
 * Módulo de Visualización Geográfica y Mapa de Calor - Observatorio Urbano Santa Marta
 * RF-03: Integración de Leaflet y Leaflet.heat con OpenStreetMap.
 */

const ModuloMapa = (() => {
  const CENTRO_SANTA_MARTA = [11.2458, -74.2059];
  const ZOOM_INICIAL = 17;

  const GRADIENTE_CALOR = {
    0.00: "rgba(37, 99, 235, 0)",
    0.15: "rgba(56, 189, 248, 0.45)",
    0.35: "rgba(34, 197, 94, 0.62)",
    0.55: "rgba(250, 204, 21, 0.78)",
    0.75: "rgba(249, 115, 22, 0.88)",
    0.90: "rgba(220, 38, 38, 0.94)",
    1.00: "rgba(153, 27, 27, 1.00)"
  };

  const COLORES_NIVEL = {
    alto: "#dc2626",
    medio: "#d97706",
    bajo: "#15803d"
  };

  let mapas = {
    principal: null,
    captura: null
  };

  let viasReferencia = [];
  let pinSeleccionRegistro = null;
  let temporizadorZoom = null;

  let mostrarMarcadores = true;
  let mostrarCalor = true;
  let mostrarCuadras = true;

  function crearInstanciaMapa(idContenedor) {
    const mapa = L.map(idContenedor, {
      center: CENTRO_SANTA_MARTA,
      zoom: ZOOM_INICIAL,
      minZoom: 12,
      maxZoom: 19,
      zoomControl: true
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(mapa);

    mapa.createPane("paneCuadras").style.zIndex = 380;
    mapa.createPane("panePuntos").style.zIndex = 460;
    mapa.createPane("paneEtiquetas").style.zIndex = 470;

    return mapa;
  }

  function parametrosCalor(zoom) {
    if (zoom >= 18) return { radius: 44, blur: 24 };
    if (zoom >= 17) return { radius: 40, blur: 22 };
    if (zoom >= 16) return { radius: 34, blur: 20 };
    if (zoom >= 15) return { radius: 28, blur: 16 };
    return { radius: 20, blur: 12 };
  }

  function inicializarPrincipal(idContenedor, vias, onPuntoClick) {
    viasReferencia = vias || [];

    if (mapas.principal && mapas.principal.mapa) {
      mapas.principal.mapa.remove();
    }

    const mapa = crearInstanciaMapa(idContenedor);
    const grupoMarcadores = L.layerGroup().addTo(mapa);
    const grupoVias = L.layerGroup().addTo(mapa);

    mapas.principal = {
      mapa: mapa,
      calor: null,
      marcadores: grupoMarcadores,
      vias: grupoVias,
      datosCalor: [],
      maxCalor: 18
    };

    dibujarCuadras(grupoVias);

    mapa.on("click", (e) => {
      if (typeof onPuntoClick === "function") {
        onPuntoClick(e.latlng);
      }
    });

    mapa.on("zoomend", () => {
      if (temporizadorZoom) clearTimeout(temporizadorZoom);
      temporizadorZoom = setTimeout(reconstruirCalor, 120);
    });

    enlazarControlesCapas();
  }

  function inicializarCaptura(idContenedor, vias, onPuntoClick) {
    viasReferencia = vias || [];

    if (mapas.captura && mapas.captura.mapa) {
      mapas.captura.mapa.remove();
    }

    const mapa = crearInstanciaMapa(idContenedor);
    const grupoVias = L.layerGroup().addTo(mapa);
    const grupoReferencia = L.layerGroup().addTo(mapa);

    mapas.captura = {
      mapa: mapa,
      vias: grupoVias,
      referencia: grupoReferencia
    };

    dibujarCuadras(grupoVias);

    mapa.on("click", (e) => {
      if (typeof onPuntoClick === "function") {
        onPuntoClick(e.latlng);
      }
    });
  }

  function dibujarCuadras(grupo) {
    if (!grupo) return;
    grupo.clearLayers();

    viasReferencia.forEach(via => {
      if (!via.coordenadas || via.coordenadas.length < 2) return;

      const tipo = via.tipo || via.tipo_via || "secundaria";
      const id = via.id || via.cuadra;
      const esArterial = tipo === "arterial";
      const polyline = L.polyline(via.coordenadas, {
        pane: "paneCuadras",
        color: esArterial ? "#1e3a8a" : "#475569",
        weight: esArterial ? 3.5 : 2,
        opacity: esArterial ? 0.38 : 0.26,
        dashArray: esArterial ? null : "5, 7"
      });

      polyline.bindTooltip(
        `<strong>${id}</strong><br><span style="font-size:11px;">${via.nombre} (${tipo.toUpperCase()})</span>`,
        { sticky: true, className: "tooltip-cuadra" }
      );

      grupo.addLayer(polyline);
    });
  }

  function enlazarControlesCapas() {
    const chkMarcadores = document.getElementById("toggle-capa-marcadores");
    const chkCalor = document.getElementById("toggle-capa-calor");
    const chkCuadras = document.getElementById("toggle-capa-cuadras");
    const btnSoloCalor = document.getElementById("btn-vista-solo-calor");
    const btnVistaCompleta = document.getElementById("btn-vista-completa");

    if (chkMarcadores) {
      chkMarcadores.checked = mostrarMarcadores;
      chkMarcadores.addEventListener("change", (e) => {
        mostrarMarcadores = e.target.checked;
        aplicarVisibilidad();
      });
    }

    if (chkCalor) {
      chkCalor.checked = mostrarCalor;
      chkCalor.addEventListener("change", (e) => {
        mostrarCalor = e.target.checked;
        aplicarVisibilidad();
      });
    }

    if (chkCuadras) {
      chkCuadras.checked = mostrarCuadras;
      chkCuadras.addEventListener("change", (e) => {
        mostrarCuadras = e.target.checked;
        aplicarVisibilidad();
      });
    }

    if (btnSoloCalor) {
      btnSoloCalor.addEventListener("click", () => {
        mostrarMarcadores = false;
        mostrarCalor = true;
        if (chkMarcadores) chkMarcadores.checked = false;
        if (chkCalor) chkCalor.checked = true;
        aplicarVisibilidad();
      });
    }

    if (btnVistaCompleta) {
      btnVistaCompleta.addEventListener("click", () => {
        mostrarMarcadores = true;
        mostrarCalor = true;
        mostrarCuadras = true;
        if (chkMarcadores) chkMarcadores.checked = true;
        if (chkCalor) chkCalor.checked = true;
        if (chkCuadras) chkCuadras.checked = true;
        aplicarVisibilidad();
      });
    }
  }

  function aplicarVisibilidad() {
    if (!mapas.principal || !mapas.principal.mapa) return;
    const inst = mapas.principal;

    alternarCapa(inst.mapa, inst.marcadores, mostrarMarcadores);
    alternarCapa(inst.mapa, inst.vias, mostrarCuadras);

    if (inst.calor) {
      if (mostrarCalor) {
        agregarCalorSiVisible();
      } else {
        alternarCapa(inst.mapa, inst.calor, false);
      }
    }
  }

  function alternarCapa(mapa, capa, visible) {
    if (!capa) return;
    if (visible) {
      if (!mapa.hasLayer(capa)) mapa.addLayer(capa);
    } else if (mapa.hasLayer(capa)) {
      mapa.removeLayer(capa);
    }
  }

  function crearPuntoReporte(reporte) {
    const nivel = (reporte.criticidad && reporte.criticidad.nivel) ? reporte.criticidad.nivel : "Medio";
    const puntaje = (reporte.criticidad && typeof reporte.criticidad.puntaje === "number")
      ? reporte.criticidad.puntaje : 0;
    const color = COLORES_NIVEL[nivel.toLowerCase()] || COLORES_NIVEL.medio;

    const punto = L.circleMarker([Number(reporte.lat), Number(reporte.lng)], {
      pane: "panePuntos",
      radius: 6,
      color: "#ffffff",
      weight: 1.8,
      opacity: 1,
      fillColor: color,
      fillOpacity: 1
    });

    punto.bindPopup(construirPopup(reporte), { maxWidth: 300, className: "popup-reporte" });
    punto.bindTooltip(`${reporte.id} · ${puntaje} pts`, {
      direction: "top",
      offset: [0, -7],
      opacity: 0.95,
      className: "tooltip-punto"
    });

    return punto;
  }

  function construirPopup(reporte) {
    const puntaje = (reporte.criticidad && typeof reporte.criticidad.puntaje === "number")
      ? reporte.criticidad.puntaje : 0;
    const nivel = (reporte.criticidad && reporte.criticidad.nivel) ? reporte.criticidad.nivel : "Medio";
    const nivelNorm = nivel.toLowerCase();

    const via = viasReferencia.find(v => (v.id || v.cuadra) === reporte.cuadra);
    const nombreVia = via ? via.nombre : reporte.cuadra;
    const tipoVia = via ? (via.tipo || via.tipo_via || "VÍA").toUpperCase() : "VÍA";

    let estiloBadge = "background-color:#fee2e2; color:#991b1b; border:1px solid #f87171;";
    if (nivelNorm === "medio") {
      estiloBadge = "background-color:#fef3c7; color:#92400e; border:1px solid #fcd34d;";
    } else if (nivelNorm === "bajo") {
      estiloBadge = "background-color:#dcfce7; color:#166534; border:1px solid #86efac;";
    }

    const origenBadge = reporte.origen === "ciudadano"
      ? '<span style="background-color:#e0e7ff; color:#3730a3; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:600;">CIUDADANO</span>'
      : '<span style="background-color:#f1f5f9; color:#334155; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:600;">CAMPO</span>';

    let fotoHtml = "";
    if (reporte.foto && reporte.foto.trim() !== "") {
      fotoHtml = `
        <div style="margin-top:8px; border-radius:4px; overflow:hidden; background:#f1f5f9; text-align:center;">
          <img src="${reporte.foto}" alt="Evidencia anonimizada" style="max-width:100%; max-height:140px; display:inline-block;" />
          <div style="font-size:9px; color:#64748b; padding:2px 0;">Evidencia anonimizada (sin placas ni rostros)</div>
        </div>`;
    }

    return `
      <div style="font-family: inherit; font-size:12px; line-height:1.4; min-width:220px; max-width:280px;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:6px; margin-bottom:6px;">
          <strong style="color:#0f172a; font-size:13px;">${reporte.id}</strong>
          <div style="display:flex; gap:4px; align-items:center;">
            ${origenBadge}
            <span style="display:inline-block; padding:2px 7px; border-radius:9999px; font-size:10px; font-weight:700; ${estiloBadge}">
              ${puntaje} pts · ${nivel}
            </span>
          </div>
        </div>

        <div style="margin-bottom:4px;">
          <span style="color:#64748b; font-size:11px;">Cuadra:</span>
          <div style="font-weight:600; color:#1e293b;">${reporte.cuadra} (${tipoVia})</div>
          <div style="font-size:10px; color:#64748b;">${nombreVia}</div>
        </div>

        <div style="margin-bottom:4px;">
          <span style="color:#64748b; font-size:11px;">Infracción:</span>
          <div style="font-weight:600; color:#0f172a;">${ModuloResumen.formatearCategoria(reporte.categoria)}</div>
        </div>

        <div style="margin-bottom:4px;">
          <span style="color:#64748b; font-size:11px;">Actor involucrado:</span>
          <div style="font-weight:600; color:#0f172a;">${ModuloResumen.formatearActor(reporte.actor)}</div>
        </div>

        <div style="font-size:10px; color:#64748b; margin-top:6px; border-top:1px dashed #e2e8f0; padding-top:4px; display:flex; justify-content:space-between; gap:6px;">
          <span>${reporte.fecha_hora.replace("T", " ")}</span>
          <span>${Number(reporte.lat).toFixed(4)}, ${Number(reporte.lng).toFixed(4)}</span>
        </div>

        ${fotoHtml}
      </div>`;
  }

  function agregarCalorSiVisible() {
    const inst = mapas.principal;
    if (!inst || !inst.mapa || !inst.calor) return;
    if (!mostrarCalor) return;

    const contenedor = inst.mapa.getContainer();
    if (contenedor.offsetWidth <= 0 || contenedor.offsetHeight <= 0) return;

    if (!inst.mapa.hasLayer(inst.calor)) {
      inst.calor.addTo(inst.mapa);
    }
  }

  function reconstruirCalor() {
    const inst = mapas.principal;
    if (!inst || !inst.mapa) return;

    if (inst.calor) {
      if (inst.mapa.hasLayer(inst.calor)) inst.mapa.removeLayer(inst.calor);
      inst.calor = null;
    }

    const puntos = inst.datosCalor || [];
    if (typeof L.heatLayer !== "function" || puntos.length === 0) return;

    const parametros = parametrosCalor(inst.mapa.getZoom());

    inst.calor = L.heatLayer(puntos, {
      radius: parametros.radius,
      blur: parametros.blur,
      maxZoom: 16,
      minOpacity: 0.38,
      max: inst.maxCalor || 18,
      gradient: GRADIENTE_CALOR
    });

    agregarCalorSiVisible();
  }

  function actualizarLeyendaCalor(foco) {
    const nota = document.getElementById("leyenda-calor-nota");
    if (!nota) return;

    if (!foco) {
      nota.textContent = "Sin incidentes para los filtros actuales.";
      return;
    }

    const detalle = document.createDocumentFragment();
    detalle.appendChild(document.createTextNode("Máximo del filtro: "));

    const valor = document.createElement("strong");
    valor.textContent = `${foco.puntos} pts`;
    detalle.appendChild(valor);

    detalle.appendChild(document.createTextNode(" · "));

    const cuadra = document.createElement("strong");
    cuadra.textContent = foco.id;
    detalle.appendChild(cuadra);

    detalle.appendChild(document.createTextNode(
      ` (${foco.count} reporte${foco.count === 1 ? "" : "s"})`
    ));

    nota.replaceChildren(detalle);
  }

  function crearEtiquetaFoco(foco) {
    const icono = L.divIcon({
      className: "etiqueta-foco",
      html: `
        <div class="foco-chip">
          <span class="foco-chip-punto" aria-hidden="true"></span>
          Foco · ${foco.id}
          <span class="foco-chip-pts">${foco.puntos} pts</span>
        </div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });

    return L.marker([foco.lat, foco.lng], {
      icon: icono,
      interactive: false,
      keyboard: false,
      pane: "paneEtiquetas"
    });
  }

  function actualizarDatos(reportes) {
    const lista = Array.isArray(reportes) ? reportes : [];

    if (mapas.principal && mapas.principal.mapa) {
      const inst = mapas.principal;
      inst.marcadores.clearLayers();

      if (inst.calor) {
        if (inst.mapa.hasLayer(inst.calor)) inst.mapa.removeLayer(inst.calor);
        inst.calor = null;
      }

      const puntosCalor = [];
      const gruposPorCuadra = {};

      lista.forEach(reporte => {
        const lat = Number(reporte.lat);
        const lng = Number(reporte.lng);
        if (!isFinite(lat) || !isFinite(lng)) return;

        const puntaje = (reporte.criticidad && typeof reporte.criticidad.puntaje === "number")
          ? reporte.criticidad.puntaje : 5;

        puntosCalor.push([lat, lng, Math.max(1, puntaje)]);
        inst.marcadores.addLayer(crearPuntoReporte(reporte));

        if (!gruposPorCuadra[reporte.cuadra]) {
          gruposPorCuadra[reporte.cuadra] = {
            count: 0,
            puntos: 0,
            sumaLat: 0,
            sumaLng: 0
          };
        }
        const grupo = gruposPorCuadra[reporte.cuadra];
        grupo.count++;
        grupo.puntos += puntaje;
        grupo.sumaLat += lat;
        grupo.sumaLng += lng;
      });

      const idsCuadras = Object.keys(gruposPorCuadra);
      idsCuadras.forEach(id => {
        const grupo = gruposPorCuadra[id];
        grupo.id = id;
        grupo.lat = grupo.sumaLat / grupo.count;
        grupo.lng = grupo.sumaLng / grupo.count;
      });

      const sumaMaxima = idsCuadras.reduce(
        (mayor, id) => Math.max(mayor, gruposPorCuadra[id].puntos), 0
      );
      // Escala balanceada para que el calor se vea nítido en todas las cuadras
      // y el rojo intenso destaque en los focos de mayor reincidencia
      inst.maxCalor = Math.max(9, Math.min(28, Math.round(sumaMaxima * 0.25)));

      inst.datosCalor = puntosCalor;
      reconstruirCalor();

      const foco = idsCuadras
        .map(id => gruposPorCuadra[id])
        .sort((a, b) => b.puntos - a.puntos)[0] || null;

      actualizarLeyendaCalor(foco);

      if (foco && foco.count >= 2) {
        inst.marcadores.addLayer(crearEtiquetaFoco(foco));
      }

      aplicarVisibilidad();
    }

    if (mapas.captura && mapas.captura.mapa) {
      const inst = mapas.captura;
      inst.referencia.clearLayers();

      lista.forEach(reporte => {
        const lat = Number(reporte.lat);
        const lng = Number(reporte.lng);
        if (!isFinite(lat) || !isFinite(lng)) return;

        const puntaje = (reporte.criticidad && typeof reporte.criticidad.puntaje === "number")
          ? reporte.criticidad.puntaje : 5;
        const nivel = (reporte.criticidad && reporte.criticidad.nivel) ? reporte.criticidad.nivel : "Medio";
        const color = COLORES_NIVEL[nivel.toLowerCase()] || COLORES_NIVEL.medio;

        L.circleMarker([lat, lng], {
          radius: 5,
          color: "#ffffff",
          weight: 1.5,
          fillColor: color,
          fillOpacity: 0.85
        })
          .bindTooltip(`${reporte.id} · ${puntaje} pts (${nivel})`, { direction: "top" })
          .addTo(inst.referencia);
      });
    }
  }

  function fijarPuntoRegistro(lat, lng) {
    if (!mapas.captura || !mapas.captura.mapa) return;
    const mapa = mapas.captura.mapa;

    if (pinSeleccionRegistro) {
      mapa.removeLayer(pinSeleccionRegistro);
    }

    const iconoSeleccion = L.divIcon({
      className: "pin-seleccion-nuevo",
      html: `
        <div style="
          background-color:#1f5fd6; width:30px; height:30px;
          border-radius:50% 50% 50% 0; transform:rotate(-45deg);
          border:3px solid #fff; box-shadow:0 4px 12px rgba(16,44,71,0.45);
          display:flex; align-items:center; justify-content:center;">
          <span style="transform:rotate(45deg); width:8px; height:8px; border-radius:50%; background:#fff; display:block;"></span>
        </div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30]
    });

    pinSeleccionRegistro = L.marker([lat, lng], {
      icon: iconoSeleccion,
      zIndexOffset: 1000
    }).addTo(mapa);

    mapa.panTo([lat, lng]);
  }

  function limpiarPuntoRegistro() {
    if (pinSeleccionRegistro && mapas.captura && mapas.captura.mapa) {
      mapas.captura.mapa.removeLayer(pinSeleccionRegistro);
    }
    pinSeleccionRegistro = null;
  }

  function invalidarTamano() {
    Object.keys(mapas).forEach(clave => {
      const inst = mapas[clave];
      if (!inst || !inst.mapa) return;

      setTimeout(() => {
        const contenedor = inst.mapa.getContainer();
        const visible = contenedor.offsetWidth > 0 && contenedor.offsetHeight > 0;

        if (visible) {
          inst.mapa.invalidateSize();
          if (clave === "principal") agregarCalorSiVisible();
        } else if (clave === "principal" && inst.calor && inst.mapa.hasLayer(inst.calor)) {
          inst.mapa.removeLayer(inst.calor);
        }
      }, 220);
    });
  }

  return {
    inicializarPrincipal,
    inicializarCaptura,
    actualizarDatos,
    fijarPuntoRegistro,
    limpiarPuntoRegistro,
    invalidarTamano
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = ModuloMapa;
}

if (typeof window !== "undefined") {
  window.ModuloMapa = ModuloMapa;
}
