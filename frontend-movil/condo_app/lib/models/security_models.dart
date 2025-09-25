class SecurityIncidentCategory {
  SecurityIncidentCategory({
    required this.id,
    required this.nombre,
    this.descripcion,
    this.activo = true,
  });

  factory SecurityIncidentCategory.fromJson(Map<String, dynamic> json) {
    return SecurityIncidentCategory(
      id: json['id']?.toString() ?? '',
      nombre: json['nombre']?.toString() ?? 'Sin nombre',
      descripcion: json['descripcion']?.toString(),
      activo: json['activo'] is bool ? json['activo'] as bool : true,
    );
  }

  final String id;
  final String nombre;
  final String? descripcion;
  final bool activo;
}

class SecurityIncidentReport {
  SecurityIncidentReport({
    required this.id,
    required this.categoriaNombre,
    required this.descripcion,
    required this.ubicacion,
    required this.esEmergencia,
    required this.estado,
    required this.tiempoTranscurrido,
    this.codigoVivienda,
    this.residenteNombre,
    this.creadoEn,
  });

  factory SecurityIncidentReport.fromJson(Map<String, dynamic> json) {
    final residente = json['residente'] as Map<String, dynamic>?;
    final nombres = residente?['nombres']?.toString() ?? '';
    final apellidos = residente?['apellidos']?.toString() ?? '';
    final displayName = [nombres, apellidos].where((item) => item.isNotEmpty).join(' ');
    return SecurityIncidentReport(
      id: json['id']?.toString() ?? '',
      categoriaNombre: json['categoria_nombre']?.toString() ?? 'Otro',
      descripcion: json['descripcion']?.toString() ?? '',
      ubicacion: json['ubicacion']?.toString() ?? 'Sin ubicación',
      esEmergencia: json['es_emergencia'] == true,
      estado: json['estado']?.toString() ?? 'pendiente',
      tiempoTranscurrido: json['tiempo_transcurrido']?.toString() ?? '',
      codigoVivienda: residente?['codigo_vivienda']?.toString(),
      residenteNombre: displayName.isEmpty ? null : displayName,
      creadoEn: json['creado_en']?.toString(),
    );
  }

  final String id;
  final String categoriaNombre;
  final String descripcion;
  final String ubicacion;
  final bool esEmergencia;
  final String estado;
  final String tiempoTranscurrido;
  final String? codigoVivienda;
  final String? residenteNombre;
  final String? creadoEn;
}
