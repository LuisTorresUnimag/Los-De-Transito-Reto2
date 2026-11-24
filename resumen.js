/**
 * resumen.js
 * Agrupa reportes por cuadra, suma puntajes, ordena Top 5, aplica reglas de recomendación
 * y expone formateadores de etiquetas para popups y tablas (ResumenModule / ModuloResumen).
 */
(function (root) {
  'use strict';

  const ETIQUETAS_CATEGORIA = {
    doble_fila: 'Estacionamiento en vía prohibida o doble fila',
    bloqueo_rampa_cebra_paradero: 'Bloqueo de rampa peatonal, cebra o paradero',
    invasion_anden: 'Invasión de andén por comercio o mercancía'
  };

  const ETIQUETAS_ACTOR = {
    vehiculo_particular: 'Vehículo particular',
    motocicleta: 'Motocicleta',
    vehiculo_carga: 'Vehículo de carga descargando',
    mobiliario_comercial: 'Mobiliario comercial'
  };

  function formatearCategoria(categoria) {
    return ETIQUETAS_CATEGORIA[categoria] || categoria || 'Sin categoría';
  }

  function formatearActor(actor) {
    return ETIQUETAS_ACTOR[actor] || actor || 'Sin actor';
  }

  function aplicarReglaRecomendacion(grupo) {
    if (grupo.altosEnPico >= 3) {
      return {
        recomendacion: 'Patrullaje prioritario en hora pico',
        regla: 'Regla 1: 3 o más reportes de nivel Alto en hora pico'
      };
    }

    const total = grupo.cantidad;
    const invAnden = grupo.categorias.invasion_anden || 0;
    const carga = grupo.actores.vehiculo_carga || 0;

    if (total > 0 && invAnden / total >= 0.5) {
      return {
        recomendacion: 'Operativo de espacio público',
        regla: 'Regla 2: Predomina la invasión de andén (>= 50% de los reportes)'
      };
    }

    if (total > 0 && carga / total >= 0.5) {
      return {
        recomendacion: 'Revisar horario de cargue y descargue',
        regla: 'Regla 3: Predomina el vehículo de carga descargando (>= 50% de los reportes)'
      };
    }

    return {
      recomendacion: 'Control preventivo y señalización',
      regla: 'Regla 4: Reincidencia general acumulada en la cuadra'
    };
  }

  function generarResumenOperativo(reportes, vias, criterios) {
    if (!Array.isArray(reportes) || reportes.length === 0) return [];

    const calcFranja =
      typeof root.CriticidadModule !== 'undefined'
        ? root.CriticidadModule.determinarFranja
        : typeof require !== 'undefined'
          ? require('./criticidad.js').determinarFranja
          : () => 'valle';

    const grupos = new Map();

    for (const rep of reportes) {
      const id = rep.cuadra || 'SIN-CUADRA';
      if (!grupos.has(id)) {
        const infoVia = Array.isArray(vias) ? vias.find((v) => v.cuadra === id || v.id === id) : null;
        grupos.set(id, {
          cuadra: id,
          nombre: infoVia ? infoVia.nombre : id,
          sector: infoVia ? infoVia.sector : 'Sin sector',
          tipo_via: infoVia ? (infoVia.tipo_via || infoVia.tipo) : 'secundaria',
          puntajeTotal: 0,
          cantidad: 0,
          altosEnPico: 0,
          categorias: {},
          actores: {}
        });
      }

      const g = grupos.get(id);
      const puntaje = rep.criticidad ? rep.criticidad.puntaje : 0;
      const nivel = rep.criticidad ? rep.criticidad.nivel : 'Bajo';
      const franja =
        (rep.criticidad && rep.criticidad.franja) ||
        calcFranja(rep.fecha_hora, criterios ? criterios.horas_pico : []);

      g.puntajeTotal += puntaje;
      g.cantidad += 1;
      if (nivel === 'Alto' && franja === 'pico') {
        g.altosEnPico += 1;
      }

      g.categorias[rep.categoria] = (g.categorias[rep.categoria] || 0) + 1;
      g.actores[rep.actor] = (g.actores[rep.actor] || 0) + 1;
    }

    const lista = Array.from(grupos.values()).map((g) => {
      const { recomendacion, regla } = aplicarReglaRecomendacion(g);
      return {
        ...g,
        recomendacion,
        regla
      };
    });

    lista.sort((a, b) => b.puntajeTotal - a.puntajeTotal || b.cantidad - a.cantidad);
    return lista.slice(0, 5);
  }

  const api = {
    generarResumenOperativo,
    aplicarReglaRecomendacion,
    formatearCategoria,
    formatearActor
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.ResumenModule = api;
    root.ModuloResumen = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
