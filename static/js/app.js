'use strict';

const App = (() => {
  let _currentView = 'panel';

  // ── Navegación ────────────────────────────────────────────────────────────
  function navigate(view) {
    _currentView = view;

    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${view}`).classList.remove('hidden');

    ['panel','indicadores','actividades','contactos'].forEach(v => {
      document.getElementById(`nav-${v}`)?.classList.toggle('active', v === view);
      document.getElementById(`nav-m-${v}`)?.classList.toggle('active', v === view);
    });

    document.getElementById('mobile-menu').classList.add('hidden');

    if      (view === 'panel')        GanttUI.renderPanel();
    else if (view === 'indicadores')  GanttUI.renderIndicadores();
    else if (view === 'actividades')  UI.renderActividades();
    else if (view === 'contactos')    UI.renderContactos();
  }

  function toggleMenu() {
    document.getElementById('mobile-menu').classList.toggle('hidden');
  }

  // ── Modal ─────────────────────────────────────────────────────────────────
  function openModal(type, data = null) {
    document.getElementById('modal-title').textContent =
      type === 'actividad' ? (data ? 'Editar Actividad'  : 'Nueva Actividad')
    : type === 'contacto'  ? (data ? 'Editar Contacto'   : 'Nuevo Contacto')
    : type === 'gantt'     ? 'Configurar Panel — Subactividades y Aprobadores'
    : '';

    document.getElementById('modal-body').innerHTML =
      type === 'actividad' ? UI.getActividadFormHTML(data)
    : type === 'contacto'  ? UI.getContactoFormHTML(data)
    : type === 'gantt'     ? GanttUI.getGanttExtFormHTML(data)
    : '';

    document.getElementById('modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function openGanttModal(actId) {
    openModal('gantt', actId);
  }

  function closeModal() {
    document.getElementById('modal').classList.add('hidden');
    document.body.style.overflow = '';
  }

  function closeModalOutside(e) {
    if (e.target === document.getElementById('modal')) closeModal();
  }

  // ── Actividades ───────────────────────────────────────────────────────────
  function editActividad(id) {
    const act = DB.getActivities().find(a => a.id === id);
    if (act) openModal('actividad', act);
  }

  async function deleteActividad(id) {
    if (!confirm('¿Eliminar esta actividad?')) return;
    await DB.deleteActivity(id);
    _refreshCurrentView();
    showToast('Actividad eliminada', 'error');
  }

  async function submitActividad(e) {
    e.preventDefault();
    const id   = document.getElementById('f-id').value;
    const data = {
      nombre:        document.getElementById('f-nombre').value.trim(),
      tipo:          document.getElementById('f-tipo').value,
      estado:        document.getElementById('f-estado').value,
      fechaEntrega:  document.getElementById('f-fechaEntrega').value,
      fechaAnalisis: document.getElementById('f-fechaAnalisis').value,
      fechaEnvio:    document.getElementById('f-fechaEnvio').value,
      contactoId:    document.getElementById('f-contactoId').value,
      observaciones: document.getElementById('f-observaciones').value.trim()
    };
    if (id) { await DB.updateActivity(id, data); showToast('Actividad actualizada', 'success'); }
    else    { await DB.addActivity(data);         showToast('Actividad creada', 'success'); }
    closeModal();
    _refreshCurrentView();
  }

  async function toggleCompletado(id, checked) {
    await DB.updateActivity(id, { estado: checked ? 'completado' : 'pendiente' });
    UI.renderActividades();
  }

  // ── Gantt: acciones inline ────────────────────────────────────────────────
  function toggleGanttSubact(actId, subId) {
    GanttData.toggleSubact(actId, subId);
    GanttUI.renderPanel();
  }

  function toggleAprobacion(actId, nivel) {
    GanttData.toggleAprobacion(actId, nivel);
    GanttUI.renderPanel();
  }

  function incReproceso(actId) {
    GanttData.incReproceso(actId);
    GanttUI.renderPanel();
    showToast('Reproceso registrado', 'info');
  }

  function submitGanttExt(e) {
    e.preventDefault();
    const actId = document.getElementById('gf-actid').value;
    GanttData.setExt(actId, {
      enviadoPor:         document.getElementById('gf-enviadoPor').value.trim(),
      demora:             parseInt(document.getElementById('gf-demora').value, 10) || 0,
      reprocesos:         parseInt(document.getElementById('gf-reprocesos').value, 10) || 0,
      validacion:         document.getElementById('gf-validacion').value,
      aprobadorJefatura:  document.getElementById('gf-jefatura').value,
      aprobadorGerencia:  document.getElementById('gf-gerencia').value,
      aprobadorDireccion: document.getElementById('gf-direccion').value
    });
    closeModal();
    GanttUI.renderPanel();
    showToast('Configuración guardada', 'success');
  }

  // ── Contactos ─────────────────────────────────────────────────────────────
  function editContacto(id) {
    const contact = DB.getContacts().find(c => c.id === id);
    if (contact) openModal('contacto', contact);
  }

  async function deleteContacto(id) {
    if (!confirm('¿Eliminar este contacto?')) return;
    await DB.deleteContact(id);
    UI.renderContactos();
    showToast('Contacto eliminado', 'error');
  }

  async function submitContacto(e) {
    e.preventDefault();
    const id   = document.getElementById('f-cont-id').value;
    const data = {
      nombre: document.getElementById('f-cont-nombre').value.trim(),
      cargo:  document.getElementById('f-cont-cargo').value.trim(),
      emails: UI.getEmailsFromForm()
    };
    if (id) { await DB.updateContact(id, data); showToast('Contacto actualizado', 'success'); }
    else    { await DB.addContact(data);         showToast('Contacto creado', 'success'); }
    closeModal();
    UI.renderContactos();
  }

  // ── Exportar CSV ──────────────────────────────────────────────────────────
  function exportCSV() {
    const headers = [
      'Actividad', 'Tipo', 'F. Entrega Info',
      'F. Análisis', 'F. Envío', 'Estado',
      'Contacto', 'Correos', 'Observaciones'
    ];
    const TIPOS   = { planilla: 'Planilla', quincena1: '1ra Quincena', quincena2: '2da Quincena' };
    const ESTADOS = { pendiente: 'Pendiente', en_proceso: 'En Proceso', completado: 'Completado' };

    const rows = DB.getActivities().map(a => {
      const c = DB.getContactById(a.contactoId);
      return [
        `"${a.nombre}"`,
        TIPOS[a.tipo]    || a.tipo,
        a.fechaEntrega   || '',
        a.fechaAnalisis  || '',
        a.fechaEnvio     || '',
        ESTADOS[a.estado]|| a.estado,
        c ? `"${c.nombre}"` : '',
        c ? `"${(c.emails || []).join('; ')}"` : '',
        `"${(a.observaciones || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csv  = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `actividades_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('CSV exportado correctamente', 'success');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function _refreshCurrentView() {
    if      (_currentView === 'panel')       GanttUI.renderPanel();
    else if (_currentView === 'indicadores') GanttUI.renderIndicadores();
    else if (_currentView === 'actividades') UI.renderActividades();
  }

  // ── Toast ─────────────────────────────────────────────────────────────────
  let _toastTimer = null;
  function showToast(msg, type = 'success') {
    const el  = document.getElementById('toast');
    const cls = { success: 'bg-green-600', error: 'bg-red-500', info: 'bg-blue-600' };
    el.textContent = msg;
    el.className   = `toast show ${cls[type] || cls.info}`;
    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => { el.classList.remove('show'); }, 3000);
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  async function init() {
    try {
      await DB.loadAll();
    } catch (err) {
      console.error('Error cargando datos:', err);
    }
    navigate('panel');
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  }

  return {
    navigate, toggleMenu,
    openModal, openGanttModal, closeModal, closeModalOutside,
    editActividad, deleteActividad, submitActividad, toggleCompletado,
    toggleGanttSubact, toggleAprobacion, incReproceso, submitGanttExt,
    editContacto, deleteContacto, submitContacto,
    exportCSV, showToast, init
  };
})();

window.addEventListener('DOMContentLoaded', App.init);
