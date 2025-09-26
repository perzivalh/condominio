import 'dart:convert';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../core/app_constants.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'notification_channel.dart';

class PushNotificationService {
  static Future<void> initialize() async {
    await Firebase.initializeApp();
    await NotificationChannel.initialize();
    FirebaseMessaging messaging = FirebaseMessaging.instance;

    // Solicita permisos explícitos
    NotificationSettings settings = await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      announcement: true,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
    );
    debugPrint('Permiso de notificaciones: \\${settings.authorizationStatus}');

    // Función para registrar el token en el backend
    Future<void> _registerToken(String? token) async {
      if (token == null) return;
      final storage = const FlutterSecureStorage();
      final accessToken = await storage.read(key: accessTokenKey);
      if (accessToken != null) {
        try {
          await http.post(
            Uri.parse('${apiBaseUrl}fcm/registrar/'),
            headers: {
              'Authorization': 'Bearer $accessToken',
              'Content-Type': 'application/json',
            },
            body: jsonEncode({'token': token}),
          );
          debugPrint('Token FCM registrado en backend');
        } catch (e) {
          debugPrint('Error registrando token FCM: $e');
        }
      }
    }

    // Registra el token inicial
    String? token = await messaging.getToken();
    debugPrint('FCM Token: $token');
    await _registerToken(token);

    // Registra el token cada vez que cambie (por ejemplo, si se renueva)
    FirebaseMessaging.instance.onTokenRefresh.listen((newToken) async {
      debugPrint('FCM Token actualizado: $newToken');
      await _registerToken(newToken);
    });

    FirebaseMessaging.onMessage.listen((RemoteMessage message) async {
      debugPrint('Mensaje recibido: \\${message.notification?.title}');
      final notification = message.notification;
      if (notification != null) {
        await NotificationChannel.showNotification(
          title: notification.title ?? 'Notificación',
          body: notification.body ?? '',
        );
      }
    });
  }
}
