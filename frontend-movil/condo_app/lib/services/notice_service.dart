import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import '../core/app_constants.dart';
import '../models/notice_model.dart';

class NoticeService {
  NoticeService({http.Client? client, FlutterSecureStorage? storage})
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

  Future<List<ResidentNotice>> fetchNotices() async {
    final token = await _readToken();
    if (token == null) {
      throw Exception('Token no disponible');
    }

    final response = await _client.get(
      _buildUri('avisos/?estado=publicado'),
      headers: _headers(token),
    );

    if (response.statusCode != 200) {
      throw Exception('No se pudo obtener los avisos publicados');
    }

    final list = jsonDecode(response.body) as List<dynamic>;
    return list
        .map((item) => ResidentNotice.fromJson(item as Map<String, dynamic>))
        .toList();
  }
}
