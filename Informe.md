# Informe Técnico — Dashboard MCP
## Control de Tareas: Planilla & Quincena

---

## 1. Descripción General

**Dashboard MCP** es una aplicación web SPA (Single Page Application) diseñada para el control y seguimiento de tareas relacionadas con la gestión de planillas y quincenas. Permite registrar actividades con fechas clave, asignar personas de contacto con correos electrónicos, y monitorear el estado de cada tarea mediante un dashboard visual con alertas automáticas.

---

## 2. Tecnologías Utilizadas

### Frontend
| Tecnología       | Versión / Fuente         | Propósito                               |
|-----------------|--------------------------|----------------------------------------|
| HTML5           | Estándar W3C             | Estructura semántica de la aplicación  |
| CSS3            | Estándar W3C             | Estilos y animaciones personalizadas   |
| JavaScript ES6+ | Vanilla JS (sin frameworks) | Lógica de la aplicación, CRUD, UI    |
| Tailwind CSS    | CDN v3.x                 | Clases utilitarias responsive          |
| Font Awesome    | CDN v6.5                 | Iconografía vectorial                  |
| Google Fonts    | Inter (CDN)              | Tipografía principal                   |

### Almacenamiento
| Tecnología     | Propósito                                        |
|---------------|--------------------------------------------------|
| localStorage   | Persistencia de datos en el navegador (sin BD)  |

### Control de Versiones
| Herramienta | Propósito                          |
|------------|-----------------------------------|
| Git        | Control de versiones local y remoto |
| GitHub     | Repositorio remoto público         |

---

## 3. Arquitectura del Proyecto

```
dashboard_mcp/
├── index.html          # Estructura HTML — SPA con 3 vistas
├── css/
│   └── app.css         # Estilos personalizados (complementa Tailwind)
├── js/
│   ├── data.js         # Capa de datos: CRUD con localStorage
│   ├── ui.js           # Capa de presentación: renderizado dinámico
│   └── app.js          # Capa de control: eventos, modales, navegación
├── tasks/
│   └── todo.md         # Plan y seguimiento del proyecto
├── .gitignore          # Exclusiones de control de versiones
├── CLAUDE.md           # Instrucciones de desarrollo
└── Informe.md          # Este documento
```

### Patrón de diseño
Se utilizó el patrón **Módulo Revealing** (IIFE) en JavaScript para encapsular cada capa:
- `DB` — capa de datos (data.js)
- `UI` — capa de presentación (ui.js)
- `App` — capa de control (app.js)

---

## 4. Funcionalidades

### 4.1 Dashboard
- Tarjetas de resumen: Total, Pendientes, En Proceso, Completadas
- Lista de próximas fechas de entrega (≤14 días)
- Panel de alertas automáticas por fechas próximas o vencidas

### 4.2 Actividades (Checklist)
- **Campos por actividad:**
  - Nombre / descripción
  - Tipo: Planilla | 1ra Quincena | 2da Quincena
  - Fecha de entrega de información
  - Fecha de análisis
  - Fecha de envío de información
  - Estado: Pendiente | En Proceso | Completado
  - Persona de contacto asignada
  - Observaciones
- **Operaciones:** Crear, Ver, Editar, Eliminar
- **Marcar como completado** con checkbox inline
- **Filtros** por tipo y estado
- **Exportar a CSV** (compatible con Excel, con BOM UTF-8)
- Vista de **tabla en escritorio**, **tarjetas en móvil**

### 4.3 Contactos
- Campos: Nombre, Cargo, uno o múltiples correos electrónicos
- Operaciones: Crear, Ver, Editar, Eliminar
- Asociación a actividades
- Enlace `mailto:` directo desde la UI

### 4.4 Sistema de Alertas Visual
| Estado de fecha  | Color       | Indicador               |
|-----------------|-------------|------------------------|
| Vencida          | Rojo        | Días desde vencimiento |
| Vence hoy        | Naranja     | "Vence hoy"            |
| Vence en ≤3 días | Amarillo    | Días restantes         |
| Normal           | Verde claro | Fecha OK               |

---

## 5. Diseño Responsive

| Dispositivo  | Comportamiento                          |
|-------------|----------------------------------------|
| Escritorio  | Navbar horizontal, tabla de actividades |
| Tablet      | Idem escritorio                         |
| Móvil       | Navbar hamburguesa, tarjetas apiladas   |

---

## 6. Datos de Ejemplo (Preinstalados)

Al abrir la aplicación por primera vez se cargan automáticamente:

**Actividades de ejemplo (9):**
- 1ra Quincena — Remuneraciones (En Proceso)
- Retención AFP / ONP (Pendiente)
- Declaración PDT PLAME (Pendiente)
- Planilla Mensual — Remuneraciones (Pendiente)
- 2da Quincena — Remuneraciones (Pendiente)
- EsSalud — Declaración y Pago (Pendiente)
- Seguro de Vida Ley (Pendiente)
- 1ra Quincena — Feb (Completado)
- Planilla Mensual — Feb (Completado)

**Contactos de ejemplo (4):**
- Jefa de RR.HH.
- Contador General
- Gerencia General
- Asistente de Planillas

---

## 7. Seguridad

- **Sin backend ni base de datos remota** — todos los datos residen en el navegador del usuario
- **Sin credenciales** — la aplicación no requiere autenticación
- **Sin `.env`** — no hay variables sensibles
- `.gitignore` excluye archivos de entorno, credenciales y claves por defecto
- Validación de formularios con atributos HTML5 (`required`, `type="email"`)

---

## 8. Cómo Usar

### Opción A — Abrir localmente
1. Clonar o descargar el repositorio
2. Abrir `index.html` directamente en el navegador (no requiere servidor)

### Opción B — GitHub Pages (recomendado para acceso desde cualquier dispositivo)
1. Ir al repositorio en GitHub
2. Settings → Pages → Branch: `main` / Folder: `/ (root)`
3. Acceder a la URL publicada

---

## 9. Repositorio

- **GitHub:** https://github.com/mdmq2037-cloud/dashboard_mcp

---

*Generado con Claude Code — Anthropic*
