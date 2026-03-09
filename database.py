"""
database.py — Capa de datos PostgreSQL (Supabase) para Dashboard MCP
"""
import os
import json
import time
import random
import string
from datetime import datetime

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()


def _get_conn():
    return psycopg2.connect(os.getenv('DATABASE_URL'), sslmode='require')


class Database:
    def __init__(self, _unused=None):
        self._init_db()

    def _conn(self):
        return _get_conn()

    def _gen_id(self) -> str:
        ts   = time.strftime('%Y%m%d%H%M%S')
        rand = ''.join(random.choices(string.ascii_lowercase + string.digits, k=5))
        return ts + rand

    def _init_db(self):
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute('''CREATE TABLE IF NOT EXISTS activities (
                    id            TEXT PRIMARY KEY,
                    nombre        TEXT NOT NULL,
                    tipo          TEXT,
                    fecha_entrega   TEXT,
                    fecha_analisis  TEXT,
                    fecha_envio     TEXT,
                    estado        TEXT DEFAULT 'pendiente',
                    contacto_id   TEXT,
                    observaciones TEXT,
                    created_at    TEXT
                )''')
                cur.execute('''CREATE TABLE IF NOT EXISTS contacts (
                    id     TEXT PRIMARY KEY,
                    nombre TEXT NOT NULL,
                    cargo  TEXT,
                    emails TEXT
                )''')
                cur.execute('''CREATE TABLE IF NOT EXISTS settings (
                    key   TEXT PRIMARY KEY,
                    value TEXT
                )''')
                cur.execute("SELECT value FROM settings WHERE key='initialized'")
                if not cur.fetchone():
                    self._seed(cur)
                    cur.execute("INSERT INTO settings VALUES ('initialized','1')")

    @staticmethod
    def _to_activity(row) -> dict:
        return {
            'id':            row['id'],
            'nombre':        row['nombre'],
            'tipo':          row['tipo'],
            'fechaEntrega':  row['fecha_entrega'],
            'fechaAnalisis': row['fecha_analisis'],
            'fechaEnvio':    row['fecha_envio'],
            'estado':        row['estado'],
            'contactoId':    row['contacto_id'],
            'observaciones': row['observaciones'] or '',
            'createdAt':     row['created_at'],
        }

    @staticmethod
    def _to_contact(row) -> dict:
        return {
            'id':     row['id'],
            'nombre': row['nombre'],
            'cargo':  row['cargo'] or '',
            'emails': json.loads(row['emails'] or '[]'),
        }

    def get_activities(self) -> list:
        with self._conn() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute('SELECT * FROM activities ORDER BY created_at')
                rows = cur.fetchall()
        return [self._to_activity(r) for r in rows]

    def add_activity(self, data: dict) -> dict:
        aid = self._gen_id()
        now = datetime.now().isoformat()
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'INSERT INTO activities VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)',
                    (aid,
                     data.get('nombre'),        data.get('tipo'),
                     data.get('fechaEntrega'),  data.get('fechaAnalisis'),
                     data.get('fechaEnvio'),    data.get('estado', 'pendiente'),
                     data.get('contactoId'),    data.get('observaciones'),
                     now)
                )
        return {**data, 'id': aid, 'createdAt': now}

    def update_activity(self, aid: str, data: dict) -> dict | None:
        with self._conn() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    '''UPDATE activities
                       SET nombre=%s, tipo=%s, fecha_entrega=%s, fecha_analisis=%s,
                           fecha_envio=%s, estado=%s, contacto_id=%s, observaciones=%s
                       WHERE id=%s''',
                    (data.get('nombre'),        data.get('tipo'),
                     data.get('fechaEntrega'),  data.get('fechaAnalisis'),
                     data.get('fechaEnvio'),    data.get('estado'),
                     data.get('contactoId'),    data.get('observaciones'),
                     aid)
                )
                cur.execute('SELECT * FROM activities WHERE id=%s', (aid,))
                row = cur.fetchone()
        return self._to_activity(row) if row else None

    def delete_activity(self, aid: str):
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute('DELETE FROM activities WHERE id=%s', (aid,))

    def get_contacts(self) -> list:
        with self._conn() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute('SELECT * FROM contacts')
                rows = cur.fetchall()
        return [self._to_contact(r) for r in rows]

    def add_contact(self, data: dict) -> dict:
        cid = self._gen_id()
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'INSERT INTO contacts VALUES (%s,%s,%s,%s)',
                    (cid, data.get('nombre'), data.get('cargo'),
                     json.dumps(data.get('emails', [])))
                )
        return {**data, 'id': cid}

    def update_contact(self, cid: str, data: dict) -> dict | None:
        with self._conn() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    'UPDATE contacts SET nombre=%s, cargo=%s, emails=%s WHERE id=%s',
                    (data.get('nombre'), data.get('cargo'),
                     json.dumps(data.get('emails', [])), cid)
                )
                cur.execute('SELECT * FROM contacts WHERE id=%s', (cid,))
                row = cur.fetchone()
        return self._to_contact(row) if row else None

    def delete_contact(self, cid: str):
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute('DELETE FROM contacts WHERE id=%s', (cid,))

    def _seed(self, cur):
        contacts = [
            ('c1', 'María García',     'Jefa de RR.HH.',         '["m.garcia@empresa.com","rrhh@empresa.com"]'),
            ('c2', 'Carlos Rodríguez', 'Contador General',        '["c.rodriguez@empresa.com","contabilidad@empresa.com"]'),
            ('c3', 'Ana Torres',       'Gerencia General',        '["a.torres@empresa.com"]'),
            ('c4', 'Luis Mendoza',     'Asistente de Planillas',  '["l.mendoza@empresa.com"]'),
        ]
        cur.executemany('INSERT INTO contacts VALUES (%s,%s,%s,%s)', contacts)

        now = datetime.now().isoformat()
        activities = [
            ('a1','1ra Quincena — Remuneraciones',  'quincena1','2026-03-10','2026-03-11','2026-03-13','en_proceso','c1','Incluir horas extras del período 1-15',now),
            ('a2','Retención AFP / ONP',             'planilla', '2026-03-12','2026-03-13','2026-03-15','pendiente', 'c2','Verificar nuevos afiliados del mes',now),
            ('a3','Declaración PDT PLAME Mensual',   'planilla', '2026-03-20','2026-03-22','2026-03-25','pendiente', 'c2','SUNAT — Formulario Virtual 601',now),
            ('a4','Planilla Mensual — Remuneraciones','planilla','2026-03-25','2026-03-27','2026-03-30','pendiente', 'c1','Planilla completa del mes de marzo',now),
            ('a5','2da Quincena — Remuneraciones',   'quincena2','2026-03-25','2026-03-26','2026-03-28','pendiente', 'c1','',now),
            ('a6','EsSalud — Declaración y Pago',    'planilla', '2026-03-20','2026-03-21','2026-03-23','pendiente', 'c2','9% de la remuneración asegurable',now),
            ('a7','Seguro de Vida Ley',              'planilla', '2026-03-18','2026-03-19','2026-03-21','pendiente', 'c4','Verificar nómina de beneficiarios activos',now),
            ('a8','1ra Quincena — Liquidación Feb',  'quincena1','2026-02-10','2026-02-11','2026-02-13','completado','c1','Completado sin observaciones',now),
            ('a9','Planilla Mensual — Remuneraciones Feb','planilla','2026-02-25','2026-02-27','2026-02-28','completado','c1','',now),
        ]
        cur.executemany(
            'INSERT INTO activities VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)', activities
        )
