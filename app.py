"""
app.py — Sistema Integral de Recursos Humanos y Nómina
"""
import os
from functools import wraps
from flask import Flask, jsonify, request, render_template, session, redirect, url_for
from dotenv import load_dotenv
from database import Database

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'rrhh-secret-2024')
db = Database()


# ── Auth ──────────────────────────────────────────────────────────────────────
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('logged_in'):
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated


@app.route('/login', methods=['GET', 'POST'])
def login():
    if session.get('logged_in'):
        return redirect(url_for('index'))
    error = None
    if request.method == 'POST':
        user = request.form.get('username', '')
        pwd  = request.form.get('password', '')
        if db.check_user(user, pwd):
            session['logged_in'] = True
            session['username'] = user
            return redirect(url_for('index'))
        error = 'Usuario o contraseña incorrectos'
    return render_template('login.html', error=error)


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))


# ── Ruta principal ─────────────────────────────────────────────────────────────
@app.route('/')
@login_required
def index():
    return render_template('index.html', username=session.get('username', 'Admin'))


# ── API Dashboard KPIs ─────────────────────────────────────────────────────────
@app.route('/api/dashboard/kpis')
@login_required
def get_kpis():
    return jsonify(db.get_kpis())


@app.route('/api/dashboard/chart/departamentos')
@login_required
def chart_departamentos():
    return jsonify(db.get_chart_departamentos())


@app.route('/api/dashboard/chart/genero')
@login_required
def chart_genero():
    return jsonify(db.get_chart_genero())


@app.route('/api/dashboard/chart/edades')
@login_required
def chart_edades():
    return jsonify(db.get_chart_edades())


@app.route('/api/dashboard/chart/satisfaccion')
@login_required
def chart_satisfaccion():
    return jsonify(db.get_chart_satisfaccion())


# ── API Empleados ──────────────────────────────────────────────────────────────
@app.route('/api/empleados', methods=['GET'])
@login_required
def get_empleados():
    dept   = request.args.get('departamento', '')
    estado = request.args.get('estado', '')
    search = request.args.get('q', '')
    return jsonify(db.get_empleados(dept=dept, estado=estado, search=search))


@app.route('/api/empleados/<eid>', methods=['GET'])
@login_required
def get_empleado(eid):
    emp = db.get_empleado(eid)
    if emp:
        return jsonify(emp)
    return jsonify({'error': 'No encontrado'}), 404


@app.route('/api/empleados', methods=['POST'])
@login_required
def create_empleado():
    emp = db.add_empleado(request.get_json(force=True))
    return jsonify(emp), 201


@app.route('/api/empleados/<eid>', methods=['PUT'])
@login_required
def update_empleado(eid):
    emp = db.update_empleado(eid, request.get_json(force=True))
    if emp:
        return jsonify(emp)
    return jsonify({'error': 'No encontrado'}), 404


@app.route('/api/empleados/<eid>', methods=['DELETE'])
@login_required
def delete_empleado(eid):
    ok = db.delete_empleado(eid)
    if ok:
        return jsonify({'ok': True})
    return jsonify({'error': 'No encontrado'}), 404


# ── API Nómina ─────────────────────────────────────────────────────────────────
@app.route('/api/nomina', methods=['GET'])
@login_required
def get_nomina():
    periodo = request.args.get('periodo', '')
    return jsonify(db.get_nomina(periodo=periodo))


@app.route('/api/nomina/calcular/<eid>', methods=['GET'])
@login_required
def calcular_nomina(eid):
    return jsonify(db.calcular_nomina_empleado(eid))


@app.route('/api/nomina/periodos', methods=['GET'])
@login_required
def get_periodos():
    return jsonify(db.get_periodos_nomina())


@app.route('/api/nomina/resumen', methods=['GET'])
@login_required
def get_resumen_nomina():
    periodo = request.args.get('periodo', '')
    return jsonify(db.get_resumen_nomina(periodo))


# ── API Asistencia ─────────────────────────────────────────────────────────────
@app.route('/api/asistencia', methods=['GET'])
@login_required
def get_asistencia():
    mes  = request.args.get('mes', '')
    dept = request.args.get('departamento', '')
    return jsonify(db.get_asistencia(mes=mes, dept=dept))


@app.route('/api/asistencia', methods=['POST'])
@login_required
def register_asistencia():
    reg = db.add_asistencia(request.get_json(force=True))
    return jsonify(reg), 201


@app.route('/api/asistencia/chart')
@login_required
def chart_asistencia():
    return jsonify(db.get_chart_asistencia())


# ── API Evaluaciones ───────────────────────────────────────────────────────────
@app.route('/api/evaluaciones', methods=['GET'])
@login_required
def get_evaluaciones():
    dept = request.args.get('departamento', '')
    return jsonify(db.get_evaluaciones(dept=dept))


@app.route('/api/evaluaciones', methods=['POST'])
@login_required
def create_evaluacion():
    ev = db.add_evaluacion(request.get_json(force=True))
    return jsonify(ev), 201


@app.route('/api/evaluaciones/<evid>', methods=['PUT'])
@login_required
def update_evaluacion(evid):
    ev = db.update_evaluacion(evid, request.get_json(force=True))
    if ev:
        return jsonify(ev)
    return jsonify({'error': 'No encontrado'}), 404


# ── API Departamentos ──────────────────────────────────────────────────────────
@app.route('/api/departamentos', methods=['GET'])
@login_required
def get_departamentos():
    return jsonify(db.get_departamentos())


# ── API Reportes ───────────────────────────────────────────────────────────────
@app.route('/api/reportes/rotacion')
@login_required
def reporte_rotacion():
    return jsonify(db.get_reporte_rotacion())


@app.route('/api/reportes/costo_planilla')
@login_required
def reporte_costo_planilla():
    return jsonify(db.get_reporte_costo_planilla())


@app.route('/api/reportes/ausentismo')
@login_required
def reporte_ausentismo():
    return jsonify(db.get_reporte_ausentismo())


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
