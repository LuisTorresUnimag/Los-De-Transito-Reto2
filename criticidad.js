/**
 * criticidad.js
 * Módulo puro para calcular el puntaje y nivel de criticidad de un reporte.
 * No toca el DOM ni el mapa, por lo que puede probarse de forma independiente.
 */
(function (root) {
  'use strict';

  function extraerMinutos(fechaHora) {
    if (!fechaHora || typeof fechaHora !== 'string') return 0;
    const partes = fechaHora.split('T');
    if (partes.length < 2) return 0;
    const [hh, mm] = partes[1].slice(0, 5).split(':').map(Number);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return 0;
    return hh * 60 + mm;
  }

  function aMinutos(hhmm) {
    const [hh, mm] = hhmm.split(':').map(Number);
    return hh * 60 + mm;
  }

  function determinarFranja(fechaHora, horasPico) {
    const mins = extraerMinutos(fechaHora);
    const rangos = Array.isArray(horasPico) ? horasPico : [];
    for (const rango of rangos) {
      const [inicio, fin] = rango.split('-');
      if (!inicio || !fin) continue;
      if (mins >= aMinutos(inicio) && mins <= aMinutos(fin)) {
        return 'pico';
      }
    }
    return 'valle';
  }

  function obtenerTipoVia(cuadraId, vias) {
    if (!Array.isArray(vias)) return 'secundaria';
    const encontrada = vias.find((v) => v.cuadra === cuadraId);
    return encontrada ? encontrada.tipo_via : 'secundaria';
  }

  function determinarNivel(puntaje, niveles) {
    if (!niveles) return 'Bajo';
    for (const [nombre, rango] of Object.entries(niveles)) {
      if (Array.isArray(rango) && puntaje >= rango[0] && puntaje <= rango[1]) {
        return nombre;
      }
    }
    return puntaje >= 7 ? 'Alto' : puntaje >= 5 ? 'Medio' : 'Bajo';
  }

  function calcularCriticidad(reporte, vias, criterios) {
    const tipoVia = obtenerTipoVia(reporte.cuadra, vias);
    const franja = determinarFranja(reporte.fecha_hora, criterios.horas_pico);

    const ptsCategoria = (criterios.categoria && criterios.categoria[reporte.categoria]) || 0;
    const ptsVia = (criterios.via && criterios.via[tipoVia]) || 0;
    const ptsFranja = (criterios.franja && criterios.franja[franja]) || 0;

    const puntaje = ptsCategoria + ptsVia + ptsFranja;
    const nivel = determinarNivel(puntaje, criterios.niveles);

    return {
      puntaje,
      nivel,
      franja,
      tipo_via: tipoVia,
      desglose: {
        categoria: ptsCategoria,
        via: ptsVia,
        franja: ptsFranja
      }
    };
  }

  const api = {
    calcularCriticidad,
    determinarFranja,
    obtenerTipoVia,
    determinarNivel
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.CriticidadModule = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
