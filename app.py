"""
app.py — Servidor Flask para Dashboard MCP
Ejecutar: python app.py
"""
import os
from functools import wraps
from flask import Flask, jsonify, request, render_template, session, redirect, url_for
from dotenv import load_dotenv
from database import Database

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'donet-secret-2024')
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
            return redirect(url_for('index'))
        error = 'Usuario o contraseña incorrectos'
    return render_template('login.html', error=error)


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))


# ── Ruta principal ────────────────────────────────────────────────────────────
@app.route('/')
@login_required
def index():
    return render_template('index.html')


# ── API Actividades ───────────────────────────────────────────────────────────
@app.route('/api/activities', methods=['GET'])
@login_required
def get_activities():
    return jsonify(db.get_activities())


@app.route('/api/activities', methods=['POST'])
@login_required
def create_activity():
    activity = db.add_activity(request.get_json(force=True))
    return jsonify(activity), 201


@app.route('/api/activities/<aid>', methods=['PUT'])
@login_required
def update_activity(aid):
    activity = db.update_activity(aid, request.get_json(force=True))
    if activity:
        return jsonify(activity)
    return jsonify({'error': 'Not found'}), 404


@app.route('/api/activities/<aid>', methods=['DELETE'])
@login_required
def delete_activity(aid):
    db.delete_activity(aid)
    return jsonify({'ok': True})


# ── API Contactos ─────────────────────────────────────────────────────────────
@app.route('/api/contacts', methods=['GET'])
@login_required
def get_contacts():
    return jsonify(db.get_contacts())


@app.route('/api/contacts', methods=['POST'])
@login_required
def create_contact():
    contact = db.add_contact(request.get_json(force=True))
    return jsonify(contact), 201


@app.route('/api/contacts/<cid>', methods=['PUT'])
@login_required
def update_contact(cid):
    contact = db.update_contact(cid, request.get_json(force=True))
    if contact:
        return jsonify(contact)
    return jsonify({'error': 'Not found'}), 404


@app.route('/api/contacts/<cid>', methods=['DELETE'])
@login_required
def delete_contact(cid):
    db.delete_contact(cid)
    return jsonify({'ok': True})


# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    import socket
    try:
        ip = socket.gethostbyname(socket.gethostname())
    except Exception:
        ip = '127.0.0.1'
    print('\n' + '='*50)
    print('  Dashboard MCP — Servidor Flask')
    print('='*50)
    print(f'  PC:     http://localhost:5000')
    print(f'  Celular (misma red): http://{ip}:5000')
    print('  Presiona Ctrl+C para detener')
    print('='*50 + '\n')
    app.run(debug=False, host='0.0.0.0', port=5000)
