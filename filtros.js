/**
 * filtros.js
 * Módulo puro para filtrar reportes por sector, cuadra, franja horaria, categoría y actor.
 */
(function (root) {
  'use strict';

  function obtenerSectorDeCuadra(cuadraId, vias) {
    if (!Array.isArray(vias)) return '';
    const v = vias.find((item) => item.cuadra === cuadraId);
    return v ? v.sector : '';
  }

  function filtrarReportes(reportes, filtrosActivos, vias, criterios) {
    if (!Array.isArray(reportes)) return [];
    const f = filtrosActivos || {};
    const calcFranja =
      typeof root.CriticidadModule !== 'undefined'
        ? root.CriticidadModule.determinarFranja
        : typeof require !== 'undefined'
          ? require('./criticidad.js').determinarFranja
          : () => 'valle';

    return reportes.filter((rep) => {
      if (f.sector && f.sector !== 'todos') {
        const sector = obtenerSectorDeCuadra(rep.cuadra, vias);
        if (sector !== f.sector) return false;
      }
      if (f.cuadra && f.cuadra !== 'todas' && rep.cuadra !== f.cuadra) {
        return false;
      }
      if (f.franja && f.franja !== 'todas') {
        const franja =
          (rep.criticidad && rep.criticidad.franja) ||
          calcFranja(rep.fecha_hora, criterios ? criterios.horas_pico : []);
        if (franja !== f.franja) return false;
      }
      if (f.categoria && f.categoria !== 'todas' && rep.categoria !== f.categoria) {
        return false;
      }
      if (f.actor && f.actor !== 'todos' && rep.actor !== f.actor) {
        return false;
      }
      return true;
    });
  }

  function calcularConteosPorCategoria(reportes) {
    const total = reportes.length;
    const conteos = {
      doble_fila: 0,
      bloqueo_rampa_cebra_paradero: 0,
      invasion_anden: 0
    };
    for (const r of reportes) {
      if (Object.prototype.hasOwnProperty.call(conteos, r.categoria)) {
        conteos[r.categoria] += 1;
      }
    }
    const porcentajes = {};
    for (const [k, v] of Object.entries(conteos)) {
      porcentajes[k] = total > 0 ? Math.round((v / total) * 100) : 0;
    }
    return { total, conteos, porcentajes };
  }

  const api = {
    filtrarReportes,
    calcularConteosPorCategoria
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.FiltrosModule = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
