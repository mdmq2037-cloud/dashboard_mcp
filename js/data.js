'use strict';

const DB = (() => {
  const KEYS = {
    activities:  'mcp_activities',
    contacts:    'mcp_contacts',
    initialized: 'mcp_initialized'
  };

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  // ── Datos de ejemplo ──────────────────────────────────────────────────────
  function getSampleContacts() {
    return [
      { id: 'c1', nombre: 'María García',    cargo: 'Jefa de RR.HH.',          emails: ['m.garcia@empresa.com', 'rrhh@empresa.com'] },
      { id: 'c2', nombre: 'Carlos Rodríguez',cargo: 'Contador General',         emails: ['c.rodriguez@empresa.com', 'contabilidad@empresa.com'] },
      { id: 'c3', nombre: 'Ana Torres',      cargo: 'Gerencia General',         emails: ['a.torres@empresa.com'] },
      { id: 'c4', nombre: 'Luis Mendoza',    cargo: 'Asistente de Planillas',   emails: ['l.mendoza@empresa.com'] }
    ];
  }

  function getSampleActivities() {
    return [
      {
        id: 'a1', nombre: '1ra Quincena — Remuneraciones',
        tipo: 'quincena1', fechaEntrega: '2026-03-10', fechaAnalisis: '2026-03-11', fechaEnvio: '2026-03-13',
        estado: 'en_proceso', contactoId: 'c1',
        observaciones: 'Incluir horas extras del período 1-15',
        createdAt: new Date().toISOString()
      },
      {
        id: 'a2', nombre: 'Retención AFP / ONP',
        tipo: 'planilla', fechaEntrega: '2026-03-12', fechaAnalisis: '2026-03-13', fechaEnvio: '2026-03-15',
        estado: 'pendiente', contactoId: 'c2',
        observaciones: 'Verificar nuevos afiliados del mes',
        createdAt: new Date().toISOString()
      },
      {
        id: 'a3', nombre: 'Declaración PDT PLAME Mensual',
        tipo: 'planilla', fechaEntrega: '2026-03-20', fechaAnalisis: '2026-03-22', fechaEnvio: '2026-03-25',
        estado: 'pendiente', contactoId: 'c2',
        observaciones: 'SUNAT — Formulario Virtual 601',
        createdAt: new Date().toISOString()
      },
      {
        id: 'a4', nombre: 'Planilla Mensual — Remuneraciones',
        tipo: 'planilla', fechaEntrega: '2026-03-25', fechaAnalisis: '2026-03-27', fechaEnvio: '2026-03-30',
        estado: 'pendiente', contactoId: 'c1',
        observaciones: 'Planilla completa del mes de marzo',
        createdAt: new Date().toISOString()
      },
      {
        id: 'a5', nombre: '2da Quincena — Remuneraciones',
        tipo: 'quincena2', fechaEntrega: '2026-03-25', fechaAnalisis: '2026-03-26', fechaEnvio: '2026-03-28',
        estado: 'pendiente', contactoId: 'c1',
        observaciones: '',
        createdAt: new Date().toISOString()
      },
      {
        id: 'a6', nombre: 'EsSalud — Declaración y Pago Mensual',
        tipo: 'planilla', fechaEntrega: '2026-03-20', fechaAnalisis: '2026-03-21', fechaEnvio: '2026-03-23',
        estado: 'pendiente', contactoId: 'c2',
        observaciones: '9% de la remuneración asegurable',
        createdAt: new Date().toISOString()
      },
      {
        id: 'a7', nombre: 'Seguro de Vida Ley',
        tipo: 'planilla', fechaEntrega: '2026-03-18', fechaAnalisis: '2026-03-19', fechaEnvio: '2026-03-21',
        estado: 'pendiente', contactoId: 'c4',
        observaciones: 'Verificar nómina de beneficiarios activos',
        createdAt: new Date().toISOString()
      },
      {
        id: 'a8', nombre: '1ra Quincena — Liquidación Feb',
        tipo: 'quincena1', fechaEntrega: '2026-02-10', fechaAnalisis: '2026-02-11', fechaEnvio: '2026-02-13',
        estado: 'completado', contactoId: 'c1',
        observaciones: 'Completado sin observaciones',
        createdAt: new Date().toISOString()
      },
      {
        id: 'a9', nombre: 'Planilla Mensual — Remuneraciones Feb',
        tipo: 'planilla', fechaEntrega: '2026-02-25', fechaAnalisis: '2026-02-27', fechaEnvio: '2026-02-28',
        estado: 'completado', contactoId: 'c1',
        observaciones: '',
        createdAt: new Date().toISOString()
      }
    ];
  }

  // ── Inicialización ────────────────────────────────────────────────────────
  function init() {
    if (!localStorage.getItem(KEYS.initialized)) {
      localStorage.setItem(KEYS.contacts,    JSON.stringify(getSampleContacts()));
      localStorage.setItem(KEYS.activities,  JSON.stringify(getSampleActivities()));
      localStorage.setItem(KEYS.initialized, '1');
    }
  }

  // ── Actividades ───────────────────────────────────────────────────────────
  function getActivities() {
    return JSON.parse(localStorage.getItem(KEYS.activities) || '[]');
  }
  function saveActivities(list) {
    localStorage.setItem(KEYS.activities, JSON.stringify(list));
  }
  function addActivity(data) {
    const list = getActivities();
    const item = { ...data, id: generateId(), createdAt: new Date().toISOString() };
    list.push(item);
    saveActivities(list);
    return item;
  }
  function updateActivity(id, data) {
    const list = getActivities();
    const idx  = list.findIndex(a => a.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...data };
    saveActivities(list);
    return list[idx];
  }
  function deleteActivity(id) {
    saveActivities(getActivities().filter(a => a.id !== id));
  }

  // ── Contactos ─────────────────────────────────────────────────────────────
  function getContacts() {
    return JSON.parse(localStorage.getItem(KEYS.contacts) || '[]');
  }
  function saveContacts(list) {
    localStorage.setItem(KEYS.contacts, JSON.stringify(list));
  }
  function addContact(data) {
    const list = getContacts();
    const item = { ...data, id: generateId() };
    list.push(item);
    saveContacts(list);
    return item;
  }
  function updateContact(id, data) {
    const list = getContacts();
    const idx  = list.findIndex(c => c.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...data };
    saveContacts(list);
    return list[idx];
  }
  function deleteContact(id) {
    saveContacts(getContacts().filter(c => c.id !== id));
  }
  function getContactById(id) {
    return getContacts().find(c => c.id === id) || null;
  }

  return {
    init,
    getActivities, addActivity, updateActivity, deleteActivity,
    getContacts,   addContact,  updateContact,  deleteContact, getContactById
  };
})();
