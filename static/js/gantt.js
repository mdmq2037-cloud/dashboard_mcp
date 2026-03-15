'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// GANTT STATE — año y mes seleccionados en el panel
// ═══════════════════════════════════════════════════════════════════════════
const GanttState = (() => {
  const _now = new Date();
  let _year  = _now.getFullYear();
  let _month = _now.getMonth() + 1;   // 1–12
  return {
    get year()   { return _year;  },
    get month()  { return _month; },
    set year(v)  { _year  = Number(v); },
    set month(v) { _month = Number(v); }
  };
})();

// ═══════════════════════════════════════════════════════════════════════════
// GANTT DATA — extensión localStorage por actividad (sin cambiar backend)
// ═══════════════════════════════════════════════════════════════════════════
const GanttData = (() => {
  const KEY = 'mcp_gantt_ext';

  function _load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch { return {}; }
  }
  function _save(d) { localStorage.setItem(KEY, JSON.stringify(d)); }

  function _defaults() {
    return {
      enviadoPor:         '',
      subactividades:     [],           // [{id, nombre, completada}]
      reprocesos:         0,
      validacion:         'pendiente',  // pendiente|en_proceso|aprobado|rechazado
      demora:             0,            // días (0 = sin demora registrada)
      aprobadorJefatura:  '',           // contactId
      aprobadorGerencia:  '',
      aprobadorDireccion: '',
      aprobadoJefatura:   false,
      aprobadoGerencia:   false,
      aprobadoDireccion:  false
    };
  }

  function getExt(id) {
    return { ..._defaults(), ...(_load()[id] || {}) };
  }

  function setExt(id, changes) {
    const all = _load();
    all[id] = { ...getExt(id), ...changes };
    _save(all);
    return all[id];
  }

  function toggleSubact(actId, subId) {
    const ext = getExt(actId);
    const sub = ext.subactividades.find(s => s.id === subId);
    if (sub) { sub.completada = !sub.completada; setExt(actId, ext); }
  }

  function addSubact(actId, nombre) {
    const ext = getExt(actId);
    ext.subactividades.push({ id: 's' + Date.now(), nombre, completada: false });
    setExt(actId, ext);
  }

  function removeSubact(actId, subId) {
    const ext = getExt(actId);
    ext.subactividades = ext.subactividades.filter(s => s.id !== subId);
    setExt(actId, ext);
  }

  function getProgress(actId) {
    const subs = getExt(actId).subactividades;
    if (!subs.length) return 0;
    return Math.round(subs.filter(s => s.completada).length / subs.length * 100);
  }

  function toggleAprobacion(actId, nivel) {
    const ext = getExt(actId);
    const key = 'aprobado' + nivel;
    ext[key]  = !ext[key];
    setExt(actId, ext);
  }

  function incReproceso(actId) {
    const ext = getExt(actId);
    ext.reprocesos = (ext.reprocesos || 0) + 1;
    setExt(actId, ext);
  }

  function getAll() { return _load(); }

  return {
    getExt, setExt, toggleSubact, addSubact, removeSubact,
    getProgress, toggleAprobacion, incReproceso, getAll, _defaults
  };
})();

// ═══════════════════════════════════════════════════════════════════════════
// GANTT UI — renderizado del Panel y de Indicadores
// ═══════════════════════════════════════════════════════════════════════════
const GanttUI = (() => {

  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  const TIPOS_PANEL = [
    { key: 'quincena1', label: '1RA QUINCENA',      icon: 'fa-calendar-check',      color: 'blue'    },
    { key: 'quincena2', label: '2DA QUINCENA',      icon: 'fa-calendar-alt',        color: 'violet'  },
    { key: 'planilla',  label: 'PLANILLA FIN MES',  icon: 'fa-file-invoice-dollar', color: 'emerald' }
  ];

  const VAL_CFG = {
    pendiente:  { cls: 'bg-gray-100 text-gray-600',    icon: 'fa-clock',         label: 'Pendiente'  },
    en_proceso: { cls: 'bg-yellow-100 text-yellow-700',icon: 'fa-spinner fa-spin',label: 'En Proceso' },
    aprobado:   { cls: 'bg-green-100 text-green-700',  icon: 'fa-check-circle',  label: 'Aprobado'   },
    rechazado:  { cls: 'bg-red-100 text-red-700',      icon: 'fa-times-circle',  label: 'Rechazado'  }
  };

  const COL_COLORS = {
    blue:    { header: 'bg-blue-600',    border: 'border-blue-200',    bg: 'bg-blue-50'    },
    violet:  { header: 'bg-violet-600',  border: 'border-violet-200',  bg: 'bg-violet-50'  },
    emerald: { header: 'bg-emerald-600', border: 'border-emerald-200', bg: 'bg-emerald-50' }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function _actMonth(act) {
    const d = act.fechaEntrega || act.createdAt;
    if (!d) return null;
    const dt = new Date(d.length === 10 ? d + 'T00:00:00' : d);
    return { year: dt.getFullYear(), month: dt.getMonth() + 1 };
  }

  function _filterByMonth(activities, year, month) {
    return activities.filter(a => {
      const m = _actMonth(a);
      return m && m.year === year && m.month === month;
    });
  }

  function _progressColor(pct) {
    if (pct >= 80) return '#10b981';
    if (pct >= 40) return '#f59e0b';
    return '#ef4444';
  }

  function _getYears(activities) {
    const yrs = new Set([new Date().getFullYear()]);
    activities.forEach(a => {
      const d = a.fechaEntrega || a.createdAt;
      if (d) yrs.add(new Date(d.length === 10 ? d + 'T00:00:00' : d).getFullYear());
    });
    return Array.from(yrs).sort();
  }

  function _calcDemora(act, ext) {
    if (ext.demora > 0) return ext.demora;
    if (act.fechaEntrega && act.estado !== 'completado') {
      const today   = new Date(); today.setHours(0,0,0,0);
      const entrega = new Date(act.fechaEntrega + 'T00:00:00');
      const diff    = Math.ceil((today - entrega) / 86400000);
      return diff > 0 ? diff : 0;
    }
    return 0;
  }

  // ── Panel principal ──────────────────────────────────────────────────────────
  function renderPanel() {
    const container = document.getElementById('panel-content');
    if (!container) return;

    const year    = GanttState.year;
    const month   = GanttState.month;
    const all     = DB.getActivities();
    const inMonth = _filterByMonth(all, year, month);
    const years   = _getYears(all);

    // KPIs del mes
    const total        = inMonth.length;
    const completadas  = inMonth.filter(a => a.estado === 'completado').length;
    const pctComp      = total ? Math.round(completadas / total * 100) : 0;
    let   totalDemora  = 0, totalRepro = 0;
    inMonth.forEach(a => {
      const ext = GanttData.getExt(a.id);
      totalDemora += _calcDemora(a, ext);
      totalRepro  += ext.reprocesos || 0;
    });

    container.innerHTML = `
      <!-- ── Selector Año / Mes ─────────────────────────────────────── -->
      <div class="gantt-selector-bar">
        <div class="selector-row">
          <span class="selector-label">Año</span>
          <div class="flex gap-1 flex-wrap">
            ${years.map(y => `
              <button onclick="GanttUI.changeYear(${y})"
                class="year-btn ${y === year ? 'year-btn-active' : ''}">${y}</button>
            `).join('')}
          </div>
        </div>
        <div class="selector-row">
          <span class="selector-label">Mes</span>
          <div class="flex gap-1 flex-wrap">
            ${MONTHS.map((m, i) => `
              <button onclick="GanttUI.changeMonth(${i + 1})"
                class="month-btn ${i + 1 === month ? 'month-btn-active' : ''}">${m.slice(0,3)}</button>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- ── KPI Bar ────────────────────────────────────────────────── -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div class="kpi-card kpi-blue">
          <div class="kpi-num">${total}</div>
          <div class="kpi-label">Actividades del Mes</div>
          <i class="fas fa-clipboard-list kpi-icon"></i>
        </div>
        <div class="kpi-card ${pctComp >= 80 ? 'kpi-green' : pctComp >= 40 ? 'kpi-orange' : 'kpi-red'}">
          <div class="kpi-num">${completadas}<span class="text-base font-normal opacity-70">/${total}</span></div>
          <div class="kpi-label">${pctComp}% Completado</div>
          <i class="fas fa-check-double kpi-icon"></i>
        </div>
        <div class="kpi-card ${totalDemora > 0 ? 'kpi-red' : 'kpi-green'}">
          <div class="kpi-num">${totalDemora}<span class="text-base font-normal opacity-70">d</span></div>
          <div class="kpi-label">${totalDemora === 0 ? 'Sin demoras' : 'Días de Demora'}</div>
          <i class="fas fa-hourglass-half kpi-icon"></i>
        </div>
        <div class="kpi-card ${totalRepro > 0 ? 'kpi-orange' : 'kpi-green'}">
          <div class="kpi-num">${totalRepro}</div>
          <div class="kpi-label">${totalRepro === 0 ? 'Sin reprocesos' : 'Reprocesos'}</div>
          <i class="fas fa-redo kpi-icon"></i>
        </div>
      </div>

      <!-- ── Título del mes ─────────────────────────────────────────── -->
      <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 class="text-base font-bold text-gray-800 flex items-center gap-2">
          <i class="fas fa-calendar-alt text-blue-500"></i>
          ${MONTHS[month - 1]} ${year}
          <span class="text-sm font-normal text-gray-400">— Panel de Control de Pagos</span>
        </h3>
        <button onclick="App.openModal('actividad')" class="btn-primary text-xs py-1.5 px-3">
          <i class="fas fa-plus mr-1"></i>Nueva Actividad
        </button>
      </div>

      <!-- ── Columnas por tipo ──────────────────────────────────────── -->
      <div class="grid md:grid-cols-3 gap-4">
        ${TIPOS_PANEL.map(tipo => _renderColumn(tipo, inMonth)).join('')}
      </div>`;
  }

  function changeYear(y) {
    GanttState.year = y;
    renderPanel();
  }

  function changeMonth(m) {
    GanttState.month = m;
    renderPanel();
  }

  // ── Columna por tipo de pago ─────────────────────────────────────────────────
  function _renderColumn(tipo, activities) {
    const acts = activities.filter(a => a.tipo === tipo.key);
    const c    = COL_COLORS[tipo.color];

    // Stats de la columna
    const done   = acts.filter(a => a.estado === 'completado').length;
    const colPct = acts.length ? Math.round(done / acts.length * 100) : 0;

    return `
      <div class="gantt-column border ${c.border} rounded-xl overflow-hidden">
        <!-- Cabecera de columna -->
        <div class="${c.header} text-white px-4 py-3">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <i class="fas ${tipo.icon} text-sm"></i>
              <span class="font-bold text-sm tracking-wide">${tipo.label}</span>
            </div>
            <span class="bg-white bg-opacity-25 text-xs font-bold px-2 py-0.5 rounded-full">${acts.length}</span>
          </div>
          <!-- Mini barra de progreso de columna -->
          <div class="col-progress-track">
            <div class="col-progress-bar" style="width:${colPct}%"></div>
          </div>
          <div class="flex justify-between text-xs opacity-80 mt-1">
            <span>${done}/${acts.length} completadas</span>
            <span class="font-bold">${colPct}%</span>
          </div>
        </div>

        <!-- Contenido de la columna -->
        <div class="${c.bg} p-3 space-y-3 min-h-[200px]">
          ${acts.length === 0
            ? `<div class="flex flex-col items-center justify-center py-10 text-gray-400">
                 <i class="fas fa-inbox text-3xl mb-2 opacity-30"></i>
                 <p class="text-xs text-center">Sin actividades este mes</p>
                 <button onclick="App.openModal('actividad')"
                   class="mt-3 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold">
                   <i class="fas fa-plus-circle"></i> Agregar
                 </button>
               </div>`
            : acts.map(a => _renderCard(a)).join('')
          }
        </div>
      </div>`;
  }

  // ── Tarjeta de actividad ─────────────────────────────────────────────────────
  function _renderCard(act) {
    const ext      = GanttData.getExt(act.id);
    const progress = GanttData.getProgress(act.id);
    const pColor   = _progressColor(progress);
    const total    = ext.subactividades.length;
    const done     = ext.subactividades.filter(s => s.completada).length;
    const val      = VAL_CFG[ext.validacion] || VAL_CFG.pendiente;
    const demora   = _calcDemora(act, ext);
    const isComp   = act.estado === 'completado';

    return `
      <div class="gantt-card ${isComp ? 'gantt-card-done' : ''}">
        <!-- Encabezado -->
        <div class="flex items-start justify-between mb-2.5">
          <div class="flex-1 min-w-0 pr-1">
            <h4 class="font-bold text-gray-800 text-sm leading-snug ${isComp ? 'line-through text-gray-400' : ''}"
              title="${act.nombre}">${act.nombre}</h4>
            ${ext.enviadoPor
              ? `<p class="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                   <i class="fas fa-paper-plane text-blue-400 text-xs"></i>
                   <span class="font-semibold">${ext.enviadoPor}</span>
                 </p>`
              : `<p class="text-xs text-gray-400 italic mt-0.5">Sin remitente</p>`
            }
          </div>
          <div class="flex gap-1 flex-shrink-0">
            <button onclick="App.editActividad('${act.id}')"
              class="gantt-icon-btn text-blue-400 hover:bg-blue-50" title="Editar actividad">
              <i class="fas fa-pen text-xs"></i>
            </button>
            <button onclick="App.openGanttModal('${act.id}')"
              class="gantt-icon-btn text-violet-400 hover:bg-violet-50" title="Configurar panel">
              <i class="fas fa-sliders-h text-xs"></i>
            </button>
          </div>
        </div>

        <!-- Barra de progreso -->
        <div class="mb-3">
          <div class="flex justify-between items-center mb-1">
            <span class="text-xs text-gray-500 font-medium">
              <i class="fas fa-tasks mr-1 opacity-60"></i>
              <strong>${done}/${total}</strong> subactividades
            </span>
            <span class="text-xs font-bold" style="color:${pColor}">${progress}%</span>
          </div>
          <div class="progress-track">
            <div class="progress-bar" style="width:${progress}%;background:${pColor}"></div>
          </div>
          <!-- Segmentos visuales (like Gantt blocks) -->
          ${total > 0 ? `
          <div class="flex gap-0.5 mt-1">
            ${ext.subactividades.map(s => `
              <div class="flex-1 h-1.5 rounded-sm transition-all"
                style="background:${s.completada ? pColor : '#e5e7eb'}"
                title="${s.nombre}"></div>
            `).join('')}
          </div>` : ''}
        </div>

        <!-- Subactividades -->
        <div class="mb-3 gantt-subacts-section">
          ${total === 0
            ? `<div class="text-center py-2">
                 <p class="text-xs text-gray-400">
                   <i class="fas fa-list-ul mr-1 opacity-50"></i>
                   Sin subactividades —
                   <button onclick="App.openGanttModal('${act.id}')"
                     class="text-violet-500 hover:underline font-medium">configurar</button>
                 </p>
               </div>`
            : `<div class="space-y-1">
                 ${ext.subactividades.map((s, idx) => `
                   <label class="subact-row ${s.completada ? 'subact-done' : ''}">
                     <input type="checkbox" ${s.completada ? 'checked' : ''}
                       onchange="App.toggleGanttSubact('${act.id}','${s.id}')"
                       class="w-3.5 h-3.5 flex-shrink-0 accent-emerald-500 cursor-pointer">
                     <span class="flex-1 text-xs leading-tight truncate">${s.nombre}</span>
                     <span class="text-xs text-gray-400 flex-shrink-0 font-medium">${idx+1}/${total}</span>
                   </label>`).join('')}
               </div>`
          }
        </div>

        <!-- Métricas: Demora | Reprocesos | Validación -->
        <div class="metrics-row mb-3">
          <div class="metric-chip ${demora > 0 ? 'metric-red' : 'metric-green'}">
            <i class="fas fa-hourglass-half text-xs"></i>
            <span class="font-bold text-xs">${demora}d</span>
            <span class="text-xs opacity-70">demora</span>
          </div>
          <div class="metric-chip ${ext.reprocesos > 0 ? 'metric-orange' : 'metric-green'}"
            title="Clic para registrar un reproceso"
            onclick="App.incReproceso('${act.id}')">
            <i class="fas fa-redo text-xs"></i>
            <span class="font-bold text-xs">${ext.reprocesos}</span>
            <span class="text-xs opacity-70">reproc.</span>
            <i class="fas fa-plus-circle text-xs opacity-50 ml-auto"></i>
          </div>
          <div class="metric-chip ${val.cls}">
            <i class="fas ${val.icon} text-xs"></i>
            <span class="text-xs font-semibold">${val.label}</span>
          </div>
        </div>

        <!-- Cadena de aprobadores -->
        <div class="approver-section">
          <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <i class="fas fa-user-shield text-blue-400"></i>
            Cadena de Aprobación
            ${ext.aprobadoJefatura && ext.aprobadoGerencia && ext.aprobadoDireccion
              ? `<span class="ml-auto bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold">
                   <i class="fas fa-check mr-1"></i>AUTORIZADO
                 </span>`
              : ''
            }
          </p>
          ${_renderAprobadores(act.id, ext)}
        </div>
      </div>`;
  }

  function _renderAprobadores(actId, ext) {
    const niveles = [
      { key: 'Jefatura',   icon: 'fa-user-tie',  label: 'Jefatura',  field: 'aprobadorJefatura',  ok: ext.aprobadoJefatura  },
      { key: 'Gerencia',   icon: 'fa-briefcase', label: 'Gerencia',  field: 'aprobadorGerencia',  ok: ext.aprobadoGerencia  },
      { key: 'Direccion',  icon: 'fa-building',  label: 'Dirección', field: 'aprobadorDireccion', ok: ext.aprobadoDireccion }
    ];
    return `
      <div class="space-y-1.5">
        ${niveles.map((n, idx) => {
          const contact = DB.getContactById(ext[n.field]);
          const isLast  = idx === niveles.length - 1;
          return `
            <div class="approver-row ${n.ok ? 'approver-ok' : isLast && !n.ok ? 'approver-final-pending' : ''}">
              <div class="approver-avatar ${n.ok ? 'approver-avatar-ok' : 'approver-avatar-pending'}">
                <i class="fas ${n.icon} text-xs"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-gray-700 leading-none">${n.label}</p>
                ${contact
                  ? `<p class="text-xs text-gray-500 truncate mt-0.5">${contact.nombre}${contact.cargo ? ` · ${contact.cargo}` : ''}</p>`
                  : `<p class="text-xs text-gray-400 italic mt-0.5">Sin asignar</p>`
                }
              </div>
              <button onclick="App.toggleAprobacion('${actId}','${n.key}')"
                class="approver-btn ${n.ok ? 'approver-btn-ok' : 'approver-btn-pending'}">
                <i class="fas ${n.ok ? 'fa-check' : 'fa-clock'} mr-1 text-xs"></i>
                ${n.ok ? 'Aprobado' : 'Pendiente'}
              </button>
            </div>`;
        }).join('')}
      </div>`;
  }

  // ── Formulario de configuración Gantt (modal) ────────────────────────────────
  function getGanttExtFormHTML(actId) {
    const ext      = GanttData.getExt(actId);
    const contacts = DB.getContacts();
    const act      = DB.getActivities().find(a => a.id === actId);

    const selectOpts = (fieldVal) =>
      `<option value="">Sin asignar</option>` +
      contacts.map(c =>
        `<option value="${c.id}" ${fieldVal === c.id ? 'selected' : ''}>
          ${c.nombre}${c.cargo ? ` — ${c.cargo}` : ''}
         </option>`
      ).join('');

    const valOpts = ['pendiente','en_proceso','aprobado','rechazado']
      .map(v => `<option value="${v}" ${ext.validacion === v ? 'selected' : ''}>${VAL_CFG[v].label}</option>`)
      .join('');

    return `
      <form id="form-gantt-ext" onsubmit="App.submitGanttExt(event)">
        <input type="hidden" id="gf-actid" value="${actId}">
        <div class="form-grid">

          <!-- Enviado por -->
          <div class="col-span-2">
            <label class="form-label">
              <i class="fas fa-paper-plane mr-1 text-blue-400"></i>Enviado por
            </label>
            <input type="text" id="gf-enviadoPor" value="${ext.enviadoPor || ''}"
              class="form-input" placeholder="Nombre de quien envía la información">
          </div>

          <!-- Demora y Reprocesos -->
          <div>
            <label class="form-label">
              <i class="fas fa-hourglass-half mr-1 text-red-400"></i>Demora manual (días)
            </label>
            <input type="number" id="gf-demora" value="${ext.demora || 0}" min="0" class="form-input">
          </div>
          <div>
            <label class="form-label">
              <i class="fas fa-redo mr-1 text-orange-400"></i>Reprocesos
            </label>
            <input type="number" id="gf-reprocesos" value="${ext.reprocesos || 0}" min="0" class="form-input">
          </div>

          <!-- Validación -->
          <div class="col-span-2">
            <label class="form-label">
              <i class="fas fa-check-circle mr-1 text-green-400"></i>Estado de Validación
            </label>
            <select id="gf-validacion" class="form-input">${valOpts}</select>
          </div>

          <!-- Subactividades -->
          <div class="col-span-2">
            <label class="form-label">
              <i class="fas fa-list-check mr-1 text-violet-400"></i>Subactividades
            </label>
            <div id="gf-subacts-list" class="space-y-1.5 mb-2 max-h-48 overflow-y-auto">
              ${ext.subactividades.map(s => `
                <div class="flex items-center gap-2 gf-sub-row" id="gf-sub-${s.id}">
                  <input type="checkbox" ${s.completada ? 'checked' : ''}
                    onchange="GanttData.toggleSubact('${actId}','${s.id}')"
                    class="w-4 h-4 accent-violet-500 flex-shrink-0 cursor-pointer">
                  <input type="text" value="${s.nombre.replace(/"/g,'&quot;')}"
                    onblur="GanttUI._updateSubactName('${actId}','${s.id}',this.value)"
                    class="form-input flex-1 text-sm py-1.5">
                  <button type="button"
                    onclick="GanttUI._removeSubactFromForm('${actId}','${s.id}')"
                    class="text-red-400 hover:text-red-600 flex-shrink-0 px-1">
                    <i class="fas fa-times"></i>
                  </button>
                </div>`).join('')}
            </div>
            <!-- Agregar nueva subactividad -->
            <div class="flex gap-2">
              <input type="text" id="gf-new-subact"
                class="form-input flex-1 text-sm" placeholder="Nueva subactividad..."
                onkeydown="if(event.key==='Enter'){event.preventDefault();GanttUI._addSubactFromForm('${actId}');}">
              <button type="button" onclick="GanttUI._addSubactFromForm('${actId}')"
                class="btn-primary py-1.5 px-3 text-sm flex-shrink-0">
                <i class="fas fa-plus"></i>
              </button>
            </div>
          </div>

          <!-- Aprobadores -->
          <div class="col-span-2">
            <p class="form-label mt-1">
              <i class="fas fa-user-shield mr-1 text-blue-400"></i>Aprobadores para Pago
            </p>
          </div>
          <div>
            <label class="form-label text-xs text-gray-500">
              <i class="fas fa-user-tie mr-1"></i>Jefatura
            </label>
            <select id="gf-jefatura" class="form-input text-sm">${selectOpts(ext.aprobadorJefatura)}</select>
          </div>
          <div>
            <label class="form-label text-xs text-gray-500">
              <i class="fas fa-briefcase mr-1"></i>Gerencia
            </label>
            <select id="gf-gerencia" class="form-input text-sm">${selectOpts(ext.aprobadorGerencia)}</select>
          </div>
          <div class="col-span-2">
            <label class="form-label text-xs text-gray-500">
              <i class="fas fa-building mr-1"></i>Dirección
            </label>
            <select id="gf-direccion" class="form-input text-sm">${selectOpts(ext.aprobadorDireccion)}</select>
          </div>

        </div>
        <div class="modal-footer">
          <button type="button" onclick="App.closeModal()" class="btn-secondary">Cancelar</button>
          <button type="submit" class="btn-primary">
            <i class="fas fa-save mr-2"></i>Guardar configuración
          </button>
        </div>
      </form>`;
  }

  function _addSubactFromForm(actId) {
    const input  = document.getElementById('gf-new-subact');
    const nombre = (input?.value || '').trim();
    if (!nombre) return;
    GanttData.addSubact(actId, nombre);
    input.value = '';
    const ext  = GanttData.getExt(actId);
    const s    = ext.subactividades[ext.subactividades.length - 1];
    const list = document.getElementById('gf-subacts-list');
    if (list && s) {
      const div = document.createElement('div');
      div.id        = 'gf-sub-' + s.id;
      div.className = 'flex items-center gap-2 gf-sub-row';
      div.innerHTML = `
        <input type="checkbox" class="w-4 h-4 accent-violet-500 flex-shrink-0 cursor-pointer"
          onchange="GanttData.toggleSubact('${actId}','${s.id}')">
        <input type="text" value="${s.nombre.replace(/"/g,'&quot;')}"
          onblur="GanttUI._updateSubactName('${actId}','${s.id}',this.value)"
          class="form-input flex-1 text-sm py-1.5">
        <button type="button"
          onclick="GanttUI._removeSubactFromForm('${actId}','${s.id}')"
          class="text-red-400 hover:text-red-600 flex-shrink-0 px-1">
          <i class="fas fa-times"></i>
        </button>`;
      list.appendChild(div);
      input.focus();
    }
  }

  function _removeSubactFromForm(actId, subId) {
    GanttData.removeSubact(actId, subId);
    const row = document.getElementById('gf-sub-' + subId);
    if (row) row.remove();
  }

  function _updateSubactName(actId, subId, nombre) {
    const ext = GanttData.getExt(actId);
    const sub = ext.subactividades.find(s => s.id === subId);
    if (sub && nombre.trim()) { sub.nombre = nombre.trim(); GanttData.setExt(actId, ext); }
  }

  // ── Vista Indicadores ────────────────────────────────────────────────────────
  function renderIndicadores() {
    const container = document.getElementById('indicadores-content');
    if (!container) return;

    const all   = DB.getActivities();
    const gantt = GanttData.getAll();
    const year  = GanttState.year;
    const years = _getYears(all);

    // Agrupar actividades por mes
    const byMonth = {};
    for (let m = 1; m <= 12; m++) {
      const acts = _filterByMonth(all, year, m);
      if (!acts.length) continue;
      const completadas = acts.filter(a => a.estado === 'completado').length;
      let   demoras = 0, reprocesos = 0, aprobadas = 0, avgProgress = 0;
      acts.forEach(a => {
        const ext   = { ...GanttData._defaults(), ...(gantt[a.id] || {}) };
        demoras    += _calcDemora(a, ext);
        reprocesos += ext.reprocesos || 0;
        if (ext.aprobadoDireccion) aprobadas++;
        avgProgress += GanttData.getProgress(a.id);
      });
      byMonth[m] = {
        acts, completadas,
        pct:      Math.round(completadas / acts.length * 100),
        avgProg:  Math.round(avgProgress / acts.length),
        demoras, reprocesos, aprobadas
      };
    }

    const entries = Object.entries(byMonth);
    if (!entries.length) {
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20 text-gray-400">
          <i class="fas fa-chart-bar text-5xl mb-4 opacity-20"></i>
          <p class="text-lg font-semibold">Sin datos para ${year}</p>
          <p class="text-sm text-gray-300 mt-1">Agrega actividades con fechas de entrega para ver indicadores</p>
        </div>`;
      return;
    }

    const maxDemora  = Math.max(...entries.map(([,v]) => v.demoras), 1);
    const maxRepro   = Math.max(...entries.map(([,v]) => v.reprocesos), 1);
    const totalActs  = entries.reduce((s, [,v]) => s + v.acts.length, 0);
    const totalComp  = entries.reduce((s, [,v]) => s + v.completadas, 0);
    const totalDem   = entries.reduce((s, [,v]) => s + v.demoras, 0);
    const totalRepro = entries.reduce((s, [,v]) => s + v.reprocesos, 0);

    container.innerHTML = `
      <!-- Selector de año -->
      <div class="flex items-center gap-2 mb-6 flex-wrap">
        <span class="text-xs font-bold text-gray-500 uppercase tracking-wide">Año:</span>
        ${years.map(y => `
          <button onclick="GanttUI.changeYearInd(${y})"
            class="year-btn ${y === year ? 'year-btn-active' : ''}">${y}</button>
        `).join('')}
      </div>

      <!-- KPIs globales del año -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-7">
        <div class="kpi-card kpi-blue">
          <div class="kpi-num">${totalActs}</div>
          <div class="kpi-label">Actividades ${year}</div>
          <i class="fas fa-clipboard-list kpi-icon"></i>
        </div>
        <div class="kpi-card ${totalActs ? (Math.round(totalComp/totalActs*100) >= 80 ? 'kpi-green' : 'kpi-orange') : 'kpi-gray'}">
          <div class="kpi-num">${totalActs ? Math.round(totalComp/totalActs*100) : 0}%</div>
          <div class="kpi-label">Completitud anual</div>
          <i class="fas fa-chart-pie kpi-icon"></i>
        </div>
        <div class="kpi-card ${totalDem > 0 ? 'kpi-red' : 'kpi-green'}">
          <div class="kpi-num">${totalDem}d</div>
          <div class="kpi-label">Demoras totales ${year}</div>
          <i class="fas fa-clock kpi-icon"></i>
        </div>
        <div class="kpi-card ${totalRepro > 0 ? 'kpi-orange' : 'kpi-green'}">
          <div class="kpi-num">${totalRepro}</div>
          <div class="kpi-label">Reprocesos totales ${year}</div>
          <i class="fas fa-redo kpi-icon"></i>
        </div>
      </div>

      <!-- Tabla comparativa mensual -->
      <div class="bg-white rounded-xl shadow overflow-hidden mb-7">
        <div class="bg-gray-50 border-b px-5 py-3 flex items-center gap-2">
          <i class="fas fa-table text-blue-500"></i>
          <h3 class="font-bold text-gray-700">Comparativo Mensual ${year}</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b">
              <tr>
                <th class="text-left px-4 py-3 text-gray-500 font-semibold">Mes</th>
                <th class="text-center px-4 py-3 text-gray-500 font-semibold">Actividades</th>
                <th class="text-center px-4 py-3 text-gray-500 font-semibold">Completadas</th>
                <th class="text-center px-4 py-3 text-gray-500 font-semibold">% Avance</th>
                <th class="text-center px-4 py-3 text-gray-500 font-semibold">Demora</th>
                <th class="text-center px-4 py-3 text-gray-500 font-semibold">Reprocesos</th>
                <th class="text-center px-4 py-3 text-gray-500 font-semibold">Aprobaciones</th>
                <th class="text-center px-4 py-3 text-gray-500 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${entries.map(([mNum, v]) => {
                const statusOk  = v.pct >= 80 && v.demoras === 0 && v.reprocesos === 0;
                const statusGood= v.pct >= 80 && (v.demoras <= 2 && v.reprocesos <= 1);
                const statusMed = v.pct >= 50;
                const status    = statusOk   ? '<span class="ind-tag ind-excelente">Excelente</span>'
                                : statusGood ? '<span class="ind-tag ind-bueno">Bueno</span>'
                                : statusMed  ? '<span class="ind-tag ind-regular">Regular</span>'
                                :              '<span class="ind-tag ind-critico">Crítico</span>';
                return `
                  <tr class="table-row">
                    <td class="px-4 py-3 font-bold text-gray-800">${MONTHS[mNum-1]}</td>
                    <td class="px-4 py-3 text-center text-gray-600">${v.acts.length}</td>
                    <td class="px-4 py-3 text-center text-gray-600">${v.completadas}</td>
                    <td class="px-4 py-3 text-center">
                      <div class="flex items-center justify-center gap-2">
                        <div class="progress-track w-14">
                          <div class="progress-bar" style="width:${v.pct}%;background:${_progressColor(v.pct)}"></div>
                        </div>
                        <span class="font-bold text-xs" style="color:${_progressColor(v.pct)}">${v.pct}%</span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span class="font-bold ${v.demoras > 0 ? 'text-red-600' : 'text-green-600'}">${v.demoras}d</span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span class="font-bold ${v.reprocesos > 0 ? 'text-orange-600' : 'text-green-600'}">${v.reprocesos}</span>
                    </td>
                    <td class="px-4 py-3 text-center text-gray-600">${v.aprobadas}/${v.acts.length}</td>
                    <td class="px-4 py-3 text-center">${status}</td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Gráficos de barras -->
      <div class="grid md:grid-cols-2 gap-5">

        <!-- Demoras -->
        <div class="bg-white rounded-xl shadow p-5">
          <h4 class="font-bold text-gray-700 mb-4 flex items-center gap-2 text-sm">
            <i class="fas fa-chart-bar text-red-400"></i>Demoras por Mes (días)
          </h4>
          <div class="space-y-2.5">
            ${entries.map(([mNum, v]) => `
              <div class="flex items-center gap-3">
                <span class="text-xs text-gray-500 w-8 flex-shrink-0 font-medium">${MONTHS[mNum-1].slice(0,3)}</span>
                <div class="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div class="h-full rounded-full flex items-center px-2 text-xs text-white font-bold transition-all duration-500"
                    style="width:${v.demoras ? Math.max(v.demoras/maxDemora*100, 5) : 0}%;
                           background:${v.demoras > 3 ? '#ef4444' : v.demoras > 0 ? '#f97316' : '#d1fae5'};">
                    ${v.demoras > 0 ? v.demoras + 'd' : ''}
                  </div>
                </div>
                <span class="text-xs font-bold w-8 text-right flex-shrink-0 ${v.demoras > 0 ? 'text-red-600' : 'text-green-500'}">${v.demoras}d</span>
              </div>`).join('')}
          </div>
        </div>

        <!-- Reprocesos -->
        <div class="bg-white rounded-xl shadow p-5">
          <h4 class="font-bold text-gray-700 mb-4 flex items-center gap-2 text-sm">
            <i class="fas fa-redo text-orange-400"></i>Reprocesos por Mes
          </h4>
          <div class="space-y-2.5">
            ${entries.map(([mNum, v]) => `
              <div class="flex items-center gap-3">
                <span class="text-xs text-gray-500 w-8 flex-shrink-0 font-medium">${MONTHS[mNum-1].slice(0,3)}</span>
                <div class="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div class="h-full rounded-full flex items-center px-2 text-xs text-white font-bold transition-all duration-500"
                    style="width:${v.reprocesos ? Math.max(v.reprocesos/maxRepro*100, 5) : 0}%;
                           background:${v.reprocesos > 2 ? '#ef4444' : v.reprocesos > 0 ? '#f97316' : '#d1fae5'};">
                    ${v.reprocesos > 0 ? v.reprocesos : ''}
                  </div>
                </div>
                <span class="text-xs font-bold w-4 text-right flex-shrink-0 ${v.reprocesos > 0 ? 'text-orange-600' : 'text-green-500'}">${v.reprocesos}</span>
              </div>`).join('')}
          </div>
        </div>

      </div>`;
  }

  function changeYearInd(y) {
    GanttState.year = y;
    renderIndicadores();
  }

  return {
    renderPanel, renderIndicadores,
    changeYear, changeMonth, changeYearInd,
    getGanttExtFormHTML,
    _addSubactFromForm, _removeSubactFromForm, _updateSubactName
  };
})();
