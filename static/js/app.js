'use strict';

const App = (() => {
  let _currentView = 'dashboard';

  // ── Navegación ────────────────────────────────────────────────────────────
  function navigate(view) {
    _currentView = view;

    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${view}`).classList.remove('hidden');

    ['dashboard', 'actividades', 'contactos'].forEach(v => {
      document.getElementById(`nav-${v}`)?.classList.toggle('active', v === view);
      document.getElementById(`nav-m-${v}`)?.classList.toggle('active', v === view);
    });

    document.getElementById('mobile-menu').classList.add('hidden');

    if (view === 'dashboard')        UI.renderDashboard();
    else if (view === 'actividades') UI.renderActividades();
    else if (view === 'contactos')   UI.renderContactos();
  }

  function toggleMenu() {
    document.getElementById('mobile-menu').classList.toggle('hidden');
  }

  // ── Modal ─────────────────────────────────────────────────────────────────
  function openModal(type, data = null) {
    document.getElementById('modal-title').textContent =
      type === 'actividad'
        ? (data ? 'Editar Actividad'  : 'Nueva Actividad')
        : (data ? 'Editar Contacto'   : 'Nuevo Contacto');

    document.getElementById('modal-body').innerHTML =
      type === 'actividad'
        ? UI.getActividadFormHTML(data)
        : UI.getContactoFormHTML(data);

    document.getElementById('modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
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
    UI.renderActividades();
    UI.renderDashboard();
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
    else    { await DB.addActivity(data);         showToast('Actividad creada',       'success'); }
    closeModal();
    UI.renderActividades();
    UI.renderDashboard();
  }

  async function toggleCompletado(id, checked) {
    await DB.updateActivity(id, { estado: checked ? 'completado' : 'pendiente' });
    UI.renderActividades();
    UI.renderDashboard();
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
    else    { await DB.addContact(data);         showToast('Contacto creado',       'success'); }
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
    navigate('dashboard');
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  }

  return {
    navigate, toggleMenu,
    openModal, closeModal, closeModalOutside,
    editActividad, deleteActividad, submitActividad, toggleCompletado,
    editContacto,  deleteContacto,  submitContacto,
    exportCSV, showToast, init
  };
})();

window.addEventListener('DOMContentLoaded', App.init);
