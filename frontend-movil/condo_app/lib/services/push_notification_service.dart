import 'dart:convert';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import '../core/app_constants.dart';
import 'notification_channel.dart';

class PushNotificationService {
  static final FlutterSecureStorage _storage = const FlutterSecureStorage();
  static FirebaseMessaging? _messaging;

  static Future<void> initialize() async {
    await Firebase.initializeApp();
    await NotificationChannel.initialize();

    _messaging = FirebaseMessaging.instance;
    final messaging = _messaging!;

    // Solicita permisos explícitos
    final settings = await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      announcement: true,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
    );
    debugPrint('Permiso de notificaciones: ${settings.authorizationStatus}');

    // Registra el token inicial (si el usuario ya tiene sesión guardada)
    final initialToken = await messaging.getToken();
    debugPrint('FCM Token: $initialToken');
    await _syncTokenWithBackend(initialToken);

    // Reintenta cada vez que se refresca el token
    messaging.onTokenRefresh.listen((newToken) async {
      debugPrint('FCM Token actualizado: $newToken');
      await _syncTokenWithBackend(newToken);
    });

    FirebaseMessaging.onMessage.listen((RemoteMessage message) async {
      debugPrint('Mensaje recibido: ${message.notification?.title}');
      final notification = message.notification;
      if (notification != null) {
        await NotificationChannel.showNotification(
          title: notification.title ?? 'Notificación',
          body: notification.body ?? '',
        );
      }
    });
  }

  /// Permite reintentar el registro cuando se guarda un token de sesión (p.ej. después de login).
  static Future<void> syncTokenWithBackend() async {
    final messaging = _messaging ?? FirebaseMessaging.instance;
    final token = await messaging.getToken();
    await _syncTokenWithBackend(token);
  }

  static Future<void> _syncTokenWithBackend(String? token) async {
    if (token == null) {
      return;
    }

    final accessToken = await _storage.read(key: accessTokenKey);
    if (accessToken == null) {
      // Todavía no hay sesión activa; se intentará nuevamente tras login o refresh.
      debugPrint('Token FCM disponible pero no hay access token almacenado.');
      return;
    }

    try {
      final response = await http.post(
        Uri.parse('${apiBaseUrl}fcm/registrar/'),
        headers: {
          'Authorization': 'Bearer $accessToken',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({'token': token}),
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        debugPrint('Token FCM registrado en backend');
      } else {
        debugPrint(
          'Error registrando token FCM. Status: ${response.statusCode} Body: ${response.body}',
        );
      }
    } catch (e) {
      debugPrint('Error registrando token FCM: $e');
    }
  }
}
