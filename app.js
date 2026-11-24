/**
 * app.js
 * Controlador principal: carga los JSON de datos/, combina con localStorage,
 * recalcula la criticidad con criterios.json y coordina ModuloMapa con las vistas.
 */
(function () {
  'use strict';

  const estado = {
    vias: [],
    criterios: null,
    reportesBase: [],
    reportesLocales: [],
    reportesTotales: [],
    fotoComprimida: '',
    tableroInicializado: false
  };

  async function cargarDatosIniciales() {
    const [resVias, resCriterios, resReportes] = await Promise.all([
      fetch('datos/vias.json'),
      fetch('datos/criterios.json'),
      fetch('datos/reportes.json')
    ]);

    if (!resVias.ok || !resCriterios.ok || !resReportes.ok) {
      throw new Error('No se pudieron cargar los archivos JSON de datos/.');
    }

    estado.vias = await resVias.json();
    estado.criterios = await resCriterios.json();
    estado.reportesBase = await resReportes.json();
    estado.reportesLocales = window.CapturaModule.cargarReportesLocales();

    combinarYRecalcular();
    poblarSelectores();
    inicializarEventos();

    // Mostrar puntos de referencia también en el mapa de captura
    window.ModuloMapa.actualizarDatos(estado.reportesTotales);
  }

  function combinarYRecalcular() {
    const mapaPorId = new Map();
    for (const r of estado.reportesBase) {
      mapaPorId.set(r.id, r);
    }
    for (const r of estado.reportesLocales) {
      mapaPorId.set(r.id, r);
    }

    estado.reportesTotales = Array.from(mapaPorId.values()).map((rep) => {
      const crit = window.CriticidadModule.calcularCriticidad(rep, estado.vias, estado.criterios);
      return {
        ...rep,
        criticidad: {
          puntaje: crit.puntaje,
          nivel: crit.nivel,
          franja: crit.franja
        }
      };
    });
  }

  function poblarSelectores() {
    const selectCuadraCaptura = document.getElementById('captura-cuadra');
    const selectCuadraFiltro = document.getElementById('filtro-cuadra');
    const selectSectorFiltro = document.getElementById('filtro-sector');

    const sectores = new Set();
    selectCuadraCaptura.innerHTML = '<option value="">Selecciona una cuadra...</option>';
    selectCuadraFiltro.innerHTML = '<option value="todas">Todas las cuadras</option>';

    for (const v of estado.vias) {
      sectores.add(v.sector);
      const idCuadra = v.cuadra || v.id;
      const opt1 = document.createElement('option');
      opt1.value = idCuadra;
      opt1.textContent = `${idCuadra} — ${v.nombre}`;
      selectCuadraCaptura.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = idCuadra;
      opt2.textContent = `${idCuadra} (${v.sector})`;
      selectCuadraFiltro.appendChild(opt2);
    }

    selectSectorFiltro.innerHTML = '<option value="todos">Todos los sectores</option>';
    for (const sec of sectores) {
      const opt = document.createElement('option');
      opt.value = sec;
      opt.textContent = sec;
      selectSectorFiltro.appendChild(opt);
    }
  }

  function obtenerFiltrosActivos() {
    return {
      sector: document.getElementById('filtro-sector').value,
      cuadra: document.getElementById('filtro-cuadra').value,
      franja: document.getElementById('filtro-franja').value,
      categoria: document.getElementById('filtro-categoria').value,
      actor: document.getElementById('filtro-actor').value
    };
  }

  function renderizarTablero() {
    const filtros = obtenerFiltrosActivos();
    const filtrados = window.FiltrosModule.filtrarReportes(
      estado.reportesTotales,
      filtros,
      estado.vias,
      estado.criterios
    );

    const stats = window.FiltrosModule.calcularConteosPorCategoria(filtrados);
    document.getElementById('kpi-total').textContent = stats.total;
    document.getElementById('kpi-doble-fila').textContent = `${stats.porcentajes.doble_fila}%`;
    document.getElementById('kpi-bloqueo').textContent = `${stats.porcentajes.bloqueo_rampa_cebra_paradero}%`;
    document.getElementById('kpi-anden').textContent = `${stats.porcentajes.invasion_anden}%`;

    if (!estado.tableroInicializado) {
      window.ModuloMapa.inicializarPrincipal('mapa-tablero', estado.vias, null);
      estado.tableroInicializado = true;
    }
    window.ModuloMapa.actualizarDatos(filtrados);

    renderizarResumenOperativo(filtrados);
  }

  function renderizarResumenOperativo(reportes) {
    const top5 = window.ResumenModule.generarResumenOperativo(
      reportes,
      estado.vias,
      estado.criterios
    );
    const tbody = document.getElementById('tabla-resumen-body');
    tbody.innerHTML = '';

    if (top5.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align:center;">No hay reportes que coincidan con los filtros actuales.</td></tr>';
      return;
    }

    top5.forEach((item, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>#${idx + 1}</strong></td>
        <td>
          <strong>${item.cuadra}</strong><br>
          <small>${item.nombre} (${item.sector} · ${item.tipo_via})</small>
        </td>
        <td><strong>${item.puntajeTotal}</strong> pts</td>
        <td>${item.cantidad}</td>
        <td><span class="badge-rec">${item.recomendacion}</span></td>
        <td><small>${item.regla}</small></td>
      `;
      tbody.appendChild(tr);
    });
  }

  function cambiarVista(vista) {
    const btnCaptura = document.getElementById('tab-captura');
    const btnTablero = document.getElementById('tab-tablero');
    const secCaptura = document.getElementById('vista-captura');
    const secTablero = document.getElementById('vista-tablero');

    if (vista === 'captura') {
      btnCaptura.classList.add('activo');
      btnTablero.classList.remove('activo');
      secCaptura.classList.remove('oculto');
      secTablero.classList.add('oculto');
      window.ModuloMapa.invalidarTamano();
    } else {
      btnTablero.classList.add('activo');
      btnCaptura.classList.remove('activo');
      secTablero.classList.remove('oculto');
      secCaptura.classList.add('oculto');
      renderizarTablero();
      window.ModuloMapa.invalidarTamano();
    }
  }

  function actualizarCoordsCaptura(lat, lng) {
    document.getElementById('captura-lat').value = lat.toFixed(6);
    document.getElementById('captura-lng').value = lng.toFixed(6);
    const cuadraCercana = window.CapturaModule.encontrarCuadraMasCercana(lat, lng, estado.vias);
    if (cuadraCercana) {
      document.getElementById('captura-cuadra').value = cuadraCercana;
    }
  }

  function inicializarEventos() {
    document.getElementById('tab-captura').addEventListener('click', () => cambiarVista('captura'));
    document.getElementById('tab-tablero').addEventListener('click', () => cambiarVista('tablero'));

    window.ModuloMapa.inicializarCaptura('mapa-captura', estado.vias, (latlng) => {
      window.ModuloMapa.fijarPuntoRegistro(latlng.lat, latlng.lng);
      actualizarCoordsCaptura(latlng.lat, latlng.lng);
    });

    document.getElementById('btn-gps').addEventListener('click', () => {
      const msg = document.getElementById('captura-mensaje');
      if (!navigator.geolocation) {
        msg.textContent = 'Tu navegador no soporta geolocalización. Toca el mapa para ubicar.';
        msg.className = 'mensaje-alerta error';
        return;
      }
      msg.textContent = 'Obteniendo ubicación GPS...';
      msg.className = 'mensaje-alerta';
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          window.ModuloMapa.fijarPuntoRegistro(latitude, longitude);
          actualizarCoordsCaptura(latitude, longitude);
          msg.textContent = 'Ubicación GPS fijada.';
          msg.className = 'mensaje-alerta exito';
        },
        () => {
          msg.textContent = 'No se pudo obtener el GPS. Toca directamente el mapa.';
          msg.className = 'mensaje-alerta error';
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });

    document.getElementById('captura-cuadra').addEventListener('change', (e) => {
      const cuadra = estado.vias.find((v) => (v.cuadra || v.id) === e.target.value);
      if (cuadra) {
        window.ModuloMapa.fijarPuntoRegistro(cuadra.lat, cuadra.lng);
        document.getElementById('captura-lat').value = cuadra.lat.toFixed(6);
        document.getElementById('captura-lng').value = cuadra.lng.toFixed(6);
      }
    });

    document.getElementById('captura-foto').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      const preview = document.getElementById('foto-preview');
      if (!file) {
        estado.fotoComprimida = '';
        preview.classList.add('oculto');
        return;
      }
      try {
        estado.fotoComprimida = await window.CapturaModule.comprimirImagen(file, 800, 0.7);
        preview.src = estado.fotoComprimida;
        preview.classList.remove('oculto');
      } catch (err) {
        alert(err.message);
      }
    });

    document.getElementById('form-captura').addEventListener('submit', (e) => {
      e.preventDefault();
      const lat = document.getElementById('captura-lat').value;
      const lng = document.getElementById('captura-lng').value;
      const cuadra = document.getElementById('captura-cuadra').value;
      const categoria = document.querySelector('input[name="categoria"]:checked')?.value;
      const actor = document.querySelector('input[name="actor"]:checked')?.value;
      const msg = document.getElementById('captura-mensaje');

      if (!lat || !lng || !cuadra || !categoria || !actor) {
        msg.textContent = 'Completa ubicación, cuadra, categoría y actor para guardar.';
        msg.className = 'mensaje-alerta error';
        return;
      }

      const nuevo = window.CapturaModule.crearNuevoReporte({
        lat,
        lng,
        cuadra,
        categoria,
        actor,
        fotoBase64: estado.fotoComprimida,
        vias: estado.vias,
        criterios: estado.criterios
      });

      estado.reportesLocales.push(nuevo);
      window.CapturaModule.guardarReportesLocales(estado.reportesLocales);
      combinarYRecalcular();
      window.ModuloMapa.limpiarPuntoRegistro();
      window.ModuloMapa.actualizarDatos(estado.reportesTotales);

      msg.textContent = `Reporte ${nuevo.id} guardado · Criticidad: ${nuevo.criticidad.nivel} (${nuevo.criticidad.puntaje} pts).`;
      msg.className = 'mensaje-alerta exito';

      e.target.reset();
      estado.fotoComprimida = '';
      document.getElementById('foto-preview').classList.add('oculto');
    });

    const idsFiltros = [
      'filtro-sector',
      'filtro-cuadra',
      'filtro-franja',
      'filtro-categoria',
      'filtro-actor'
    ];
    for (const id of idsFiltros) {
      document.getElementById(id).addEventListener('change', renderizarTablero);
    }

    document.getElementById('btn-limpiar-filtros').addEventListener('click', () => {
      document.getElementById('filtro-sector').value = 'todos';
      document.getElementById('filtro-cuadra').value = 'todas';
      document.getElementById('filtro-franja').value = 'todas';
      document.getElementById('filtro-categoria').value = 'todas';
      document.getElementById('filtro-actor').value = 'todos';
      renderizarTablero();
    });

    document.getElementById('btn-imprimir').addEventListener('click', () => {
      window.print();
    });

    document.getElementById('btn-exportar').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(estado.reportesTotales, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reportes-santa-marta-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    document.getElementById('input-importar').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const importados = JSON.parse(ev.target.result);
          if (!Array.isArray(importados)) throw new Error('El archivo debe ser un arreglo JSON.');
          const idsExistentes = new Set(estado.reportesTotales.map((r) => r.id));
          let agregados = 0;
          for (const item of importados) {
            if (item && item.id && !idsExistentes.has(item.id)) {
              estado.reportesLocales.push(item);
              idsExistentes.add(item.id);
              agregados += 1;
            }
          }
          window.CapturaModule.guardarReportesLocales(estado.reportesLocales);
          combinarYRecalcular();
          renderizarTablero();
          alert(`Importación completa: ${agregados} reporte(s) nuevo(s) agregado(s) sin duplicados.`);
        } catch (err) {
          alert('Error al importar JSON: ' + err.message);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    cargarDatosIniciales().catch((err) => {
      alert(err.message + ' Asegúrate de abrir el proyecto con Live Server o GitHub Pages.');
    });
  });
})();
