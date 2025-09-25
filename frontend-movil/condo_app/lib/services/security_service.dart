import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import '../core/app_constants.dart';
import '../models/security_models.dart';

class SecurityService {
  SecurityService({http.Client? client, FlutterSecureStorage? storage})
      : _client = client ?? http.Client(),
        _storage = storage ?? const FlutterSecureStorage();

  final http.Client _client;
  final FlutterSecureStorage _storage;

  Future<String?> _readAccessToken() => _storage.read(key: accessTokenKey);

  Uri _buildUri(String path, [Map<String, dynamic>? query]) {
    final base = apiBaseUrl.endsWith('/') ? apiBaseUrl : '$apiBaseUrl/';
    return Uri.parse('$base$path').replace(queryParameters: query);
  }

  Map<String, String> _headers(String token) => {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      };

  Future<List<SecurityIncidentCategory>> fetchCategories() async {
    final token = await _readAccessToken();
    if (token == null) {
      throw Exception('No se encontró una sesión activa.');
    }

    final response = await _client.get(
      _buildUri('seguridad/categorias/'),
      headers: _headers(token),
    );

    if (response.statusCode != 200) {
      throw Exception('No se pudieron cargar las categorías.');
    }

    final List<dynamic> list = jsonDecode(response.body) as List<dynamic>;
    return list
        .map((item) => SecurityIncidentCategory.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<void> reportIncident({
    String? categoriaId,
    String? categoriaOtro,
    String? descripcion,
    String? ubicacion,
    bool esEmergencia = false,
  }) async {
    final token = await _readAccessToken();
    if (token == null) {
      throw Exception('No se encontró una sesión activa.');
    }

    final payload = <String, dynamic>{
      'es_emergencia': esEmergencia,
    };

    if (categoriaId != null && categoriaId.isNotEmpty) {
      payload['categoria_id'] = categoriaId;
    }
    if (categoriaOtro != null && categoriaOtro.trim().isNotEmpty) {
      payload['categoria_otro'] = categoriaOtro.trim();
    }
    if (descripcion != null && descripcion.trim().isNotEmpty) {
      payload['descripcion'] = descripcion.trim();
    }
    if (ubicacion != null && ubicacion.trim().isNotEmpty) {
      payload['ubicacion'] = ubicacion.trim();
    }

    final response = await _client.post(
      _buildUri('seguridad/incidentes/'),
      headers: _headers(token),
      body: jsonEncode(payload),
    );

    if (response.statusCode != 201) {
      final Map<String, dynamic>? errorBody =
          response.body.isNotEmpty ? jsonDecode(response.body) as Map<String, dynamic>? : null;
      final detail = errorBody?['detail']?.toString();
      throw Exception(detail ?? 'No se pudo registrar el incidente.');
    }
  }
}
