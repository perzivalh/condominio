import base64
import json
import logging
import os
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, messaging


def _load_firebase_credentials(raw_value: str) -> dict:
    '''Try to interpret the environment variable in multiple formats.'''
    # 1) Raw JSON
    try:
        return json.loads(raw_value)
    except json.JSONDecodeError:
        pass

    # 2) Base64-encoded JSON
    try:
        decoded = base64.b64decode(raw_value).decode('utf-8')
        return json.loads(decoded)
    except (ValueError, json.JSONDecodeError):
        pass

    # 3) Path to JSON file on disk
    candidate_path = Path(raw_value)
    if candidate_path.is_file():
        with candidate_path.open(encoding='utf-8') as fh:
            return json.load(fh)

    raise ValueError('FIREBASE_ADMIN_CREDENTIALS must be JSON, base64 JSON, or a readable file path.')


# Initialize Firebase Admin only once
if not firebase_admin._apps:
    cred_raw = os.environ.get('FIREBASE_ADMIN_CREDENTIALS')
    if cred_raw:
        logging.info('Inicializando Firebase Admin SDK...')
        try:
            cred_dict = _load_firebase_credentials(cred_raw)
        except ValueError as exc:
            logging.error('Could not parse FIREBASE_ADMIN_CREDENTIALS: %s', exc)
            raise
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
        logging.info('Firebase Admin SDK inicializado correctamente.')
    else:
        logging.error('FIREBASE_ADMIN_CREDENTIALS not configured')
        raise Exception('FIREBASE_ADMIN_CREDENTIALS not configured')


def send_fcm_notification(token, title, body, data=None):
    logging.info('Preparando mensaje FCM para token: %s', token)
    message = messaging.Message(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        token=token,
        data=data or {},
    )
    response = messaging.send(message)
    logging.info('Respuesta de FCM: %s', response)
    return response
