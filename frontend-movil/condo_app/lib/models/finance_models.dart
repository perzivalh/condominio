class FinanceInvoice {
  FinanceInvoice({
    required this.id,
    required this.periodo,
    required this.monto,
    required this.tipo,
    required this.estado,
    required this.fechaEmision,
    this.fechaVencimiento,
    this.fechaPago,
  });

  final String id;
  final String periodo;
  final double monto;
  final String tipo;
  final String estado;
  final DateTime fechaEmision;
  final DateTime? fechaVencimiento;
  final DateTime? fechaPago;

  factory FinanceInvoice.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(dynamic value) {
      if (value == null) return null;
      return DateTime.tryParse(value.toString());
    }

    return FinanceInvoice(
      id: json['id'].toString(),
      periodo: json['periodo']?.toString() ?? '--',
      monto: double.tryParse(json['monto'].toString()) ?? 0,
      tipo: json['tipo']?.toString() ?? '',
      estado: json['estado']?.toString() ?? '',
      fechaEmision: parseDate(json['fecha_emision']) ?? DateTime.now(),
      fechaVencimiento: parseDate(json['fecha_vencimiento']),
      fechaPago: parseDate(json['fecha_pago']),
    );
  }
}

class FinancePayment {
  FinancePayment({
    required this.id,
    required this.metodo,
    required this.montoPagado,
    required this.fechaPago,
    required this.estado,
    this.comprobanteUrl,
    this.referenciaExterna,
  });

  final String id;
  final String metodo;
  final double montoPagado;
  final DateTime fechaPago;
  final String estado;
  final String? comprobanteUrl;
  final String? referenciaExterna;

  factory FinancePayment.fromJson(Map<String, dynamic> json) {
    return FinancePayment(
      id: json['id'].toString(),
      metodo: json['metodo']?.toString() ?? '',
      montoPagado: double.tryParse(json['monto_pagado'].toString()) ?? 0,
      fechaPago: DateTime.tryParse(json['fecha_pago'].toString()) ?? DateTime.now(),
      estado: json['estado']?.toString() ?? '',
      comprobanteUrl: json['comprobante_url']?.toString(),
      referenciaExterna: json['referencia_externa']?.toString(),
    );
  }
}

class FinanceSummary {
  FinanceSummary({
    required this.viviendaId,
    required this.viviendaCodigo,
    required this.totalPendiente,
    required this.cantidadPendiente,
    required this.pendientes,
    this.facturaMasAntigua,
  });

  final String viviendaId;
  final String viviendaCodigo;
  final double totalPendiente;
  final int cantidadPendiente;
  final List<FinanceInvoice> pendientes;
  final FinanceInvoice? facturaMasAntigua;

  factory FinanceSummary.fromJson(Map<String, dynamic> json) {
    final pendientesJson = json['facturas_pendientes'] as List<dynamic>? ?? [];
    return FinanceSummary(
      viviendaId: json['vivienda_id']?.toString() ?? '',
      viviendaCodigo: json['vivienda_codigo']?.toString() ?? '--',
      totalPendiente: double.tryParse(json['total_pendiente'].toString()) ?? 0,
      cantidadPendiente: int.tryParse(json['cantidad_pendiente'].toString()) ?? 0,
      pendientes: pendientesJson
          .map((item) => FinanceInvoice.fromJson(item as Map<String, dynamic>))
          .toList(),
      facturaMasAntigua: json['factura_mas_antigua'] == null
          ? null
          : FinanceInvoice.fromJson(
              Map<String, dynamic>.from(json['factura_mas_antigua'] as Map),
            ),
    );
  }
}

class FinanceInvoiceDetail {
  FinanceInvoiceDetail({required this.factura, required this.pagos});

  final FinanceInvoice factura;
  final List<FinancePayment> pagos;

  factory FinanceInvoiceDetail.fromJson(Map<String, dynamic> json) {
    final pagosJson = json['pagos'] as List<dynamic>? ?? [];
    return FinanceInvoiceDetail(
      factura: FinanceInvoice.fromJson(
        Map<String, dynamic>.from(json['factura'] as Map),
      ),
      pagos: pagosJson
          .map((item) => FinancePayment.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }
}

