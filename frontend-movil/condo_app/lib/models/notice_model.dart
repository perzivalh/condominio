class ResidentNotice {
  ResidentNotice({
    required this.id,
    required this.titulo,
    required this.contenido,
    this.fechaCreacion,
    this.fechaPublicacion,
    this.autorNombre,
  });

  final String id;
  final String titulo;
  final String contenido;
  final DateTime? fechaCreacion;
  final DateTime? fechaPublicacion;
  final String? autorNombre;

  DateTime? get fechaVisible => fechaPublicacion ?? fechaCreacion;
  bool get estaPublicado => fechaPublicacion != null;

  factory ResidentNotice.fromJson(Map<String, dynamic> json) {
    final autor = json['autor_usuario'];
    String? autorNombre;
    if (autor is Map<String, dynamic>) {
      final username = autor['username_out']?.toString();
      if (username != null && username.isNotEmpty) {
        autorNombre = username;
      } else {
        final email = autor['email']?.toString();
        if (email != null && email.isNotEmpty) {
          autorNombre = email;
        }
      }
    }

    DateTime? parseDate(dynamic value) {
      if (value == null) {
        return null;
      }
      if (value is String && value.isNotEmpty) {
        return DateTime.tryParse(value);
      }
      return null;
    }

    return ResidentNotice(
      id: json['id']?.toString() ?? '',
      titulo: json['titulo']?.toString() ?? '',
      contenido: json['contenido']?.toString() ?? '',
      fechaCreacion: parseDate(json['fecha_creacion']),
      fechaPublicacion: parseDate(json['fecha_publicacion']),
      autorNombre: autorNombre,
    );
  }
}
