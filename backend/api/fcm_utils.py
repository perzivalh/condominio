import firebase_admin
from firebase_admin import credentials, messaging
import os
import json
import logging

# Inicializa Firebase Admin solo una vez
if not firebase_admin._apps:
    cred_json = os.environ.get("FIREBASE_ADMIN_CREDENTIALS")
    if cred_json:
        logging.info("Inicializando Firebase Admin SDK...")
        cred = credentials.Certificate(json.loads(cred_json))
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
