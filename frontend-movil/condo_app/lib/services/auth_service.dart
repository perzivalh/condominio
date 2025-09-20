import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import '../core/app_constants.dart';
import '../models/resident_profile.dart';

class AuthService {
  AuthService({http.Client? client, FlutterSecureStorage? storage})
      : _client = client ?? http.Client(),
        _storage = storage ?? const FlutterSecureStorage();

  final http.Client _client;
  final FlutterSecureStorage _storage;

  Future<ResidentSession> loginResident(String username, String password) async {
    final tokens = await _requestTokens(username, password);
    final profile = await _loadResidentProfile(username, tokens.access);

    await _storage.write(key: accessTokenKey, value: tokens.access);
    await _storage.write(key: refreshTokenKey, value: tokens.refresh);

    return ResidentSession(tokens: tokens, profile: profile);
  }

  Future<void> clearSession() async {
    await _storage.delete(key: accessTokenKey);
    await _storage.delete(key: refreshTokenKey);
  }

  Future<void> requestPasswordRecovery(String email) async {
    final uri = _buildUri('recuperar-password/');
    final response = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'correo': email}),
    );

    if (response.statusCode != 200) {
      throw AuthException(_messageFromResponse(response));
    }
  }

  Future<void> resetPassword({
    required String email,
    required String token,
    required String newPassword,
  }) async {
    final uri = _buildUri('reset-password/');
    final response = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'correo': email,
        'token': token,
        'nueva_password': newPassword,
      }),
    );

    if (response.statusCode != 200) {
      throw AuthException(_messageFromResponse(response));
    }
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
    required String confirmation,
  }) async {
    final token = await _storage.read(key: accessTokenKey);
    if (token == null) {
      throw AuthException('No existe una sesión activa. Inicia sesión nuevamente.');
    }

    final uri = _buildUri('cambiar-password/');
    final response = await _client.post(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'password_actual': currentPassword,
        'nueva_password': newPassword,
        'confirmacion': confirmation,
      }),
    );

    if (response.statusCode == 401) {
      await clearSession();
      throw AuthException('Tu sesión expiró. Inicia sesión nuevamente.');
    }

    if (response.statusCode != 200) {
      throw AuthException(_messageFromResponse(response));
    }
  }

  Future<TokenPair> _requestTokens(String username, String password) async {
    final uri = _buildUri('token/');
    final response = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'username': username, 'password': password}),
    );

    if (response.statusCode != 200) {
      throw AuthException('Credenciales invalidas.');
    }

    final Map<String, dynamic> data = jsonDecode(response.body);
    final access = data['access'] as String?;
    final refresh = data['refresh'] as String?;

    if (access == null || refresh == null) {
      throw AuthException('Respuesta del servidor incompleta.');
    }

    return TokenPair(access: access, refresh: refresh);
  }

  Future<ResidentProfile> _loadResidentProfile(String username, String accessToken) async {
    final userData = await _findUsuario(username, accessToken);
    final roles = userData['roles'] as List<dynamic>? ?? [];

    final hasResidentRole = roles.any((role) => role.toString().toUpperCase() == 'RES');
    if (!hasResidentRole) {
      throw AuthException('Este usuario no tiene rol de residente.');
    }

    final residente = userData['residente'] as Map<String, dynamic>?;
    if (residente == null || residente['id'] == null) {
      throw AuthException('El perfil de residente no esta completo.');
    }

    final residenteId = residente['id'].toString();
    final detail = await _fetchResidenteDetalle(residenteId, accessToken);
    final nombres = _stringField(residente, 'nombres');
    final apellidos = _stringField(residente, 'apellidos');

    String? codigoUnidad;
    final viviendaRaw = detail['vivienda'];
    if (viviendaRaw is Map<String, dynamic>) {
      final codigo = viviendaRaw['codigo_unidad'];
      if (codigo != null) {
        codigoUnidad = codigo.toString();
      }
    }

    return ResidentProfile(
      usuarioId: userData['id'].toString(),
      username: userData['username_out']?.toString() ?? username,
      residenteId: residenteId,
      firstName: nombres,
      lastName: apellidos,
      codigoUnidad: codigoUnidad,
    );
  }

  Future<Map<String, dynamic>> _findUsuario(String username, String accessToken) async {
    final uri = _buildUri('usuarios/');
    final response = await _client.get(
      uri,
      headers: {'Authorization': 'Bearer $accessToken'},
    );

    if (response.statusCode != 200) {
      throw AuthException('No se pudo obtener la informacion del usuario.');
    }

    final decoded = jsonDecode(response.body);
    final List<dynamic> usuarios;
    if (decoded is List) {
      usuarios = decoded;
    } else if (decoded is Map<String, dynamic> && decoded['results'] is List) {
      usuarios = decoded['results'] as List<dynamic>;
    } else {
      throw AuthException('Formato inesperado al listar usuarios.');
    }

    final lower = username.toLowerCase();
    final match = usuarios.cast<Map<String, dynamic>?>().firstWhere(
          (item) {
            final usernameOut = item?['username_out']?.toString().toLowerCase();
            return usernameOut == lower;
          },
          orElse: () => null,
        );

    if (match == null) {
      throw AuthException('Usuario no encontrado.');
    }

    return match;
  }

  Future<Map<String, dynamic>> _fetchResidenteDetalle(
    String residenteId,
    String accessToken,
  ) async {
    final uri = _buildUri('residentes/$residenteId/');
    final response = await _client.get(
      uri,
      headers: {'Authorization': 'Bearer $accessToken'},
    );

    if (response.statusCode != 200) {
      throw AuthException('No se pudo obtener la informacion del residente.');
    }

    final decoded = jsonDecode(response.body);
    if (decoded is Map<String, dynamic>) {
      return decoded;
    }

    throw AuthException('Formato inesperado para el detalle del residente.');
  }

  String _stringField(Map<String, dynamic> data, String field) {
    final value = data[field];
    if (value == null) {
      return '';
    }
    return value.toString();
  }

  Uri _buildUri(String path) {
    final normalizedBase = apiBaseUrl.endsWith('/') ? apiBaseUrl : '$apiBaseUrl/';
    return Uri.parse('$normalizedBase$path');
  }

  String _messageFromResponse(http.Response response) {
    try {
      final data = jsonDecode(response.body);
      if (data is Map<String, dynamic>) {
        for (final key in ['error', 'mensaje', 'detail']) {
          final value = data[key];
          if (value is String && value.trim().isNotEmpty) {
            return value;
          }
        }
      }
    } catch (_) {
      // Ignorar errores de parseo y devolver mensaje genérico.
    }
    return 'Ocurrió un error inesperado (${response.statusCode}).';
  }
}
