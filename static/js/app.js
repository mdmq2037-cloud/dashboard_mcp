'use strict';

// ═══════════════════════════════════════════════════════════
//  RRHH Sistema — JavaScript principal
// ═══════════════════════════════════════════════════════════

const fmt = new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', minimumFractionDigits: 0 });
const fmtN = v => fmt.format(v);
const fmtPct = v => `${v}%`;

// ── Toasts ─────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ── API ────────────────────────────────────────────────────
async function api(path, opts = {}) {
  try {
    const r = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
    if (!r.ok) throw new Error(r.status);
    return r.json();
  } catch (e) {
    toast('Error de conexión: ' + path, 'error');
    return null;
  }
}

// ── Modals ─────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('[data-modal]').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.modal));
});

// ── Sidebar ─────────────────────────────────────────────────
const sidebar  = document.getElementById('sidebar');
const overlay  = document.getElementById('overlay');
const menuBtn  = document.getElementById('menuBtn');
const closeBtn = document.getElementById('sidebarClose');

function openSidebar()  { sidebar.classList.add('open'); overlay.classList.add('open'); }
function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('open'); }

menuBtn.addEventListener('click', openSidebar);
closeBtn.addEventListener('click', closeSidebar);
overlay.addEventListener('click', closeSidebar);

// ── Navigation ──────────────────────────────────────────────
const TITLES = {
  dashboard: 'Dashboard', empleados: 'Empleados',
  nomina: 'Nómina', asistencia: 'Asistencia',
  evaluaciones: 'Evaluaciones', reportes: 'Reportes',
};

function navigate(mod) {
  document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const section = document.getElementById('mod-' + mod);
  const navBtn  = document.querySelector(`[data-module="${mod}"]`);
  if (section) section.classList.add('active');
  if (navBtn)  navBtn.classList.add('active');
  document.getElementById('pageTitle').textContent = TITLES[mod] || mod;
  closeSidebar();
  loadModule(mod);
}

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => navigate(btn.dataset.module));
});

// ── Date ────────────────────────────────────────────────────
(function setDate() {
  const d = document.getElementById('topbarDate');
  if (d) d.textContent = new Date().toLocaleDateString('es-CR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
})();

// ═══════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════
let chartsBuilt = false;

async function loadDashboard() {
  if (chartsBuilt) return;
  chartsBuilt = true;
  const [kpis, depts, genero, edades, sat] = await Promise.all([
    api('/api/dashboard/kpis'),
    api('/api/dashboard/chart/departamentos'),
    api('/api/dashboard/chart/genero'),
    api('/api/dashboard/chart/edades'),
    api('/api/dashboard/chart/satisfaccion'),
  ]);
  if (kpis)   renderKpis(kpis);
  if (depts)  buildBarChart('chartDept',        depts.map(d=>d.departamento),  depts.map(d=>d.cantidad),  ['#2563eb','#10b981','#f59e0b','#ef4444','#8b5cf6']);
  if (genero) buildDoughnut('chartGenero',       Object.keys(genero),          Object.values(genero),    ['#2563eb','#ec4899']);
  if (edades) buildBarChart('chartEdades',       edades.map(d=>d.rango),       edades.map(d=>d.cantidad), ['#6366f1']);
  if (sat)    buildDoughnut('chartSatisfaccion', Object.keys(sat),             Object.values(sat),       ['#10b981','#ef4444','#f59e0b']);
}

function renderKpis(k) {
  const items = [
    { icon: '👥', label: 'Total Empleados',    value: k.total_empleados,            color: '#2563eb', bg: '#eff6ff' },
    { icon: '✅', label: 'Activos',            value: k.empleados_activos,           color: '#10b981', bg: '#dcfce7' },
    { icon: '💰', label: 'Costo Planilla',     value: fmtN(k.costo_planilla),        color: '#8b5cf6', bg: '#f5f3ff' },
    { icon: '📅', label: 'Ausentismo Prom.',   value: fmtPct(k.tasa_ausentismo),     color: '#f59e0b', bg: '#fef3c7' },
    { icon: '😞', label: 'Insatisfechos',      value: fmtPct(k.pct_insatisfechos),   color: '#ef4444', bg: '#fee2e2' },
    { icon: '⭐', label: 'Evaluación Prom.',   value: `${k.evaluacion_promedio}/15`, color: '#06b6d4', bg: '#cffafe' },
  ];
  const grid = document.getElementById('kpiGrid');
  grid.innerHTML = items.map(i => `
    <div class="kpi-card">
      <div class="kpi-icon" style="background:${i.bg}"><span style="font-size:18px">${i.icon}</span></div>
      <div class="kpi-value" style="color:${i.color}">${i.value}</div>
      <div class="kpi-label">${i.label}</div>
    </div>`).join('');
}

function buildBarChart(id, labels, data, colors) {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors.length === 1 ? colors[0] : colors, borderRadius: 6 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } },
      },
    }
  });
}

function buildDoughnut(id, labels, data, colors) {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, hoverOffset: 6 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } } },
      cutout: '65%',
    }
  });
}

// ═══════════════════════════════════════════════════════════
//  EMPLEADOS
// ═══════════════════════════════════════════════════════════
let _empleados = [];
let _departamentos = [];

async function loadEmpleados() {
  _departamentos = (await api('/api/departamentos')) || [];
  populateDeptSelects();
  await fetchAndRenderEmpleados();
}

function populateDeptSelects() {
  ['empDeptFilter', 'empDept', 'asiDept', 'evalDept'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const isFilter = id.includes('Filter') || id === 'asiDept' || id === 'evalDept';
    sel.innerHTML = (isFilter ? '<option value="">Todos los departamentos</option>' : '') +
      _departamentos.map(d => `<option value="${d}">${d}</option>`).join('');
  });
}

async function fetchAndRenderEmpleados() {
  const q    = document.getElementById('empSearch').value;
  const dept = document.getElementById('empDeptFilter').value;
  const est  = document.getElementById('empEstadoFilter').value;
  const params = new URLSearchParams({ q, departamento: dept, estado: est });
  _empleados = await api('/api/empleados?' + params) || [];
  renderEmpTable(_empleados);
  renderEmpCards(_empleados);
}

function renderEmpTable(emps) {
  document.getElementById('empTableBody').innerHTML = emps.map(e => `
    <tr>
      <td><span class="badge badge-blue">${e.id}</span></td>
      <td><strong>${e.nombre}</strong></td>
      <td>${e.departamento}</td>
      <td>${e.cargo}</td>
      <td>${fmtN(e.salario)}</td>
      <td><span class="badge ${e.estado==='Activo'?'badge-green':'badge-red'}">${e.estado}</span></td>
      <td>
        <button class="action-btn edit" onclick="editEmp('${e.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button class="action-btn del"  onclick="delEmp('${e.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg></button>
      </td>
    </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;padding:24px;color:#94a3b8">No hay empleados</td></tr>';
}

function renderEmpCards(emps) {
  document.getElementById('empMobileCards').innerHTML = emps.map(e => `
    <div class="emp-card">
      <div class="emp-card-head">
        <div><div class="emp-card-name">${e.nombre}</div><div style="font-size:11px;color:#64748b;margin-top:2px">${e.id} · ${e.cargo}</div></div>
        <span class="badge ${e.estado==='Activo'?'badge-green':'badge-red'}">${e.estado}</span>
      </div>
      <div class="emp-card-body">
        <div>🏢 ${e.departamento}</div>
        <div>💰 ${fmtN(e.salario)}</div>
        <div>📅 ${e.fecha_inicio||''}</div>
        <div>⭐ ${e.evaluacion}</div>
      </div>
      <div style="margin-top:10px;display:flex;gap:8px">
        <button class="btn-outline" style="padding:6px 12px;font-size:12px" onclick="editEmp('${e.id}')">Editar</button>
        <button class="btn-primary" style="padding:6px 12px;font-size:12px;background:#ef4444" onclick="delEmp('${e.id}')">Eliminar</button>
      </div>
    </div>`).join('');
}

// Search & filter debounce
let _empDebounce;
['empSearch','empDeptFilter','empEstadoFilter'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', () => { clearTimeout(_empDebounce); _empDebounce = setTimeout(fetchAndRenderEmpleados, 300); });
});

// Nuevo empleado
document.getElementById('btnNuevoEmp').addEventListener('click', () => {
  document.getElementById('modalEmpTitle').textContent = 'Nuevo Empleado';
  document.getElementById('formEmp').reset();
  document.getElementById('empId').value = '';
  document.getElementById('empFechaInicio').value = new Date().toISOString().slice(0,10);
  openModal('modalEmp');
});

// Editar empleado
async function editEmp(id) {
  const emp = await api('/api/empleados/' + id);
  if (!emp) return;
  document.getElementById('modalEmpTitle').textContent = 'Editar Empleado';
  document.getElementById('empId').value         = emp.id;
  document.getElementById('empNombre').value     = emp.nombre;
  document.getElementById('empGenero').value     = emp.genero;
  document.getElementById('empEdad').value       = emp.edad;
  document.getElementById('empDept').value       = emp.departamento;
  document.getElementById('empCargo').value      = emp.cargo;
  document.getElementById('empSupervisor').value = emp.supervisor;
  document.getElementById('empSalario').value    = emp.salario;
  document.getElementById('empFechaInicio').value= emp.fecha_inicio;
  document.getElementById('empEmail').value      = emp.email;
  document.getElementById('empTelefono').value   = emp.telefono;
  document.getElementById('empEstado').value     = emp.estado;
  openModal('modalEmp');
}

// Guardar empleado
document.getElementById('btnSaveEmp').addEventListener('click', async () => {
  const id = document.getElementById('empId').value;
  const data = {
    nombre: document.getElementById('empNombre').value,
    genero: document.getElementById('empGenero').value,
    edad: +document.getElementById('empEdad').value,
    departamento: document.getElementById('empDept').value,
    cargo: document.getElementById('empCargo').value,
    supervisor: document.getElementById('empSupervisor').value,
    salario: +document.getElementById('empSalario').value,
    fecha_inicio: document.getElementById('empFechaInicio').value,
    email: document.getElementById('empEmail').value,
    telefono: document.getElementById('empTelefono').value,
    estado: document.getElementById('empEstado').value,
  };
  if (!data.nombre || !data.cargo) { toast('Complete los campos requeridos', 'error'); return; }
  if (id) {
    await api('/api/empleados/' + id, { method: 'PUT', body: JSON.stringify(data) });
    toast('Empleado actualizado', 'success');
  } else {
    await api('/api/empleados', { method: 'POST', body: JSON.stringify(data) });
    toast('Empleado creado', 'success');
  }
  closeModal('modalEmp');
  fetchAndRenderEmpleados();
});

// Eliminar empleado
async function delEmp(id) {
  if (!confirm('¿Eliminar este empleado?')) return;
  await api('/api/empleados/' + id, { method: 'DELETE' });
  toast('Empleado eliminado');
  fetchAndRenderEmpleados();
}

// ═══════════════════════════════════════════════════════════
//  NÓMINA
// ═══════════════════════════════════════════════════════════
let _nominaChart;

async function loadNomina() {
  const [periodos, resumen] = await Promise.all([
    api('/api/nomina/periodos'),
    api('/api/nomina/resumen'),
  ]);
  if (periodos) {
    const sel = document.getElementById('nominaPeriodo');
    sel.innerHTML = periodos.map(p => `<option value="${p}">${p}</option>`).join('');
  }
  if (resumen) renderNominaResumen(resumen);
}

async function loadPlanilla() {
  const periodo = document.getElementById('nominaPeriodo').value;
  const data = await api('/api/nomina?' + new URLSearchParams({ periodo }));
  if (!data) return;
  document.getElementById('nominaTableBody').innerHTML = data.map(r => `
    <tr>
      <td>${r.nombre}</td>
      <td>${r.departamento}</td>
      <td>${fmtN(r.salario_bruto)}</td>
      <td class="badge-red" style="color:#dc2626">${fmtN(r.ccss_trabajador)}</td>
      <td style="color:#dc2626">${fmtN(r.impuesto_renta)}</td>
      <td style="color:#dc2626">${fmtN(r.banco_popular)}</td>
      <td><strong style="color:#dc2626">${fmtN(r.total_deducciones)}</strong></td>
      <td><strong style="color:#16a34a">${fmtN(r.salario_neto)}</strong></td>
    </tr>`).join('');

  // Chart por departamento
  const byDept = {};
  data.forEach(r => { byDept[r.departamento] = (byDept[r.departamento]||0) + r.salario_bruto; });
  const ctx = document.getElementById('chartNominaDepto');
  if (_nominaChart) _nominaChart.destroy();
  _nominaChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(byDept),
      datasets: [{ data: Object.values(byDept), backgroundColor: ['#2563eb','#10b981','#f59e0b','#ef4444','#8b5cf6'], borderRadius: 6 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#f1f5f9' }, ticks: { callback: v => fmtN(v) } } } }
  });
}

function renderNominaResumen(r) {
  const items = [
    { label: 'Total Empleados', value: r.total_empleados, icon: '👥', color: '#2563eb', bg: '#eff6ff' },
    { label: 'Total Bruto',     value: fmtN(r.total_bruto),  icon: '💵', color: '#8b5cf6', bg: '#f5f3ff' },
    { label: 'Total Neto',      value: fmtN(r.total_neto),   icon: '💰', color: '#10b981', bg: '#dcfce7' },
    { label: 'Costo Patronal',  value: fmtN(r.total_costo_patronal), icon: '🏢', color: '#f59e0b', bg: '#fef3c7' },
  ];
  document.getElementById('nominaResumen').innerHTML = items.map(i => `
    <div class="kpi-card">
      <div class="kpi-icon" style="background:${i.bg}"><span style="font-size:18px">${i.icon}</span></div>
      <div class="kpi-value" style="color:${i.color};font-size:16px">${i.value}</div>
      <div class="kpi-label">${i.label}</div>
    </div>`).join('');
}

document.getElementById('btnVerPlanilla').addEventListener('click', loadPlanilla);

// Calcular individual
document.getElementById('btnCalcIndividual').addEventListener('click', () => openModal('modalCalcNomina'));

document.getElementById('btnDoCalc').addEventListener('click', async () => {
  const id = document.getElementById('calcEmpId').value.trim().toUpperCase();
  if (!id) { toast('Ingrese un ID de empleado', 'error'); return; }
  const r = await api('/api/nomina/calcular/' + id);
  if (!r || !r.salario_bruto) { toast('Empleado no encontrado', 'error'); return; }
  document.getElementById('calcResult').innerHTML = `
    <div class="calc-box">
      <div style="font-weight:700;margin-bottom:8px">${r.empleado}</div>
      <div class="calc-row"><span>Salario Bruto</span><span>${fmtN(r.salario_bruto)}</span></div>
      <div class="calc-row"><span class="calc-deduction">CCSS Trabajador (5.5%)</span><span class="calc-deduction">- ${fmtN(r.ccss_trabajador)}</span></div>
      <div class="calc-row"><span class="calc-deduction">Impuesto de Renta</span><span class="calc-deduction">- ${fmtN(r.impuesto_renta)}</span></div>
      <div class="calc-row"><span class="calc-deduction">Banco Popular (1%)</span><span class="calc-deduction">- ${fmtN(r.banco_popular)}</span></div>
      <div class="calc-row total calc-net"><span>Salario Neto</span><span>${fmtN(r.salario_neto)}</span></div>
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b">
        <div>CCSS Patronal (26.67%): ${fmtN(r.ccss_patronal)}</div>
        <div>Costo Total Patronal: ${fmtN(r.costo_total_patronal)}</div>
        <div>Aguinaldo mensual: ${fmtN(r.aguinaldo_mensual)}</div>
        <div>Vacaciones mensual: ${fmtN(r.vacaciones_mensual)}</div>
      </div>
    </div>`;
});

// ═══════════════════════════════════════════════════════════
//  ASISTENCIA
// ═══════════════════════════════════════════════════════════
async function loadAsistencia() {
  const chart = await api('/api/asistencia/chart');
  if (chart) {
    const est = chart.por_estado;
    buildDoughnut('chartAsiEstado', Object.keys(est), Object.values(est), ['#10b981','#ef4444','#f59e0b']);
    const abs = chart.ausencias_por_dept;
    buildBarChart('chartAsiDepto', abs.map(d=>d.departamento), abs.map(d=>d.ausencias), ['#ef4444']);
  }
  await fetchAsistencia();
}

async function fetchAsistencia() {
  const mes  = document.getElementById('asiMes').value;
  const dept = document.getElementById('asiDept').value;
  const data = await api('/api/asistencia?' + new URLSearchParams({ mes, departamento: dept }));
  if (!data) return;
  document.getElementById('asiTableBody').innerHTML = data.slice(0, 50).map(r => `
    <tr>
      <td>${r.empleado}</td>
      <td>${r.departamento}</td>
      <td>${r.fecha}</td>
      <td><span class="badge ${r.estado==='Presente'?'badge-green':r.estado==='Tardanza'?'badge-amber':'badge-red'}">${r.estado}</span></td>
      <td>${r.hora_entrada||'—'}</td>
      <td>${r.hora_salida||'—'}</td>
    </tr>`).join('');
}

document.getElementById('asiMes').addEventListener('change', fetchAsistencia);
document.getElementById('asiDept').addEventListener('change', fetchAsistencia);

document.getElementById('btnNuevaAsistencia').addEventListener('click', () => {
  toast('Registro de asistencia disponible en versión completa con Supabase');
});

// ═══════════════════════════════════════════════════════════
//  EVALUACIONES
// ═══════════════════════════════════════════════════════════
async function loadEvaluaciones() {
  const dept = document.getElementById('evalDept').value;
  const data = await api('/api/evaluaciones?' + new URLSearchParams({ departamento: dept })) || [];

  // Top performers (top 5 puntaje)
  const top = [...data].sort((a,b) => b.puntaje - a.puntaje).slice(0, 5);
  document.getElementById('topPerformers').innerHTML = top.map((e, i) => `
    <div class="performer-card">
      <div class="performer-rank">#${i+1}</div>
      <div class="performer-info">
        <div class="performer-name">${e.empleado}</div>
        <div class="performer-dept">${e.departamento}</div>
      </div>
      <div class="performer-score">${e.puntaje}</div>
    </div>`).join('');

  document.getElementById('evalTableBody').innerHTML = data.slice(0, 30).map(e => `
    <tr>
      <td>${e.empleado}</td>
      <td>${e.departamento}</td>
      <td><span class="badge badge-blue">${e.periodo}</span></td>
      <td>
        <span class="badge ${e.puntaje>=80?'badge-green':e.puntaje>=60?'badge-amber':'badge-red'}">
          ${e.puntaje}
        </span>
      </td>
      <td>${e.metas_cumplidas}/${e.metas_total}</td>
      <td>${e.evaluador}</td>
    </tr>`).join('');
}

document.getElementById('evalDept').addEventListener('change', loadEvaluaciones);

document.getElementById('btnNuevaEval').addEventListener('click', () => openModal('modalEval'));

document.getElementById('btnSaveEval').addEventListener('click', async () => {
  const data = {
    empleado_id: document.getElementById('evalEmpId').value,
    periodo: document.getElementById('evalPeriodo').value,
    puntaje: +document.getElementById('evalPuntaje').value,
    metas_cumplidas: +document.getElementById('evalMetas').value,
    comentarios: document.getElementById('evalComentarios').value,
  };
  if (!data.empleado_id || !data.periodo) { toast('Complete los campos requeridos', 'error'); return; }
  await api('/api/evaluaciones', { method: 'POST', body: JSON.stringify(data) });
  toast('Evaluación guardada', 'success');
  closeModal('modalEval');
  loadEvaluaciones();
});

// ═══════════════════════════════════════════════════════════
//  REPORTES
// ═══════════════════════════════════════════════════════════
let _reportesLoaded = false;

async function loadReportes() {
  if (_reportesLoaded) return;
  _reportesLoaded = true;
  const [rotacion, planilla, ausentismo] = await Promise.all([
    api('/api/reportes/rotacion'),
    api('/api/reportes/costo_planilla'),
    api('/api/reportes/ausentismo'),
  ]);
  if (rotacion)   renderRotacion(rotacion);
  if (planilla)   renderPlanillaChart(planilla);
  if (ausentismo) renderAusentismo(ausentismo);
}

function renderRotacion(r) {
  document.getElementById('rotacionKpis').innerHTML = `
    <div class="kpi-card">
      <div class="kpi-icon" style="background:#fee2e2"><span style="font-size:18px">📉</span></div>
      <div class="kpi-value" style="color:#ef4444">${r.total_bajas}</div>
      <div class="kpi-label">Total Bajas</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon" style="background:#fef3c7"><span style="font-size:18px">🔄</span></div>
      <div class="kpi-value" style="color:#f59e0b">${r.tasa_rotacion}%</div>
      <div class="kpi-label">Tasa de Rotación</div>
    </div>`;
  const ctx = document.getElementById('chartRotacion');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: r.por_departamento.map(d=>d.departamento),
      datasets: [{ data: r.por_departamento.map(d=>d.bajas), backgroundColor: '#ef4444', borderRadius: 6 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#f1f5f9' }, ticks: { stepSize: 1 } } } }
  });
}

function renderPlanillaChart(r) {
  const ctx = document.getElementById('chartPlanilla');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: r.meses.map(m=>m.mes),
      datasets: [{
        label: 'Costo Planilla', data: r.meses.map(m=>m.costo),
        borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,.1)',
        fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#2563eb'
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: v => fmtN(v) } } } }
  });
}

function renderAusentismo(data) {
  const ctx = document.getElementById('chartAusentismo');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d=>d.departamento),
      datasets: [{ data: data.map(d=>d.tasa_promedio), backgroundColor: '#f59e0b', borderRadius: 6 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#f1f5f9' }, ticks: { callback: v => v+'%' } } } }
  });
  document.getElementById('ausentismoTable').innerHTML = data.map(d => `
    <tr>
      <td>${d.departamento}</td>
      <td>${d.empleados}</td>
      <td>${d.tasa_promedio}%</td>
      <td><span class="badge ${d.tasa_promedio<10?'badge-green':d.tasa_promedio<20?'badge-amber':'badge-red'}">${d.tasa_promedio<10?'Normal':d.tasa_promedio<20?'Moderado':'Crítico'}</span></td>
    </tr>`).join('');
}

// ─── Tabs de Reportes ─────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const tab = document.getElementById('tab-' + btn.dataset.tab);
    if (tab) tab.classList.add('active');
  });
});

// ═══════════════════════════════════════════════════════════
//  MÓDULO LOADER
// ═══════════════════════════════════════════════════════════
const _loaded = new Set();

function loadModule(mod) {
  if (_loaded.has(mod)) return;
  _loaded.add(mod);
  if (mod === 'dashboard')    loadDashboard();
  if (mod === 'empleados')    loadEmpleados();
  if (mod === 'nomina')       loadNomina();
  if (mod === 'asistencia')   loadAsistencia();
  if (mod === 'evaluaciones') loadEvaluaciones();
  if (mod === 'reportes')     loadReportes();
}

// ─── Init ─────────────────────────────────────────────────
loadModule('dashboard');
