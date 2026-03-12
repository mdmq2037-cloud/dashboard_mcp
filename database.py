"""
database.py — Capa de datos: Supabase con fallback a datos demo para Sistema RRHH
"""
import os
import random
import string
import time
from datetime import datetime, date, timedelta

from dotenv import load_dotenv

load_dotenv()

# ── Datos demo integrados ──────────────────────────────────────────────────────
_DEPARTAMENTOS = ['Producción', 'T.I.', 'Administración', 'Ventas', 'Gerencia']
_SUPERVISORES  = ['Arthur Méndez', 'Julie Torres', 'Shirley Ramírez', 'Tamara León',
                  'Liz Vargas', 'Muha Salas', 'Ruben Castro', 'Karen Díaz']

_NOMBRES = [
    'García, Carlos', 'Martínez, María', 'López, José', 'Sánchez, Ana',
    'González, Luis', 'Pérez, Carmen', 'Rodríguez, Pedro', 'Fernández, Laura',
    'Ramírez, Miguel', 'Torres, Rosa', 'Flores, Jorge', 'Rivera, Patricia',
    'Gómez, Francisco', 'Díaz, Elena', 'Cruz, Roberto', 'Morales, Isabel',
    'Reyes, Manuel', 'Jiménez, Sofía', 'Herrera, David', 'Medina, Lucía',
    'Castro, Daniel', 'Ortiz, Marta', 'Ruiz, Javier', 'Álvarez, Andrea',
    'Romero, Ricardo', 'Mendoza, Silvia', 'Silva, Fernando', 'Vargas, Paula',
    'Aguilar, Sergio', 'Campos, Valeria', 'Núñez, Andrés', 'Rojas, Claudia',
    'Gutiérrez, Mario', 'Espinoza, Diana', 'Vega, Héctor', 'Muñoz, Gabriela',
    'Ríos, Ernesto', 'Sandoval, Mónica', 'Ibarra, Alejandro', 'Suárez, Natalia',
]

_random = random.Random(42)

def _gen_empleados():
    emps = []
    dept_counts = {'Producción': 12, 'T.I.': 10, 'Administración': 8, 'Ventas': 6, 'Gerencia': 4}
    depts_list = []
    for d, c in dept_counts.items():
        depts_list.extend([d] * c)
    _random.shuffle(depts_list)

    for i, nombre in enumerate(_NOMBRES):
        dias = _random.randint(180, 5000)
        fecha_inicio = (date.today() - timedelta(days=dias)).strftime('%Y-%m-%d')
        años = round(dias / 365.25, 1)
        edad = _random.randint(23, 62)
        salario_base = 600000 + (edad - 23) * 15000 + años * 20000
        salario = round(salario_base + _random.uniform(-80000, 120000), 2)
        dept = depts_list[i % len(depts_list)]
        genero = 'Femenino' if nombre.split(', ')[1] in ['María','Ana','Carmen','Laura','Rosa','Patricia','Elena','Isabel','Sofía','Lucía','Marta','Andrea','Silvia','Paula','Valeria','Claudia','Diana','Gabriela','Mónica','Natalia'] else 'Masculino'
        emps.append({
            'id': f'EMP{i+1:04d}',
            'nombre': nombre,
            'genero': genero,
            'edad': edad,
            'departamento': dept,
            'cargo': _random.choice(['Analista','Coordinador','Especialista','Técnico','Asistente','Jefe de área']),
            'supervisor': _random.choice(_SUPERVISORES),
            'fecha_inicio': fecha_inicio,
            'años_cargo': años,
            'estado': 'Activo' if _random.random() > 0.08 else 'Inactivo',
            'satisfaccion': _random.choice(['Satisfecho','Insatisfecho','Neutral']),
            'tasa_ausentismo': round(_random.uniform(0, 25), 1),
            'evaluacion': round(_random.uniform(6, 15), 1),
            'salario': salario,
            'email': f"{nombre.split(', ')[1].lower()}.{nombre.split(', ')[0].lower()}@empresa.com",
            'telefono': f'+506 {_random.randint(6000,9999)}-{_random.randint(1000,9999)}',
        })
    return emps

_EMPLEADOS_DEMO = _gen_empleados()


def _gen_asistencia():
    registros = []
    hoy = date.today()
    for emp in _EMPLEADOS_DEMO[:20]:
        for d in range(30):
            dia = hoy - timedelta(days=d)
            if dia.weekday() < 5:  # lunes-viernes
                estado = 'Presente' if _random.random() > 0.1 else _random.choice(['Ausente','Tardanza'])
                registros.append({
                    'id': f'ASI{len(registros)+1:05d}',
                    'empleado_id': emp['id'],
                    'empleado': emp['nombre'],
                    'departamento': emp['departamento'],
                    'fecha': dia.strftime('%Y-%m-%d'),
                    'estado': estado,
                    'hora_entrada': '08:00' if estado == 'Presente' else ('08:45' if estado == 'Tardanza' else ''),
                    'hora_salida': '17:00' if estado != 'Ausente' else '',
                })
    return registros

_ASISTENCIA_DEMO = _gen_asistencia()


def _gen_evaluaciones():
    evals = []
    periodos = ['2025-Q1', '2025-Q2', '2025-Q3', '2025-Q4']
    for emp in _EMPLEADOS_DEMO:
        for per in periodos[-2:]:
            evals.append({
                'id': f'EVAL{len(evals)+1:04d}',
                'empleado_id': emp['id'],
                'empleado': emp['nombre'],
                'departamento': emp['departamento'],
                'periodo': per,
                'puntaje': round(_random.uniform(60, 100), 1),
                'metas_cumplidas': _random.randint(3, 5),
                'metas_total': 5,
                'comentarios': _random.choice([
                    'Excelente desempeño', 'Cumple expectativas',
                    'Supera objetivos', 'Necesita mejoras en puntualidad',
                    'Gran actitud y compromiso', 'Buen trabajo en equipo',
                ]),
                'evaluador': _random.choice(_SUPERVISORES),
                'fecha': (date.today() - timedelta(days=_random.randint(10, 90))).strftime('%Y-%m-%d'),
            })
    return evals

_EVALUACIONES_DEMO = _gen_evaluaciones()


# ── Cálculos de nómina Costa Rica ─────────────────────────────────────────────
def _calcular_deduciones_cr(salario_bruto: float) -> dict:
    """Deducciones según legislación costarricense."""
    ccss_trabajador   = round(salario_bruto * 0.0550, 2)  # 5.5% obrero
    impuesto_renta    = _calcular_renta_cr(salario_bruto)
    banco_popular     = round(salario_bruto * 0.01, 2)
    total_deducciones = ccss_trabajador + impuesto_renta + banco_popular
    salario_neto      = round(salario_bruto - total_deducciones, 2)

    ccss_patronal = round(salario_bruto * 0.2667, 2)  # 26.67% patronal
    aguinaldo     = round(salario_bruto / 12, 2)
    vacaciones    = round(salario_bruto * 10 / 240, 2)

    return {
        'salario_bruto':    round(salario_bruto, 2),
        'ccss_trabajador':  ccss_trabajador,
        'impuesto_renta':   impuesto_renta,
        'banco_popular':    banco_popular,
        'total_deducciones': total_deducciones,
        'salario_neto':     salario_neto,
        'ccss_patronal':    ccss_patronal,
        'aguinaldo_mensual': aguinaldo,
        'vacaciones_mensual': vacaciones,
        'costo_total_patronal': round(salario_bruto + ccss_patronal, 2),
    }


def _calcular_renta_cr(salario: float) -> float:
    """Tramos de renta según DGTD Costa Rica (2024)."""
    if   salario <= 929000:  return 0.0
    elif salario <= 1362000: return round((salario - 929000) * 0.10, 2)
    elif salario <= 2392000: return round((1362000 - 929000)*0.10 + (salario - 1362000)*0.15, 2)
    elif salario <= 4783000: return round((1362000 - 929000)*0.10 + (2392000 - 1362000)*0.15 + (salario - 2392000)*0.20, 2)
    else:
        return round((1362000 - 929000)*0.10 + (2392000 - 1362000)*0.15 +
                     (4783000 - 2392000)*0.20 + (salario - 4783000)*0.25, 2)


def _gen_id() -> str:
    ts   = time.strftime('%Y%m%d%H%M%S')
    rand = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
    return ts + rand


# ── Clase Database ─────────────────────────────────────────────────────────────
class Database:
    """
    Intenta conectar a Supabase; si no hay credenciales usa datos demo en memoria.
    """

    def __init__(self):
        self._client = None
        url = os.getenv('SUPABASE_URL', '')
        key = os.getenv('SUPABASE_KEY', '')
        if url and key:
            try:
                from supabase import create_client
                self._client = create_client(url, key)
            except Exception:
                self._client = None
        # Datos en memoria (demo) — se usan cuando no hay Supabase
        self._empleados   = list(_EMPLEADOS_DEMO)
        self._asistencia  = list(_ASISTENCIA_DEMO)
        self._evaluaciones = list(_EVALUACIONES_DEMO)

    # ── Usuarios ──────────────────────────────────────────────────────────────
    def check_user(self, username: str, password: str) -> bool:
        # Credenciales desde .env o demo por defecto
        valid_user = os.getenv('APP_USER', 'admin')
        valid_pass = os.getenv('APP_PASS', 'rrhh2024')
        if username == valid_user and password == valid_pass:
            return True
        if self._client:
            try:
                res = (self._client.table('users')
                       .select('username')
                       .eq('username', username)
                       .eq('password', password)
                       .execute())
                return len(res.data) > 0
            except Exception:
                pass
        return False

    # ── Dashboard KPIs ────────────────────────────────────────────────────────
    def get_kpis(self) -> dict:
        emps = self._empleados
        activos = [e for e in emps if e['estado'] == 'Activo']
        insatisfechos = [e for e in emps if e['satisfaccion'] == 'Insatisfecho']
        ausentismo_avg = round(sum(e['tasa_ausentismo'] for e in emps) / len(emps), 1) if emps else 0
        planilla_total = round(sum(e['salario'] for e in activos), 2)
        evaluacion_avg = round(sum(e['evaluacion'] for e in emps) / len(emps), 2) if emps else 0
        return {
            'total_empleados': len(emps),
            'empleados_activos': len(activos),
            'costo_planilla': planilla_total,
            'tasa_ausentismo': ausentismo_avg,
            'pct_insatisfechos': round(len(insatisfechos) / len(emps) * 100, 1) if emps else 0,
            'evaluacion_promedio': evaluacion_avg,
            'nuevos_mes': _random.randint(1, 4),
            'bajas_mes': _random.randint(0, 2),
        }

    def get_chart_departamentos(self) -> list:
        from collections import Counter
        activos = [e for e in self._empleados if e['estado'] == 'Activo']
        c = Counter(e['departamento'] for e in activos)
        return [{'departamento': k, 'cantidad': v} for k, v in sorted(c.items())]

    def get_chart_genero(self) -> dict:
        from collections import Counter
        c = Counter(e['genero'] for e in self._empleados)
        return dict(c)

    def get_chart_edades(self) -> list:
        rangos = {'18-29': 0, '30-39': 0, '40-49': 0, '50-59': 0, '60+': 0}
        for e in self._empleados:
            edad = e['edad']
            if   edad < 30: rangos['18-29'] += 1
            elif edad < 40: rangos['30-39'] += 1
            elif edad < 50: rangos['40-49'] += 1
            elif edad < 60: rangos['50-59'] += 1
            else:           rangos['60+']   += 1
        return [{'rango': k, 'cantidad': v} for k, v in rangos.items()]

    def get_chart_satisfaccion(self) -> dict:
        from collections import Counter
        c = Counter(e['satisfaccion'] for e in self._empleados)
        return dict(c)

    # ── Empleados ─────────────────────────────────────────────────────────────
    def get_empleados(self, dept='', estado='', search='') -> list:
        result = list(self._empleados)
        if dept:
            result = [e for e in result if e['departamento'] == dept]
        if estado:
            result = [e for e in result if e['estado'] == estado]
        if search:
            s = search.lower()
            result = [e for e in result if s in e['nombre'].lower() or s in e['id'].lower()]
        return result

    def get_empleado(self, eid: str) -> dict | None:
        for e in self._empleados:
            if e['id'] == eid:
                deducciones = _calcular_deduciones_cr(e['salario'])
                return {**e, 'nomina': deducciones}
        return None

    def add_empleado(self, data: dict) -> dict:
        new_id = f"EMP{len(self._empleados)+1:04d}"
        emp = {
            'id': new_id,
            'nombre': data.get('nombre', ''),
            'genero': data.get('genero', 'Masculino'),
            'edad': data.get('edad', 25),
            'departamento': data.get('departamento', 'Administración'),
            'cargo': data.get('cargo', 'Analista'),
            'supervisor': data.get('supervisor', ''),
            'fecha_inicio': data.get('fecha_inicio', date.today().strftime('%Y-%m-%d')),
            'años_cargo': 0,
            'estado': data.get('estado', 'Activo'),
            'satisfaccion': 'Neutral',
            'tasa_ausentismo': 0.0,
            'evaluacion': 10.0,
            'salario': data.get('salario', 600000),
            'email': data.get('email', ''),
            'telefono': data.get('telefono', ''),
        }
        self._empleados.append(emp)
        return emp

    def update_empleado(self, eid: str, data: dict) -> dict | None:
        for i, e in enumerate(self._empleados):
            if e['id'] == eid:
                self._empleados[i] = {**e, **{k: v for k, v in data.items() if k != 'id'}}
                return self._empleados[i]
        return None

    def delete_empleado(self, eid: str) -> bool:
        for i, e in enumerate(self._empleados):
            if e['id'] == eid:
                self._empleados.pop(i)
                return True
        return False

    # ── Nómina ────────────────────────────────────────────────────────────────
    def get_nomina(self, periodo='') -> list:
        activos = [e for e in self._empleados if e['estado'] == 'Activo']
        result = []
        for e in activos:
            ded = _calcular_deduciones_cr(e['salario'])
            result.append({
                'empleado_id': e['id'],
                'nombre': e['nombre'],
                'departamento': e['departamento'],
                'cargo': e['cargo'],
                **ded,
            })
        return result

    def calcular_nomina_empleado(self, eid: str) -> dict:
        emp = self.get_empleado(eid)
        if not emp:
            return {}
        ded = _calcular_deduciones_cr(emp['salario'])
        return {'empleado': emp['nombre'], 'id': eid, **ded}

    def get_periodos_nomina(self) -> list:
        hoy = date.today()
        periodos = []
        for i in range(6):
            mes = hoy.replace(day=1) - timedelta(days=30 * i)
            periodos.append(mes.strftime('%Y-%m'))
        return periodos

    def get_resumen_nomina(self, periodo='') -> dict:
        activos = [e for e in self._empleados if e['estado'] == 'Activo']
        total_bruto = sum(e['salario'] for e in activos)
        total_ded   = sum(_calcular_deduciones_cr(e['salario'])['total_deducciones'] for e in activos)
        total_neto  = total_bruto - total_ded
        total_patronal = sum(_calcular_deduciones_cr(e['salario'])['ccss_patronal'] for e in activos)
        by_dept = {}
        for e in activos:
            d = e['departamento']
            by_dept[d] = by_dept.get(d, 0) + e['salario']
        return {
            'periodo': periodo or date.today().strftime('%Y-%m'),
            'total_empleados': len(activos),
            'total_bruto': round(total_bruto, 2),
            'total_deducciones': round(total_ded, 2),
            'total_neto': round(total_neto, 2),
            'total_costo_patronal': round(total_bruto + total_patronal, 2),
            'por_departamento': [{'departamento': k, 'monto': round(v, 2)} for k, v in by_dept.items()],
        }

    # ── Asistencia ────────────────────────────────────────────────────────────
    def get_asistencia(self, mes='', dept='') -> list:
        result = list(self._asistencia)
        if mes:
            result = [r for r in result if r['fecha'].startswith(mes)]
        if dept:
            result = [r for r in result if r['departamento'] == dept]
        return result

    def add_asistencia(self, data: dict) -> dict:
        reg = {
            'id': f'ASI{len(self._asistencia)+1:05d}',
            'empleado_id': data.get('empleado_id', ''),
            'empleado': data.get('empleado', ''),
            'departamento': data.get('departamento', ''),
            'fecha': data.get('fecha', date.today().strftime('%Y-%m-%d')),
            'estado': data.get('estado', 'Presente'),
            'hora_entrada': data.get('hora_entrada', ''),
            'hora_salida': data.get('hora_salida', ''),
        }
        self._asistencia.append(reg)
        return reg

    def get_chart_asistencia(self) -> dict:
        from collections import Counter
        c = Counter(r['estado'] for r in self._asistencia)
        dept_ausencias = {}
        for r in self._asistencia:
            if r['estado'] == 'Ausente':
                dept_ausencias[r['departamento']] = dept_ausencias.get(r['departamento'], 0) + 1
        return {
            'por_estado': dict(c),
            'ausencias_por_dept': [{'departamento': k, 'ausencias': v} for k, v in dept_ausencias.items()],
        }

    # ── Evaluaciones ──────────────────────────────────────────────────────────
    def get_evaluaciones(self, dept='') -> list:
        result = list(self._evaluaciones)
        if dept:
            result = [e for e in result if e['departamento'] == dept]
        return result

    def add_evaluacion(self, data: dict) -> dict:
        ev = {
            'id': f'EVAL{len(self._evaluaciones)+1:04d}',
            'empleado_id': data.get('empleado_id', ''),
            'empleado': data.get('empleado', ''),
            'departamento': data.get('departamento', ''),
            'periodo': data.get('periodo', ''),
            'puntaje': data.get('puntaje', 0),
            'metas_cumplidas': data.get('metas_cumplidas', 0),
            'metas_total': data.get('metas_total', 5),
            'comentarios': data.get('comentarios', ''),
            'evaluador': data.get('evaluador', ''),
            'fecha': date.today().strftime('%Y-%m-%d'),
        }
        self._evaluaciones.append(ev)
        return ev

    def update_evaluacion(self, evid: str, data: dict) -> dict | None:
        for i, e in enumerate(self._evaluaciones):
            if e['id'] == evid:
                self._evaluaciones[i] = {**e, **{k: v for k, v in data.items() if k != 'id'}}
                return self._evaluaciones[i]
        return None

    # ── Departamentos ─────────────────────────────────────────────────────────
    def get_departamentos(self) -> list:
        return _DEPARTAMENTOS

    # ── Reportes ──────────────────────────────────────────────────────────────
    def get_reporte_rotacion(self) -> dict:
        inactivos = [e for e in self._empleados if e['estado'] == 'Inactivo']
        total = len(self._empleados)
        return {
            'total_bajas': len(inactivos),
            'tasa_rotacion': round(len(inactivos) / total * 100, 1) if total else 0,
            'por_departamento': [
                {'departamento': d, 'bajas': sum(1 for e in inactivos if e['departamento'] == d)}
                for d in _DEPARTAMENTOS
            ],
        }

    def get_reporte_costo_planilla(self) -> dict:
        activos = [e for e in self._empleados if e['estado'] == 'Activo']
        meses = []
        base = sum(e['salario'] for e in activos)
        for i in range(6):
            mes = (date.today().replace(day=1) - timedelta(days=30*i)).strftime('%Y-%m')
            meses.append({'mes': mes, 'costo': round(base * (1 + _random.uniform(-0.03, 0.03)), 2)})
        return {'meses': list(reversed(meses)), 'promedio_mensual': round(base, 2)}

    def get_reporte_ausentismo(self) -> list:
        result = []
        for d in _DEPARTAMENTOS:
            emps = [e for e in self._empleados if e['departamento'] == d]
            avg = round(sum(e['tasa_ausentismo'] for e in emps) / len(emps), 1) if emps else 0
            result.append({'departamento': d, 'tasa_promedio': avg, 'empleados': len(emps)})
        return result
