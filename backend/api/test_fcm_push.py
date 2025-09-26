# Script manual para probar envío de push a un token específico
import os
from api.fcm_utils import send_fcm_notification

def main():
    token = input("Token FCM a probar: ")
    title = input("Título: ")
    body = input("Mensaje: ")
    data = {"test": "true"}
    try:
        resp = send_fcm_notification(token, title, body, data)
        print(f"Push enviado correctamente: {resp}")
    except Exception as e:
        print(f"Error enviando push: {e}")

if __name__ == "__main__":
    main()
