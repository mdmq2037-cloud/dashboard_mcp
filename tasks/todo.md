# Plan de Desarrollo: Dashboard MCP - Control de Tareas Planilla/Quincena

## Descripción del Proyecto
Aplicativo web responsive (PC y móvil) para el control de tareas de planilla y quincena, con checklist de actividades establecidas, fechas clave, personas de contacto y correos electrónicos de envío.

## Stack Tecnológico
- **Frontend:** HTML5 + CSS3 + JavaScript Vanilla
- **Estilos:** Tailwind CSS (CDN) — sin build process
- **Almacenamiento:** localStorage (sin backend, sin dependencias)
- **Íconos:** Font Awesome (CDN)
- **Repositorio:** GitHub — https://github.com/mdmq2037-cloud/dashboard_mcp.git

## Estructura de Archivos
```
dashboard_mcp/
├── index.html          # App principal (SPA)
├── css/
│   └── app.css         # Estilos personalizados
├── js/
│   ├── app.js          # Lógica principal
│   ├── data.js         # Gestión de datos (localStorage)
│   └── ui.js           # Renderizado de UI
├── .gitignore
├── Informe.md
└── tasks/
    └── todo.md
```

## Funcionalidades del Aplicativo

### Módulo Principal — Dashboard
- Vista resumen: actividades pendientes, en proceso, completadas
- Indicadores visuales (semáforo) por fechas próximas o vencidas
- Filtro por estado, mes y tipo (planilla / quincena)

### Módulo — Actividades (Checklist)
Cada actividad tiene:
- Nombre/descripción de la actividad
- Tipo: Planilla | 1ra Quincena | 2da Quincena
- **Fecha de entrega de información** (input)
- **Fecha de análisis** (input)
- **Fecha de envío de información** (input)
- Estado: Pendiente | En proceso | Completado
- Observaciones/notas

### Módulo — Contactos
- Persona de contacto (nombre + cargo)
- Correo(s) electrónico(s) de envío
- Asociado a cada actividad

### Funcionalidades UX
- Responsive: PC (tabla) y móvil (tarjetas)
- CRUD completo: agregar, editar, eliminar actividades
- Marcar como completado con checkbox
- Exportar a CSV básico
- Notificación visual cuando fecha está próxima (≤3 días)

---

## Tareas

### Fase 1 — Inicialización del Repositorio
- [ ] 1.1 Git init + .gitignore + commit inicial
- [ ] 1.2 Crear estructura de directorios y archivos base

### Fase 2 — HTML Base y Layout Responsive
- [ ] 2.1 index.html con estructura semántica y Tailwind CDN
- [ ] 2.2 Navbar responsive con menú hamburguesa en móvil
- [ ] 2.3 Layout: sidebar/tabs para Dashboard, Actividades, Contactos

### Fase 3 — Módulo Dashboard
- [ ] 3.1 Tarjetas resumen (total, pendientes, en proceso, completados)
- [ ] 3.2 Lista de próximas fechas de entrega (ordenadas)
- [ ] 3.3 Indicadores visuales de alertas por fecha

### Fase 4 — Módulo Actividades (CRUD)
- [ ] 4.1 Tabla/tarjetas de actividades con todos los campos
- [ ] 4.2 Modal formulario para crear/editar actividad
- [ ] 4.3 Eliminar actividad con confirmación
- [ ] 4.4 Checkbox de completado inline
- [ ] 4.5 Filtros por estado y tipo

### Fase 5 — Módulo Contactos
- [ ] 5.1 Lista de contactos con nombre, cargo, emails
- [ ] 5.2 CRUD de contactos
- [ ] 5.3 Asociar contacto a actividad

### Fase 6 — Datos y Persistencia
- [ ] 6.1 Módulo data.js: CRUD con localStorage
- [ ] 6.2 Datos de ejemplo precargados (planilla y quincena típicos)
- [ ] 6.3 Exportar actividades a CSV

### Fase 7 — Calidad y Pulido
- [ ] 7.1 Alertas visuales por fechas próximas/vencidas
- [ ] 7.2 Validaciones en formularios
- [ ] 7.3 Prueba responsive en móvil

### Fase 8 — Documentación e Informe
- [ ] 8.1 Crear Informe.md con descripción técnica completa
- [ ] 8.2 Commit final consolidado

### Fase 9 — GitHub
- [ ] 9.1 Push a https://github.com/mdmq2037-cloud/dashboard_mcp.git
  > ⚠️ PENDIENTE CONFIRMACIÓN DEL USUARIO antes de ejecutar push

---

---

## Fase 10 — Conexión a Supabase

### Objetivo
Migrar la capa de datos de **SQLite local** a **Supabase (PostgreSQL)** manteniendo la misma API interna que usa `app.py`.

### Cambios mínimos necesarios

- [ ] 10.1 Agregar `supabase` a `requirements.txt`
- [ ] 10.2 Crear `.env` con credenciales `SUPABASE_URL` y `SUPABASE_KEY`
- [ ] 10.3 Reescribir `database.py` para usar el cliente Supabase en lugar de SQLite
- [ ] 10.4 Ejecutar SQL en Supabase para crear las tablas `activities`, `contacts`, `settings`
- [ ] 10.5 Verificar que todos los endpoints de `app.py` funcionan correctamente
- [ ] 10.6 Commit con mensaje descriptivo

### Archivos que cambian
| Archivo | Cambio |
|---------|--------|
| `requirements.txt` | Agregar `supabase>=2.0.0` |
| `.env` *(nuevo)* | `SUPABASE_URL` + `SUPABASE_KEY` |
| `database.py` | Reemplazar SQLite por cliente Supabase |
| `app.py` | Cargar `.env` con `python-dotenv` |

### Archivos que NO cambian
- `static/js/` (frontend no se toca)
- `index.html`
- `templates/`

---

## Revisión Final

**Fecha:** 2026-03-09

### Cambios realizados
- [x] Repositorio Git inicializado con `.gitignore` correcto
- [x] `js/data.js` — CRUD completo con localStorage, datos de ejemplo para planilla/quincena
- [x] `js/ui.js` — Renderizado dinámico: dashboard, tabla escritorio, tarjetas móvil, formularios
- [x] `js/app.js` — Navegación SPA, modales, CRUD handlers, exportar CSV, toasts
- [x] `index.html` — Estructura semántica, navbar responsive (hamburguesa en móvil), 3 vistas
- [x] `css/app.css` — Sistema de badges, alertas de fecha, modal, toast, animaciones
- [x] `Informe.md` — Documentación técnica completa
- [x] Push a GitHub: https://github.com/mdmq2037-cloud/dashboard_mcp

### Stack utilizado
- HTML5 + CSS3 + JavaScript Vanilla (ES6+, patrón Módulo Revealing)
- Tailwind CSS CDN + Font Awesome CDN
- localStorage (sin backend, sin dependencias)
- Git + GitHub
