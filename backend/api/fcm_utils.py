import base64
import json
import logging
import os
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, messaging


def _load_firebase_credentials(raw_value: str) -> dict:
    """Intenta interpretar la variable de entorno en múltiples formatos."""
    # 1) JSON plano
    try:
        return json.loads(raw_value)
    except json.JSONDecodeError:
        pass

    # 2) Base64 -> JSON
    try:
        decoded = base64.b64decode(raw_value).decode("utf-8")
        return json.loads(decoded)
    except (ValueError, json.JSONDecodeError):
        pass

    # 3) Ruta a archivo en disco
    candidate_path = Path(raw_value)
    if candidate_path.is_file():
        with candidate_path.open(encoding="utf-8") as fh:
            return json.load(fh)

    raise ValueError("FIREBASE_ADMIN_CREDENTIALS no contiene JSON válido ni una ruta accesible.")


# Inicializa Firebase Admin solo una vez
if not firebase_admin._apps:
    cred_raw = os.environ.get("FIREBASE_ADMIN_CREDENTIALS")
    if cred_raw:
        logging.info("Inicializando Firebase Admin SDK...")
        try:
            cred_dict = _load_firebase_credentials(cred_raw)
        except ValueError as exc:
            logging.error("No se pudo interpretar FIREBASE_ADMIN_CREDENTIALS: %s", exc)
            raise
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
        logging.info("Firebase Admin SDK inicializado correctamente.")
    else:
        logging.error("FIREBASE_ADMIN_CREDENTIALS no configurada")
        raise Exception("FIREBASE_ADMIN_CREDENTIALS no configurada")


def send_fcm_notification(token, title, body, data=None):
    logging.info(f"Preparando mensaje FCM para token: {token}")
    message = messaging.Message(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        token=token,
        data=data or {},
    )
    response = messaging.send(message)
    logging.info(f"Respuesta de FCM: {response}")
    return response
