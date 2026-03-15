"""
database.py — Capa de datos via Supabase REST API para Dashboard MCP
"""
import os
import json
import time
import random
import string
from datetime import datetime

from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()


def _get_client() -> Client:
    return create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))


class Database:
    def __init__(self, _unused=None):
        self.client = _get_client()

    def _gen_id(self) -> str:
        ts   = time.strftime('%Y%m%d%H%M%S')
        rand = ''.join(random.choices(string.ascii_lowercase + string.digits, k=5))
        return ts + rand

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

    # ── Usuarios ──────────────────────────────────────────────────────────────
    def check_user(self, username: str, password: str) -> bool:
        res = (self.client.table('users')
               .select('username')
               .eq('username', username)
               .eq('password', password)
               .execute())
        return len(res.data) > 0

    # ── Actividades ───────────────────────────────────────────────────────────
    def get_activities(self) -> list:
        res = self.client.table('activities').select('*').order('created_at').execute()
        return [self._to_activity(r) for r in res.data]

    def add_activity(self, data: dict) -> dict:
        aid = self._gen_id()
        now = datetime.now().isoformat()
        row = {
            'id':             aid,
            'nombre':         data.get('nombre'),
            'tipo':           data.get('tipo'),
            'fecha_entrega':  data.get('fechaEntrega'),
            'fecha_analisis': data.get('fechaAnalisis'),
            'fecha_envio':    data.get('fechaEnvio'),
            'estado':         data.get('estado', 'pendiente'),
            'contacto_id':    data.get('contactoId'),
            'observaciones':  data.get('observaciones'),
            'created_at':     now,
        }
        self.client.table('activities').insert(row).execute()
        return {**data, 'id': aid, 'createdAt': now}

    def update_activity(self, aid: str, data: dict) -> dict | None:
        _map = {
            'nombre':        'nombre',
            'tipo':          'tipo',
            'fechaEntrega':  'fecha_entrega',
            'fechaAnalisis': 'fecha_analisis',
            'fechaEnvio':    'fecha_envio',
            'estado':        'estado',
            'contactoId':    'contacto_id',
            'observaciones': 'observaciones',
        }
        row = {db_col: data[js_key] for js_key, db_col in _map.items() if js_key in data}
        if not row:
            return None
        res = self.client.table('activities').update(row).eq('id', aid).execute()
        return self._to_activity(res.data[0]) if res.data else None

    def delete_activity(self, aid: str):
        self.client.table('activities').delete().eq('id', aid).execute()

    # ── Contactos ─────────────────────────────────────────────────────────────
    def get_contacts(self) -> list:
        res = self.client.table('contacts').select('*').execute()
        return [self._to_contact(r) for r in res.data]

    def add_contact(self, data: dict) -> dict:
        cid = self._gen_id()
        row = {
            'id':     cid,
            'nombre': data.get('nombre'),
            'cargo':  data.get('cargo'),
            'emails': json.dumps(data.get('emails', [])),
        }
        self.client.table('contacts').insert(row).execute()
        return {**data, 'id': cid}

    def update_contact(self, cid: str, data: dict) -> dict | None:
        row = {}
        if 'nombre' in data:
            row['nombre'] = data['nombre']
        if 'cargo' in data:
            row['cargo'] = data['cargo']
        if 'emails' in data:
            row['emails'] = json.dumps(data['emails'])
        if not row:
            return None
        res = self.client.table('contacts').update(row).eq('id', cid).execute()
        return self._to_contact(res.data[0]) if res.data else None

    def delete_contact(self, cid: str):
        self.client.table('contacts').delete().eq('id', cid).execute()
