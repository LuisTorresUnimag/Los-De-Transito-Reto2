/**
 * captura.js
 * Manejo del formulario rápido de captura (< 30 s), geolocalización,
 * compresión de imagen (máximo 800 px de ancho) y guardado en localStorage.
 */
(function (root) {
  'use strict';

  const STORAGE_KEY = 'mal_parqueo_reportes_v1';

  function obtenerFechaHoraLocalISO() {
    const ahora = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return (
      ahora.getFullYear() +
      '-' +
      pad(ahora.getMonth() + 1) +
      '-' +
      pad(ahora.getDate()) +
      'T' +
      pad(ahora.getHours()) +
      ':' +
      pad(ahora.getMinutes())
    );
  }

  function encontrarCuadraMasCercana(lat, lng, vias) {
    if (!Array.isArray(vias) || vias.length === 0) return '';
    let mejor = vias[0].cuadra;
    let minDist = Infinity;
    for (const v of vias) {
      const d = Math.hypot(v.lat - lat, v.lng - lng);
      if (d < minDist) {
        minDist = d;
        mejor = v.cuadra;
      }
    }
    return mejor;
  }

  function comprimirImagen(file, maxAncho = 800, calidad = 0.72) {
    return new Promise((resolve, reject) => {
      if (!file) {
        resolve('');
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Archivo de imagen inválido.'));
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxAncho) {
            height = Math.round((height * maxAncho) / width);
            width = maxAncho;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', calidad));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function cargarReportesLocales() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function guardarReportesLocales(lista) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
  }

  function crearNuevoReporte({ lat, lng, cuadra, categoria, actor, fotoBase64, vias, criterios }) {
    const id = 'MP-' + Date.now().toString(36).toUpperCase();
    const fecha_hora = obtenerFechaHoraLocalISO();
    const base = {
      id,
      origen: 'ciudadano',
      fecha_hora,
      lat: Number(lat),
      lng: Number(lng),
      cuadra,
      categoria,
      actor,
      foto: fotoBase64 || ''
    };
    const crit = root.CriticidadModule.calcularCriticidad(base, vias, criterios);
    base.criticidad = {
      puntaje: crit.puntaje,
      nivel: crit.nivel,
      franja: crit.franja
    };
    return base;
  }

  root.CapturaModule = {
    STORAGE_KEY,
    obtenerFechaHoraLocalISO,
    encontrarCuadraMasCercana,
    comprimirImagen,
    cargarReportesLocales,
    guardarReportesLocales,
    crearNuevoReporte
  };
})(typeof window !== 'undefined' ? window : globalThis);
