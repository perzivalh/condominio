# condo_app

A new Flutter project.

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Lab: Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Cookbook: Useful Flutter samples](https://docs.flutter.dev/cookbook)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.

## Notificaciones Push con Firebase Cloud Messaging (FCM)

### Configuración para desarrollo local y Railway

1. **Crea tu proyecto en Firebase Console** y descarga el archivo `google-services.json` (Android) y/o `GoogleService-Info.plist` (iOS).
   - Coloca `google-services.json` en `android/app/` y `GoogleService-Info.plist` en `ios/Runner/`.
   - **No subas estos archivos al repositorio.**

2. **Variables de entorno:**
   - En local, no necesitas exponer claves en código, solo los archivos de configuración.
   - En Railway, si usas backend para enviar notificaciones, pon la clave de servidor FCM en las variables de entorno.

3. **Dependencias necesarias:**
   - En `pubspec.yaml` agrega:
     ```yaml
     firebase_core: ^2.0.0
     firebase_messaging: ^14.0.0
     ```
   - Luego ejecuta:
     ```sh
     flutter pub get
     ```

4. **Inicialización en código:**
   - Ya está integrado en `lib/main.dart` y `lib/services/push_notification_service.dart`.
   - El token FCM se imprime en consola y puedes enviarlo a tu backend.

5. **Ignora archivos sensibles:**
   - En `.gitignore`:
     ```
     android/app/google-services.json
     ios/Runner/GoogleService-Info.plist
     ```

6. **En producción Railway:**
   - Sube las variables de entorno necesarias en el panel de Railway para el backend (clave de servidor FCM, etc).

7. **Notas:**
   - El backend debe guardar el token FCM de cada usuario para poder enviarle notificaciones push.
   - Si necesitas notificaciones en web, la integración es similar pero usando el SDK web de Firebase.
