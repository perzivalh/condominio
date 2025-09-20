class ResidentNotification {
  ResidentNotification({
    required this.id,
    required this.titulo,
    required this.mensaje,
    required this.estado,
    required this.creadoEn,
    this.actualizadoEn,
    this.facturaId,
    this.pagoId,
  });

  final String id;
  final String titulo;
  final String mensaje;
  final String estado;
  final DateTime creadoEn;
  final DateTime? actualizadoEn;
  final String? facturaId;
  final String? pagoId;

  bool get leida => estado.toUpperCase() == 'LEIDA';

  factory ResidentNotification.fromJson(Map<String, dynamic> json) {
    return ResidentNotification(
      id: json['id'].toString(),
      titulo: json['titulo']?.toString() ?? '',
      mensaje: json['mensaje']?.toString() ?? '',
      estado: json['estado']?.toString() ?? 'ENVIADA',
      creadoEn: DateTime.tryParse(json['creado_en']?.toString() ?? '') ?? DateTime.now(),
      actualizadoEn:
          DateTime.tryParse(json['actualizado_en']?.toString() ?? ''),
      facturaId: json['factura']?.toString(),
      pagoId: json['pago']?.toString(),
    );
  }

  ResidentNotification copyWith({
    String? titulo,
    String? mensaje,
    String? estado,
    DateTime? creadoEn,
    DateTime? actualizadoEn,
    String? facturaId,
    String? pagoId,
  }) {
    return ResidentNotification(
      id: id,
      titulo: titulo ?? this.titulo,
      mensaje: mensaje ?? this.mensaje,
      estado: estado ?? this.estado,
      creadoEn: creadoEn ?? this.creadoEn,
      actualizadoEn: actualizadoEn ?? this.actualizadoEn,
      facturaId: facturaId ?? this.facturaId,
      pagoId: pagoId ?? this.pagoId,
    );
  }
}
