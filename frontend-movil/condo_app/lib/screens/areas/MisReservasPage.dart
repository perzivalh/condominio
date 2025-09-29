import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../widgets/neumorphic.dart';

const String baseUrl = 'http://192.168.0.15:8000/api';

class MisReservasPage extends StatefulWidget {
  const MisReservasPage({super.key});

  @override
  State<MisReservasPage> createState() => _MisReservasPageState();
}

class _MisReservasPageState extends State<MisReservasPage> {
  final storage = const FlutterSecureStorage();
  List<dynamic> _reservas = [];
  bool _loading = true;
  String _error = '';

  @override
  void initState() {
    super.initState();
    _fetchMisReservas();
  }

  Future<void> _fetchMisReservas() async {
    setState(() {
      _loading = true;
      _reservas = [];
      _error = '';
    });

    final token = await storage.read(key: "access");
    if (token == null) {
      setState(() {
        _error = "No hay token de autenticación.";
        _loading = false;
      });
      return;
    }

    try {
      final response = await http.get(
        Uri.parse('$baseUrl/reservas/mis_reservas/'),
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as List<dynamic>;
        setState(() {
          _reservas = data.map((r) {
            final Map<String, dynamic> reserva = Map<String, dynamic>.from(r);
            if (reserva['area_comun'] != null) {
              reserva['area_comun'] = Map<String, dynamic>.from(
                reserva['area_comun'],
              );
            }
            return reserva;
          }).toList();
        });
      } else {
        setState(() {
          _error = "Error al cargar tus reservas: ${response.statusCode}";
        });
      }
    } catch (e) {
      setState(() {
        _error = "Error al cargar tus reservas: $e";
      });
    }

    setState(() {
      _loading = false;
    });
  }

  Color _getEstadoColor(String estado) {
    switch (estado) {
      case 'pendiente':
        return Colors.orange.shade700;
      case 'aprobada':
        return Colors.green.shade700;
      case 'rechazada':
        return Colors.red.shade700;
      default:
        return Colors.grey;
    }
  }

  Color _getFacturaColor(String facturaEstado) {
    switch (facturaEstado.toUpperCase()) {
      case 'PAGADO':
        return Colors.green.shade700;
      default:
        return Colors.orange.shade700;
    }
  }

  String _formatEstado(String estado) {
    switch (estado) {
      case 'aprobada':
        return 'Ocupado';
      case 'pendiente':
        return 'Pendiente';
      case 'rechazada':
        return 'Disponible';
      default:
        return estado;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[300],
      appBar: AppBar(
        title: const Text(
          "Mis Reservas",
          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black),
        ),
        centerTitle: true,
        backgroundColor: Colors.white,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error.isNotEmpty
          ? Center(child: Text(_error))
          : _reservas.isEmpty
          ? const Center(child: Text("No tienes reservas."))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _reservas.length,
              itemBuilder: (context, index) {
                final reserva = _reservas[index];
                final estado = _formatEstado(reserva['estado']);
                final facturaEstado = reserva['factura']?['estado'] ?? '';

                // Construir la URL de la imagen correctamente
                final areaImagen = reserva['area_comun']?['imagen'];
                String imageUrl = 'https://via.placeholder.com/64';
                if (areaImagen != null) {
                  if (areaImagen is String) {
                    imageUrl = areaImagen.replaceFirst(
                      'http://localhost:8000',
                      'http://192.168.0.15:8000',
                    );
                  } else if (areaImagen is Map &&
                      areaImagen['imagen'] != null) {
                    imageUrl = areaImagen['imagen'].toString().replaceFirst(
                      'http://localhost:8000',
                      'http://192.168.0.15:8000',
                    );
                  }
                }

                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: NeumorphicSurface(
                    padding: const EdgeInsets.all(12),
                    child: ListTile(
                      leading: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network(
                          imageUrl,
                          width: 64,
                          height: 64,
                          fit: BoxFit.cover,
                          errorBuilder: (c, e, s) => Container(
                            width: 64,
                            height: 64,
                            color: Colors.grey[200],
                            child: const Icon(Icons.image),
                          ),
                        ),
                      ),
                      title: Text(reserva['area_comun']?['nombre'] ?? '-'),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            estado,
                            style: TextStyle(
                              color: _getEstadoColor(reserva['estado']),
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          if (facturaEstado.isNotEmpty)
                            Text(
                              "Factura: $facturaEstado",
                              style: TextStyle(
                                color: _getFacturaColor(facturaEstado),
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          Text(
                            "Fecha: ${reserva['fecha']} ${reserva['hora_inicio']}-${reserva['hora_fin']}",
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
    );
  }
}
