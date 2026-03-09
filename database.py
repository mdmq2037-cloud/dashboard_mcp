"""
database.py — Capa de datos Supabase para Dashboard MCP
"""
import os
import json
import time
import random
import string
from datetime import datetime
from supabase import create_client, Client


def _get_client() -> Client:
    url = os.environ.get('SUPABASE_URL')
    key = os.environ.get('SUPABASE_KEY')
    if not url or not key:
        raise RuntimeError('Faltan SUPABASE_URL o SUPABASE_KEY en el archivo .env')
    return create_client(url, key)


class Database:
    def __init__(self):
        self.sb: Client = _get_client()
        self._ensure_seeded()

    def _gen_id(self) -> str:
        ts   = time.strftime('%Y%m%d%H%M%S')
        rand = ''.join(random.choices(string.ascii_lowercase + string.digits, k=5))
        return ts + rand

    # ── Seed inicial ──────────────────────────────────────────────────────
    def _ensure_seeded(self):
        res = self.sb.table('settings').select('value').eq('key', 'initialized').execute()
        if res.data:
            return
        self._seed()
        self.sb.table('settings').insert({'key': 'initialized', 'value': '1'}).execute()

    def _seed(self):
        contacts = [
            {'id': 'c1', 'nombre': 'María García',     'cargo': 'Jefa de RR.HH.',        'emails': json.dumps(['m.garcia@empresa.com', 'rrhh@empresa.com'])},
            {'id': 'c2', 'nombre': 'Carlos Rodríguez', 'cargo': 'Contador General',       'emails': json.dumps(['c.rodriguez@empresa.com', 'contabilidad@empresa.com'])},
            {'id': 'c3', 'nombre': 'Ana Torres',       'cargo': 'Gerencia General',       'emails': json.dumps(['a.torres@empresa.com'])},
            {'id': 'c4', 'nombre': 'Luis Mendoza',     'cargo': 'Asistente de Planillas', 'emails': json.dumps(['l.mendoza@empresa.com'])},
        ]
        self.sb.table('contacts').insert(contacts).execute()

        now = datetime.now().isoformat()
        activities = [
            {'id': 'a1', 'nombre': '1ra Quincena — Remuneraciones',       'tipo': 'quincena1', 'fecha_entrega': '2026-03-10', 'fecha_analisis': '2026-03-11', 'fecha_envio': '2026-03-13', 'estado': 'en_proceso', 'contacto_id': 'c1', 'observaciones': 'Incluir horas extras del período 1-15',      'created_at': now},
            {'id': 'a2', 'nombre': 'Retención AFP / ONP',                  'tipo': 'planilla',  'fecha_entrega': '2026-03-12', 'fecha_analisis': '2026-03-13', 'fecha_envio': '2026-03-15', 'estado': 'pendiente',  'contacto_id': 'c2', 'observaciones': 'Verificar nuevos afiliados del mes',          'created_at': now},
            {'id': 'a3', 'nombre': 'Declaración PDT PLAME Mensual',        'tipo': 'planilla',  'fecha_entrega': '2026-03-20', 'fecha_analisis': '2026-03-22', 'fecha_envio': '2026-03-25', 'estado': 'pendiente',  'contacto_id': 'c2', 'observaciones': 'SUNAT — Formulario Virtual 601',               'created_at': now},
            {'id': 'a4', 'nombre': 'Planilla Mensual — Remuneraciones',    'tipo': 'planilla',  'fecha_entrega': '2026-03-25', 'fecha_analisis': '2026-03-27', 'fecha_envio': '2026-03-30', 'estado': 'pendiente',  'contacto_id': 'c1', 'observaciones': 'Planilla completa del mes de marzo',             'created_at': now},
            {'id': 'a5', 'nombre': '2da Quincena — Remuneraciones',        'tipo': 'quincena2', 'fecha_entrega': '2026-03-25', 'fecha_analisis': '2026-03-26', 'fecha_envio': '2026-03-28', 'estado': 'pendiente',  'contacto_id': 'c1', 'observaciones': '',                                              'created_at': now},
            {'id': 'a6', 'nombre': 'EsSalud — Declaración y Pago',         'tipo': 'planilla',  'fecha_entrega': '2026-03-20', 'fecha_analisis': '2026-03-21', 'fecha_envio': '2026-03-23', 'estado': 'pendiente',  'contacto_id': 'c2', 'observaciones': '9% de la remuneración asegurable',              'created_at': now},
            {'id': 'a7', 'nombre': 'Seguro de Vida Ley',                   'tipo': 'planilla',  'fecha_entrega': '2026-03-18', 'fecha_analisis': '2026-03-19', 'fecha_envio': '2026-03-21', 'estado': 'pendiente',  'contacto_id': 'c4', 'observaciones': 'Verificar nómina de beneficiarios activos',     'created_at': now},
            {'id': 'a8', 'nombre': '1ra Quincena — Liquidación Feb',       'tipo': 'quincena1', 'fecha_entrega': '2026-02-10', 'fecha_analisis': '2026-02-11', 'fecha_envio': '2026-02-13', 'estado': 'completado', 'contacto_id': 'c1', 'observaciones': 'Completado sin observaciones',                 'created_at': now},
            {'id': 'a9', 'nombre': 'Planilla Mensual — Remuneraciones Feb','tipo': 'planilla',  'fecha_entrega': '2026-02-25', 'fecha_analisis': '2026-02-27', 'fecha_envio': '2026-02-28', 'estado': 'completado', 'contacto_id': 'c1', 'observaciones': '',                                              'created_at': now},
        ]
        self.sb.table('activities').insert(activities).execute()

    # ── Conversor row → dict ──────────────────────────────────────────────
    @staticmethod
    def _to_activity(row: dict) -> dict:
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
    def _to_contact(row: dict) -> dict:
        return {
            'id':     row['id'],
            'nombre': row['nombre'],
            'cargo':  row['cargo'] or '',
            'emails': json.loads(row['emails'] or '[]'),
        }

    # ── Actividades ───────────────────────────────────────────────────────
    def get_activities(self) -> list:
        res = self.sb.table('activities').select('*').order('created_at').execute()
        return [self._to_activity(r) for r in res.data]

    def add_activity(self, data: dict) -> dict:
        aid = self._gen_id()
        now = datetime.now().isoformat()
        row = {
            'id':            aid,
            'nombre':        data.get('nombre'),
            'tipo':          data.get('tipo'),
            'fecha_entrega': data.get('fechaEntrega'),
            'fecha_analisis':data.get('fechaAnalisis'),
            'fecha_envio':   data.get('fechaEnvio'),
            'estado':        data.get('estado', 'pendiente'),
            'contacto_id':   data.get('contactoId'),
            'observaciones': data.get('observaciones'),
            'created_at':    now,
        }
        self.sb.table('activities').insert(row).execute()
        return {**data, 'id': aid, 'createdAt': now}

    def update_activity(self, aid: str, data: dict) -> dict | None:
        updates = {
            'nombre':        data.get('nombre'),
            'tipo':          data.get('tipo'),
            'fecha_entrega': data.get('fechaEntrega'),
            'fecha_analisis':data.get('fechaAnalisis'),
            'fecha_envio':   data.get('fechaEnvio'),
            'estado':        data.get('estado'),
            'contacto_id':   data.get('contactoId'),
            'observaciones': data.get('observaciones'),
        }
        self.sb.table('activities').update(updates).eq('id', aid).execute()
        res = self.sb.table('activities').select('*').eq('id', aid).execute()
        return self._to_activity(res.data[0]) if res.data else None

    def delete_activity(self, aid: str):
        self.sb.table('activities').delete().eq('id', aid).execute()

    # ── Contactos ─────────────────────────────────────────────────────────
    def get_contacts(self) -> list:
        res = self.sb.table('contacts').select('*').execute()
        return [self._to_contact(r) for r in res.data]

    def add_contact(self, data: dict) -> dict:
        cid = self._gen_id()
        row = {
            'id':     cid,
            'nombre': data.get('nombre'),
            'cargo':  data.get('cargo'),
            'emails': json.dumps(data.get('emails', [])),
        }
        self.sb.table('contacts').insert(row).execute()
        return {**data, 'id': cid}

    def update_contact(self, cid: str, data: dict) -> dict | None:
        updates = {
            'nombre': data.get('nombre'),
            'cargo':  data.get('cargo'),
            'emails': json.dumps(data.get('emails', [])),
        }
        self.sb.table('contacts').update(updates).eq('id', cid).execute()
        res = self.sb.table('contacts').select('*').eq('id', cid).execute()
        return self._to_contact(res.data[0]) if res.data else None

    def delete_contact(self, cid: str):
        self.sb.table('contacts').delete().eq('id', cid).execute()
