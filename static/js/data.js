'use strict';

/**
 * data.js — Capa de datos para versión Flask/Python
 * Usa fetch() contra la API REST en vez de localStorage.
 * Los métodos de lectura son síncronos (caché local),
 * los de escritura son async (llaman a la API).
 */
const DB = (() => {
  let _activities = [];
  let _contacts   = [];

  // ── Carga inicial desde la API ────────────────────────────────────────
  async function loadAll() {
    const [acts, conts] = await Promise.all([
      fetch('/api/activities').then(r => r.json()),
      fetch('/api/contacts').then(r => r.json())
    ]);
    _activities = acts;
    _contacts   = conts;
  }

  // ── Lecturas síncronas (desde caché) ──────────────────────────────────
  function getActivities()       { return _activities; }
  function getContacts()         { return _contacts; }
  function getContactById(id)    { return _contacts.find(c => c.id === id) || null; }

  // ── Actividades (async) ───────────────────────────────────────────────
  async function addActivity(data) {
    const item = await _post('/api/activities', data);
    _activities.push(item);
    return item;
  }

  async function updateActivity(id, data) {
    const item = await _put(`/api/activities/${id}`, data);
    const idx  = _activities.findIndex(a => a.id === id);
    if (idx !== -1) _activities[idx] = item;
    return item;
  }

  async function deleteActivity(id) {
    await _delete(`/api/activities/${id}`);
    _activities = _activities.filter(a => a.id !== id);
  }

  // ── Contactos (async) ─────────────────────────────────────────────────
  async function addContact(data) {
    const item = await _post('/api/contacts', data);
    _contacts.push(item);
    return item;
  }

  async function updateContact(id, data) {
    const item = await _put(`/api/contacts/${id}`, data);
    const idx  = _contacts.findIndex(c => c.id === id);
    if (idx !== -1) _contacts[idx] = item;
    return item;
  }

  async function deleteContact(id) {
    await _delete(`/api/contacts/${id}`);
    _contacts = _contacts.filter(c => c.id !== id);
  }

  // ── Helpers fetch ─────────────────────────────────────────────────────
  const _headers = { 'Content-Type': 'application/json' };

  async function _post(url, body) {
    const r = await fetch(url, { method: 'POST', headers: _headers, body: JSON.stringify(body) });
    return r.json();
  }
  async function _put(url, body) {
    const r = await fetch(url, { method: 'PUT', headers: _headers, body: JSON.stringify(body) });
    return r.json();
  }
  async function _delete(url) {
    return fetch(url, { method: 'DELETE' });
  }

  return {
    loadAll,
    getActivities, getContacts, getContactById,
    addActivity,   updateActivity,   deleteActivity,
    addContact,    updateContact,    deleteContact
  };
})();
