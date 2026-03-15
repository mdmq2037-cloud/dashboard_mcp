'use strict';

const UI = (() => {

  // ── Helpers de fechas ────────────────────────────────────────────────────
  function formatDate(d) {
    if (!d) return '—';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  }

  function getDaysUntil(dateStr) {
    if (!dateStr) return null;
    const today  = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr + 'T00:00:00');
    return Math.ceil((target - today) / 86400000);
  }

  function getDateStatus(dateStr) {
    const days = getDaysUntil(dateStr);
    if (days === null)  return 'none';
    if (days < 0)       return 'overdue';
    if (days === 0)     return 'today';
    if (days <= 3)      return 'soon';
    return 'ok';
  }

  function dateBadge(dateStr) {
    if (!dateStr) return '<span class="text-gray-400 text-sm">—</span>';
    const status    = getDateStatus(dateStr);
    const formatted = formatDate(dateStr);
    const days      = getDaysUntil(dateStr);
    const cfg = {
      overdue: { cls: 'badge-overdue', icon: 'fa-exclamation-circle', tip: `Vencida hace ${Math.abs(days)}d` },
      today:   { cls: 'badge-today',   icon: 'fa-clock',              tip: 'Vence hoy' },
      soon:    { cls: 'badge-soon',    icon: 'fa-bell',               tip: `Vence en ${days}d` },
      ok:      { cls: 'badge-ok',      icon: '',                      tip: '' }
    };
    const { cls, icon, tip } = cfg[status] || cfg.ok;
    const iconHtml = icon ? `<i class="fas ${icon} mr-1"></i>` : '';
    return `<span class="date-badge ${cls}" title="${tip}">${iconHtml}${formatted}</span>`;
  }

  // ── Badges tipo / estado ─────────────────────────────────────────────────
  const TIPO = {
    quincena:  { label: 'Quincena',   cls: 'badge-quincena1' },
    planilla:  { label: 'Fin de Mes', cls: 'badge-planilla'  },
    // backward compat
    quincena1: { label: 'Quincena',   cls: 'badge-quincena1' },
    quincena2: { label: 'Quincena',   cls: 'badge-quincena2' }
  };
  const ESTADO = {
    pendiente: { label: 'Pendiente',  cls: 'badge-pendiente' },
    en_proceso:{ label: 'En Proceso', cls: 'badge-en-proceso' },
    completado:{ label: 'Completado', cls: 'badge-completado' }
  };

  function tipoBadge(tipo) {
    const t = TIPO[tipo] || { label: tipo, cls: 'badge-gray' };
    return `<span class="badge ${t.cls}">${t.label}</span>`;
  }
  function estadoBadge(estado) {
    const e = ESTADO[estado] || { label: estado, cls: 'badge-gray' };
    return `<span class="badge ${e.cls}">${e.label}</span>`;
  }

  // ── Filtros ──────────────────────────────────────────────────────────────
  function getFilteredActivities() {
    const tipo   = document.getElementById('filter-tipo')?.value   || '';
    const estado = document.getElementById('filter-estado')?.value || '';
    return DB.getActivities().filter(a =>
      (!tipo   || a.tipo   === tipo) &&
      (!estado || a.estado === estado)
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  function renderDashboard() {
    const all        = DB.getActivities();
    const total      = all.length;
    const pendiente  = all.filter(a => a.estado === 'pendiente').length;
    const en_proceso = all.filter(a => a.estado === 'en_proceso').length;
    const completado = all.filter(a => a.estado === 'completado').length;

    document.getElementById('dashboard-cards').innerHTML = `
      <div class="stat-card" style="background:linear-gradient(135deg,#3B82F6,#1D4ED8)">
        <div class="stat-num">${total}</div>
        <div class="stat-label">Total Actividades</div>
        <i class="fas fa-clipboard-list stat-icon"></i>
      </div>
      <div class="stat-card" style="background:linear-gradient(135deg,#F59E0B,#D97706)">
        <div class="stat-num">${pendiente}</div>
        <div class="stat-label">Pendientes</div>
        <i class="fas fa-hourglass-half stat-icon"></i>
      </div>
      <div class="stat-card" style="background:linear-gradient(135deg,#8B5CF6,#6D28D9)">
        <div class="stat-num">${en_proceso}</div>
        <div class="stat-label">En Proceso</div>
        <i class="fas fa-spinner stat-icon"></i>
      </div>
      <div class="stat-card" style="background:linear-gradient(135deg,#10B981,#047857)">
        <div class="stat-num">${completado}</div>
        <div class="stat-label">Completadas</div>
        <i class="fas fa-check-circle stat-icon"></i>
      </div>`;

    // Próximas fechas de entrega (≤14 días, no completadas)
    const upcoming = all
      .filter(a => a.estado !== 'completado' && a.fechaEntrega)
      .map(a => ({ ...a, days: getDaysUntil(a.fechaEntrega) }))
      .filter(a => a.days !== null && a.days >= 0 && a.days <= 14)
      .sort((a, b) => a.days - b.days);

    document.getElementById('upcoming-list').innerHTML = upcoming.length === 0
      ? '<p class="text-gray-400 text-sm text-center py-6">Sin fechas próximas en los próximos 14 días</p>'
      : upcoming.map(a => {
          const contact = DB.getContactById(a.contactoId);
          return `
          <div class="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
            <div class="pt-0.5">${tipoBadge(a.tipo)}</div>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-gray-800 text-sm truncate">${a.nombre}</p>
              ${contact ? `<p class="text-xs text-gray-500 mt-0.5"><i class="fas fa-user mr-1"></i>${contact.nombre}</p>` : ''}
            </div>
            <div class="flex-shrink-0">${dateBadge(a.fechaEntrega)}</div>
          </div>`;
        }).join('');

    // Alertas: vencidas y por vencer (≤3 días)
    const alertItems = [];
    all.filter(a => a.estado !== 'completado').forEach(a => {
      [
        { label: 'Entrega de Información', date: a.fechaEntrega },
        { label: 'Análisis',               date: a.fechaAnalisis },
        { label: 'Envío',                  date: a.fechaEnvio }
      ].forEach(({ label, date }) => {
        const st = getDateStatus(date);
        if (st === 'overdue' || st === 'today' || st === 'soon') {
          alertItems.push({ nombre: a.nombre, label, date, st, days: getDaysUntil(date) });
        }
      });
    });
    alertItems.sort((a, b) => a.days - b.days);

    document.getElementById('alerts-list').innerHTML = alertItems.length === 0
      ? '<p class="text-green-600 text-sm text-center py-6"><i class="fas fa-check-circle mr-2"></i>Sin alertas activas</p>'
      : alertItems.slice(0, 8).map(a => {
          const cfg = {
            overdue: { wrap: 'alert-overdue', icon: 'fa-exclamation-circle text-red-500',    msg: `Vencida hace ${Math.abs(a.days)}d` },
            today:   { wrap: 'alert-today',   icon: 'fa-clock text-orange-500',              msg: 'Vence hoy' },
            soon:    { wrap: 'alert-soon',     icon: 'fa-bell text-yellow-500',              msg: `Vence en ${a.days}d` }
          };
          const { wrap, icon, msg } = cfg[a.st];
          return `
          <div class="alert-row ${wrap}">
            <i class="fas ${icon} flex-shrink-0"></i>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-700 truncate">${a.nombre}</p>
              <p class="text-xs text-gray-500">${a.label}</p>
            </div>
            <span class="text-xs font-semibold whitespace-nowrap ${icon.includes('red') ? 'text-red-600' : icon.includes('orange') ? 'text-orange-600' : 'text-yellow-600'}">${msg}</span>
          </div>`;
        }).join('');
  }

  // ── Actividades ───────────────────────────────────────────────────────────
  function renderActividades() {
    const list      = getFilteredActivities();
    const container = document.getElementById('actividades-container');

    if (list.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-clipboard text-5xl text-gray-300 mb-4"></i>
          <p class="text-lg text-gray-400">No hay actividades registradas</p>
          <p class="text-sm text-gray-300">Haz clic en "Nueva" para agregar una actividad</p>
        </div>`;
      return;
    }

    // Tabla escritorio
    const tableRows = list.map(a => {
      const contact    = DB.getContactById(a.contactoId);
      const completed  = a.estado === 'completado';
      return `
      <tr class="table-row ${completed ? 'opacity-60' : ''}">
        <td class="px-4 py-3">
          <input type="checkbox" ${completed ? 'checked' : ''}
            onchange="App.toggleCompletado('${a.id}', this.checked)"
            class="w-4 h-4 cursor-pointer accent-blue-600">
        </td>
        <td class="px-4 py-3">
          <p class="font-medium text-gray-800 text-sm ${completed ? 'line-through text-gray-400' : ''}">${a.nombre}</p>
          ${a.observaciones ? `<p class="text-xs text-gray-400 truncate max-w-xs mt-0.5">${a.observaciones}</p>` : ''}
        </td>
        <td class="px-4 py-3">${tipoBadge(a.tipo)}</td>
        <td class="px-4 py-3">${dateBadge(a.fechaEntrega)}</td>
        <td class="px-4 py-3">${dateBadge(a.fechaAnalisis)}</td>
        <td class="px-4 py-3">${dateBadge(a.fechaEnvio)}</td>
        <td class="px-4 py-3">${estadoBadge(a.estado)}</td>
        <td class="px-4 py-3">
          ${contact
            ? `<p class="text-xs font-medium text-gray-700">${contact.nombre}</p>
               <p class="text-xs text-gray-400 truncate max-w-[140px]">${contact.emails[0] || ''}</p>`
            : '<span class="text-gray-300 text-xs">—</span>'}
        </td>
        <td class="px-4 py-3">
          <div class="flex gap-2 justify-end">
            <button onclick="App.editActividad('${a.id}')" class="icon-btn text-blue-500 hover:text-blue-700" title="Editar">
              <i class="fas fa-edit"></i>
            </button>
            <button onclick="App.deleteActividad('${a.id}')" class="icon-btn text-red-400 hover:text-red-600" title="Eliminar">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>`;
    }).join('');

    // Tarjetas móvil
    const mobileCards = list.map(a => {
      const contact   = DB.getContactById(a.contactoId);
      const completed = a.estado === 'completado';
      return `
      <div class="activity-card ${completed ? 'opacity-70' : ''}">
        <div class="flex justify-between items-start mb-3">
          <div class="flex items-start gap-3 flex-1 min-w-0">
            <input type="checkbox" ${completed ? 'checked' : ''}
              onchange="App.toggleCompletado('${a.id}', this.checked)"
              class="w-4 h-4 mt-1 cursor-pointer accent-blue-600 flex-shrink-0">
            <div class="min-w-0">
              <p class="font-semibold text-gray-800 text-sm ${completed ? 'line-through text-gray-400' : ''} truncate">${a.nombre}</p>
              <div class="flex gap-2 mt-1 flex-wrap">${tipoBadge(a.tipo)} ${estadoBadge(a.estado)}</div>
            </div>
          </div>
          <div class="flex gap-1 flex-shrink-0 ml-2">
            <button onclick="App.editActividad('${a.id}')" class="icon-btn text-blue-500 hover:text-blue-700 p-1">
              <i class="fas fa-edit"></i>
            </button>
            <button onclick="App.deleteActividad('${a.id}')" class="icon-btn text-red-400 hover:text-red-600 p-1">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        <div class="dates-grid">
          <div><p class="date-label">Entrega Info</p>${dateBadge(a.fechaEntrega)}</div>
          <div><p class="date-label">Análisis</p>${dateBadge(a.fechaAnalisis)}</div>
          <div><p class="date-label">Envío</p>${dateBadge(a.fechaEnvio)}</div>
        </div>
        ${contact ? `
        <div class="contact-row">
          <i class="fas fa-user text-gray-400 flex-shrink-0"></i>
          <span class="font-medium text-gray-700">${contact.nombre}</span>
          <span class="text-gray-400">${contact.cargo}</span>
          ${contact.emails[0] ? `<a href="mailto:${contact.emails[0]}" class="text-blue-500 ml-auto truncate">${contact.emails[0]}</a>` : ''}
        </div>` : ''}
        ${a.observaciones ? `<p class="text-xs text-gray-400 mt-2 italic">${a.observaciones}</p>` : ''}
      </div>`;
    }).join('');

    container.innerHTML = `
      <!-- Tabla escritorio -->
      <div class="hidden md:block bg-white rounded-xl shadow overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b">
            <tr>
              <th class="px-4 py-3 w-8"></th>
              <th class="text-left px-4 py-3 text-gray-600 font-semibold">Actividad</th>
              <th class="text-left px-4 py-3 text-gray-600 font-semibold">Tipo</th>
              <th class="text-left px-4 py-3 text-gray-600 font-semibold">F. Entrega Info</th>
              <th class="text-left px-4 py-3 text-gray-600 font-semibold">F. Análisis</th>
              <th class="text-left px-4 py-3 text-gray-600 font-semibold">F. Envío</th>
              <th class="text-left px-4 py-3 text-gray-600 font-semibold">Estado</th>
              <th class="text-left px-4 py-3 text-gray-600 font-semibold">Contacto</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
      <!-- Tarjetas móvil -->
      <div class="md:hidden space-y-3">${mobileCards}</div>`;
  }

  // ── Contactos ─────────────────────────────────────────────────────────────
  function renderContactos() {
    const contacts  = DB.getContacts();
    const container = document.getElementById('contactos-container');

    if (contacts.length === 0) {
      container.innerHTML = `
        <div class="col-span-3 empty-state">
          <i class="fas fa-address-book text-5xl text-gray-300 mb-4"></i>
          <p class="text-lg text-gray-400">No hay contactos registrados</p>
        </div>`;
      return;
    }

    container.innerHTML = contacts.map(c => `
      <div class="contact-card">
        <div class="flex justify-between items-start mb-3">
          <div class="flex items-center gap-3">
            <div class="avatar">${c.nombre.charAt(0).toUpperCase()}</div>
            <div>
              <p class="font-semibold text-gray-800">${c.nombre}</p>
              <p class="text-sm text-gray-500">${c.cargo || '—'}</p>
            </div>
          </div>
          <div class="flex gap-2">
            <button onclick="App.editContacto('${c.id}')" class="icon-btn text-blue-500 hover:text-blue-700">
              <i class="fas fa-edit"></i>
            </button>
            <button onclick="App.deleteContacto('${c.id}')" class="icon-btn text-red-400 hover:text-red-600">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        <div class="space-y-1.5">
          ${(c.emails || []).map(email => `
          <div class="flex items-center gap-2 text-sm">
            <i class="fas fa-envelope text-gray-400 w-4 flex-shrink-0"></i>
            <a href="mailto:${email}" class="text-blue-600 hover:underline truncate">${email}</a>
          </div>`).join('')}
        </div>
      </div>`).join('');
  }

  // ── Formulario Actividad ──────────────────────────────────────────────────
  function getActividadFormHTML(activity) {
    const contacts = DB.getContacts();
    const v = activity || {};
    return `
      <form id="form-actividad" onsubmit="App.submitActividad(event)">
        <div class="form-grid">
          <div class="col-span-2">
            <label class="form-label">Nombre de la Actividad *</label>
            <input type="text" id="f-nombre" value="${v.nombre || ''}" required
              class="form-input" placeholder="Ej: Planilla Mensual — Remuneraciones">
          </div>

          <div>
            <label class="form-label">Tipo *</label>
            <select id="f-tipo" required class="form-input">
              <option value="">Seleccionar...</option>
              <option value="quincena" ${(v.tipo === 'quincena' || v.tipo === 'quincena1' || v.tipo === 'quincena2') ? 'selected' : ''}>Quincena</option>
              <option value="planilla" ${v.tipo === 'planilla' ? 'selected' : ''}>Fin de Mes</option>
            </select>
          </div>
          <div>
            <label class="form-label">Estado *</label>
            <select id="f-estado" required class="form-input">
              <option value="pendiente"  ${(v.estado || 'pendiente') === 'pendiente'  ? 'selected' : ''}>Pendiente</option>
              <option value="en_proceso" ${v.estado === 'en_proceso' ? 'selected' : ''}>En Proceso</option>
              <option value="completado" ${v.estado === 'completado' ? 'selected' : ''}>Completado</option>
            </select>
          </div>

          <div>
            <label class="form-label">F. Entrega de Información</label>
            <input type="date" id="f-fechaEntrega" value="${v.fechaEntrega || ''}" class="form-input">
          </div>
          <div>
            <label class="form-label">F. Análisis</label>
            <input type="date" id="f-fechaAnalisis" value="${v.fechaAnalisis || ''}" class="form-input">
          </div>
          <div class="col-span-2 sm:col-span-1">
            <label class="form-label">F. Envío de Información</label>
            <input type="date" id="f-fechaEnvio" value="${v.fechaEnvio || ''}" class="form-input">
          </div>
          <div class="col-span-2 sm:col-span-1">
            <label class="form-label">Persona de Contacto</label>
            <select id="f-contactoId" class="form-input">
              <option value="">Sin contacto asignado</option>
              ${contacts.map(c => `
                <option value="${c.id}" ${v.contactoId === c.id ? 'selected' : ''}>
                  ${c.nombre} — ${c.cargo}
                </option>`).join('')}
            </select>
          </div>

          <div class="col-span-2">
            <label class="form-label">Observaciones</label>
            <textarea id="f-observaciones" rows="3" class="form-input"
              placeholder="Notas adicionales...">${v.observaciones || ''}</textarea>
          </div>
        </div>
        <input type="hidden" id="f-id" value="${v.id || ''}">
        <div class="modal-footer">
          <button type="button" onclick="App.closeModal()" class="btn-secondary">Cancelar</button>
          <button type="submit" class="btn-primary">
            <i class="fas fa-save mr-2"></i>${activity ? 'Actualizar' : 'Guardar'}
          </button>
        </div>
      </form>`;
  }

  // ── Formulario Contacto ───────────────────────────────────────────────────
  let _emailCount = 1;

  function getContactoFormHTML(contact) {
    _emailCount = 1;
    const v      = contact || {};
    const emails = v.emails && v.emails.length ? v.emails : [''];
    _emailCount  = emails.length;
    return `
      <form id="form-contacto" onsubmit="App.submitContacto(event)">
        <div class="form-grid">
          <div class="col-span-2">
            <label class="form-label">Nombre Completo *</label>
            <input type="text" id="f-cont-nombre" value="${v.nombre || ''}" required
              class="form-input" placeholder="Ej: María García">
          </div>
          <div class="col-span-2">
            <label class="form-label">Cargo / Área</label>
            <input type="text" id="f-cont-cargo" value="${v.cargo || ''}"
              class="form-input" placeholder="Ej: Jefe de RR.HH.">
          </div>
          <div class="col-span-2">
            <label class="form-label">Correos Electrónicos</label>
            <div id="emails-container" class="space-y-2">
              ${emails.map((email, i) => emailRowHTML(i, email)).join('')}
            </div>
            <button type="button" onclick="UI.addEmailRow()"
              class="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
              <i class="fas fa-plus-circle"></i> Agregar otro correo
            </button>
          </div>
        </div>
        <input type="hidden" id="f-cont-id" value="${v.id || ''}">
        <div class="modal-footer">
          <button type="button" onclick="App.closeModal()" class="btn-secondary">Cancelar</button>
          <button type="submit" class="btn-primary">
            <i class="fas fa-save mr-2"></i>${contact ? 'Actualizar' : 'Guardar'}
          </button>
        </div>
      </form>`;
  }

  function emailRowHTML(idx, value) {
    return `
      <div class="flex gap-2" id="email-row-${idx}">
        <input type="email" value="${value}" placeholder="correo@empresa.com"
          class="form-input flex-1 email-input">
        ${idx > 0
          ? `<button type="button" onclick="UI.removeEmailRow(${idx})"
               class="text-red-400 hover:text-red-600 px-2 flex-shrink-0">
               <i class="fas fa-minus-circle"></i>
             </button>`
          : ''}
      </div>`;
  }

  function addEmailRow() {
    const container = document.getElementById('emails-container');
    const row       = document.createElement('div');
    row.innerHTML   = emailRowHTML(_emailCount, '');
    container.appendChild(row.firstElementChild);
    _emailCount++;
  }

  function removeEmailRow(idx) {
    const row = document.getElementById(`email-row-${idx}`);
    if (row) row.remove();
  }

  function getEmailsFromForm() {
    return Array.from(document.querySelectorAll('.email-input'))
      .map(el => el.value.trim())
      .filter(Boolean);
  }

  return {
    formatDate, getDaysUntil, getDateStatus,
    renderDashboard, renderActividades, renderContactos,
    getActividadFormHTML, getContactoFormHTML,
    addEmailRow, removeEmailRow, getEmailsFromForm
  };
})();
