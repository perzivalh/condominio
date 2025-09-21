class ResidentNotice {
  const ResidentNotice({
    required this.id,
    required this.titulo,
    required this.contenido,
    required this.publicadoEn,
    this.enviadoEn,
    this.leidoEn,
    this.autor,
    this.adjuntoUrl,
  });

  final String id;
  final String titulo;
  final String contenido;
  final DateTime publicadoEn;
  final DateTime? enviadoEn;
  final DateTime? leidoEn;
  final String? autor;
  final String? adjuntoUrl;

  bool get leido => leidoEn != null;

  factory ResidentNotice.fromJson(Map<String, dynamic> json) {
    DateTime? _parseDate(dynamic value) {
      if (value == null) return null;
      if (value is DateTime) return value;
      if (value is String && value.isNotEmpty) {
        return DateTime.tryParse(value);
      }
      return null;
    }

    return ResidentNotice(
      id: json['id']?.toString() ?? '',
      titulo: json['titulo']?.toString() ?? '',
      contenido: json['contenido']?.toString() ?? '',
      publicadoEn:
          _parseDate(json['fecha_publicacion']) ?? DateTime.fromMillisecondsSinceEpoch(0),
      enviadoEn: _parseDate(json['fecha_envio']),
      leidoEn: _parseDate(json['fecha_lectura']),
      autor: json['autor']?.toString(),
      adjuntoUrl: json['adjunto_url']?.toString(),
    );
  }

  ResidentNotice copyWith({
    String? titulo,
    String? contenido,
    DateTime? publicadoEn,
    DateTime? enviadoEn,
    DateTime? leidoEn,
    String? autor,
    String? adjuntoUrl,
  }) {
    return ResidentNotice(
      id: id,
      titulo: titulo ?? this.titulo,
      contenido: contenido ?? this.contenido,
      publicadoEn: publicadoEn ?? this.publicadoEn,
      enviadoEn: enviadoEn ?? this.enviadoEn,
      leidoEn: leidoEn ?? this.leidoEn,
      autor: autor ?? this.autor,
      adjuntoUrl: adjuntoUrl ?? this.adjuntoUrl,
    );
  }
}
