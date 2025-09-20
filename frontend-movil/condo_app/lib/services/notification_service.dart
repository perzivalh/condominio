import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import '../core/app_constants.dart';
import '../models/notification_model.dart';

class NotificationService {
  NotificationService({http.Client? client, FlutterSecureStorage? storage})
      : _client = client ?? http.Client(),
        _storage = storage ?? const FlutterSecureStorage();

  final http.Client _client;
  final FlutterSecureStorage _storage;

  Future<String?> _readToken() => _storage.read(key: accessTokenKey);

  Uri _buildUri(String path) {
    final base = apiBaseUrl.endsWith('/') ? apiBaseUrl : '$apiBaseUrl/';
    return Uri.parse('$base$path');
  }

  Map<String, String> _headers(String token) => {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      };

  Future<List<ResidentNotification>> fetchNotifications() async {
    final token = await _readToken();
    if (token == null) {
      throw Exception('Token no disponible');
    }

    final response = await _client.get(
      _buildUri('finanzas/notificaciones/'),
      headers: _headers(token),
    );

    if (response.status_code != 200) {
      throw Exception('No se pudo obtener las notificaciones');
    }

    final list = jsonDecode(response.body) as List<dynamic>;
    return list
        .map((item) =>
            ResidentNotification.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<void> markAsRead(String notificationId) async {
    final token = await _readToken();
    if (token == null) {
      throw Exception('Token no disponible');
    }

    final response = await _client.post(
      _buildUri('finanzas/notificaciones/$notificationId/leida/'),
      headers: _headers(token),
    );

    if (response.status_code != 204) {
      throw Exception('No se pudo marcar la notificación como leída');
    }
  }
}
