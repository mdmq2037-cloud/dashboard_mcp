"""
app.py — Servidor Flask para Dashboard MCP
Ejecutar: python app.py
"""
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, jsonify, request, render_template
from database import Database

app = Flask(__name__)
db  = Database()


# ── Ruta principal ────────────────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html')


# ── API Actividades ───────────────────────────────────────────────────────
@app.route('/api/activities', methods=['GET'])
def get_activities():
    return jsonify(db.get_activities())


@app.route('/api/activities', methods=['POST'])
def create_activity():
    activity = db.add_activity(request.get_json(force=True))
    return jsonify(activity), 201


@app.route('/api/activities/<aid>', methods=['PUT'])
def update_activity(aid):
    activity = db.update_activity(aid, request.get_json(force=True))
    if activity:
        return jsonify(activity)
    return jsonify({'error': 'Not found'}), 404


@app.route('/api/activities/<aid>', methods=['DELETE'])
def delete_activity(aid):
    db.delete_activity(aid)
    return jsonify({'ok': True})


# ── API Contactos ─────────────────────────────────────────────────────────
@app.route('/api/contacts', methods=['GET'])
def get_contacts():
    return jsonify(db.get_contacts())


@app.route('/api/contacts', methods=['POST'])
def create_contact():
    contact = db.add_contact(request.get_json(force=True))
    return jsonify(contact), 201


@app.route('/api/contacts/<cid>', methods=['PUT'])
def update_contact(cid):
    contact = db.update_contact(cid, request.get_json(force=True))
    if contact:
        return jsonify(contact)
    return jsonify({'error': 'Not found'}), 404


@app.route('/api/contacts/<cid>', methods=['DELETE'])
def delete_contact(cid):
    db.delete_contact(cid)
    return jsonify({'ok': True})


# ── Main ──────────────────────────────────────────────────────────────────
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
