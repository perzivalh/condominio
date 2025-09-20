import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import '../core/app_constants.dart';
import '../models/finance_models.dart';

class FinanceService {
  FinanceService({http.Client? client, FlutterSecureStorage? storage})
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

  Future<FinanceSummary> fetchSummary() async {
    final token = await _readAccessToken();
    if (token == null) {
      throw Exception('Token no disponible');
    }

    final response = await _client.get(
      _buildUri('finanzas/resumen/'),
      headers: _headers(token),
    );

    if (response.statusCode != 200) {
      throw Exception('No se pudo obtener el resumen de finanzas');
    }

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    return FinanceSummary.fromJson(data);
  }

  Future<List<FinanceInvoice>> fetchInvoices({String? estado}) async {
    final token = await _readAccessToken();
    if (token == null) {
      throw Exception('Token no disponible');
    }

    final response = await _client.get(
      _buildUri('finanzas/facturas/', estado != null ? {'estado': estado} : null),
      headers: _headers(token),
    );

    if (response.statusCode != 200) {
      throw Exception('No se pudo obtener el historial de facturas');
    }

    final list = jsonDecode(response.body) as List<dynamic>;
    return list
        .map((item) => FinanceInvoice.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<FinanceInvoiceDetail> fetchInvoiceDetail(String facturaId) async {
    final token = await _readAccessToken();
    if (token == null) {
      throw Exception('Token no disponible');
    }

    final response = await _client.get(
      _buildUri('finanzas/facturas/$facturaId/'),
      headers: _headers(token),
    );

    if (response.statusCode != 200) {
      throw Exception('No se pudo obtener el detalle de la factura');
    }

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    return FinanceInvoiceDetail.fromJson(data);
  }

  Future<FinanceQrConfig?> fetchQrConfig() async {
    final token = await _readAccessToken();
    if (token == null) {
      throw Exception('Token no disponible');
    }

    final response = await _client.get(
      _buildUri('finanzas/codigo-qr/'),
      headers: _headers(token),
    );

    if (response.statusCode == 404) {
      return null;
    }

    if (response.statusCode != 200) {
      throw Exception('No se pudo obtener el código QR de pago');
    }

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    return FinanceQrConfig.fromJson(data);
  }

  Future<void> confirmInvoicePayment(
    String facturaId, {
    double? monto,
    String? comentario,
  }) async {
    final token = await _readAccessToken();
    if (token == null) {
      throw Exception('Token no disponible');
    }

    final payload = <String, dynamic>{};
    if (monto != null) {
      payload['monto_pagado'] = monto.toStringAsFixed(2);
    }
    if (comentario != null && comentario.isNotEmpty) {
      payload['comentario'] = comentario;
    }

    final response = await _client.post(
      _buildUri('finanzas/facturas/$facturaId/confirmar-pago/'),
      headers: _headers(token),
      body: jsonEncode(payload),
    );

    if (response.statusCode != 202) {
      throw Exception('No se pudo registrar el pago en revisión');
    }
  }

  Future<Uint8List> downloadInvoicePdf(String facturaId) async {
    final token = await _readAccessToken();
    if (token == null) {
      throw Exception('Token no disponible');
    }

    final response = await _client.get(
      _buildUri('finanzas/facturas/$facturaId/pdf/'),
      headers: {
        'Authorization': 'Bearer $token',
        'Accept': 'application/pdf',
      },
    );

    if (response.statusCode != 200) {
      throw Exception('No se pudo descargar la factura.');
    }

    return response.bodyBytes;
  }
}
