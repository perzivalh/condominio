import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:table_calendar/table_calendar.dart';
import 'package:intl/intl.dart';
import '../../widgets/neumorphic.dart';
import '../../core/http_utils.dart';
import 'MisReservasPage.dart';

class ReservationPage extends StatefulWidget {
  const ReservationPage({super.key});

  @override
  State<ReservationPage> createState() => _ReservationPageState();
}

class _ReservationPageState extends State<ReservationPage> {
  final storage = const FlutterSecureStorage();
  List<dynamic> _areas = [];
  bool _loading = true;
  String _error = '';
  CalendarFormat _calendarFormat = CalendarFormat.month;
  DateTime _focusedDay = DateTime.now();
  DateTime _selectedDay = DateTime.now();
  Map<int, String> _availabilityMap = {};
  Map<int, int> _reservaIdMap = {}; // areaId -> reservaId

  String _resolveImageUrl(dynamic url) {
    final raw = url == null ? '' : url.toString();
    final resolved = rewriteBackendUrl(raw);
    return resolved.isNotEmpty ? resolved : 'https://via.placeholder.com/64';
  }

  @override
  void initState() {
    super.initState();
    _fetchAreas().then((_) => _fetchReservations(_selectedDay));
  }

  Future<void> _fetchAreas() async {
    try {
      final response = await http.get(apiUri('areas/'));
      if (response.statusCode == 200) {
        final decodedData = jsonDecode(response.body);
        if (decodedData is Map && decodedData.containsKey('results')) {
          _areas = decodedData['results'] as List<dynamic>;
        } else if (decodedData is List) {
          _areas = decodedData;
        } else {
          throw Exception('Formato de datos de áreas inválido.');
        }
      } else {
        throw Exception('Error al cargar áreas: ${response.statusCode}');
      }
    } catch (e) {
      setState(() {
        _error = 'Error cargando áreas: $e';
      });
    }
  }

  Future<void> _fetchReservations(DateTime date) async {
    setState(() {
      _loading = true;
      _availabilityMap = {};
      _reservaIdMap = {};
    });

    final token = await storage.read(key: "access");
    if (token == null) {
      setState(() {
        _error = "No hay token de autenticación.";
        _loading = false;
      });
      return;
    }

    final formattedDate = DateFormat('yyyy-MM-dd').format(date);
    final response = await http.get(
      apiUri('reservas/?fecha=$formattedDate'),
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer $token",
      },
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final reservations = data['results'] as List<dynamic>;

      for (var area in _areas) {
        _availabilityMap[area['id']] = "Disponible";
      }

      for (var res in reservations) {
        final areaId = res['area_comun']['id'];
        final estado = res['estado'];

        if (areaId is int) {
          _reservaIdMap[areaId] = res['id'];
          switch (estado) {
            case 'aprobada':
              _availabilityMap[areaId] = "Ocupado";
              break;
            case 'pendiente':
              _availabilityMap[areaId] = "Pendiente";
              break;
            case 'rechazada':
              _availabilityMap[areaId] = "Disponible";
              break;
          }
        }
      }
      setState(() {});
    } else {
      setState(() {
        _error = 'Error al cargar reservas: ${response.statusCode}';
      });
    }

    setState(() {
      _loading = false;
    });
  }

  void _onDaySelected(DateTime selectedDay, DateTime focusedDay) {
    if (!isSameDay(_selectedDay, selectedDay)) {
      setState(() {
        _selectedDay = selectedDay;
        _focusedDay = focusedDay;
      });
      _fetchReservations(selectedDay);
    }
  }

  void _showReservaForm(dynamic area) {
    final TextEditingController fechaController = TextEditingController(
      text: DateFormat('yyyy-MM-dd').format(_selectedDay),
    );
    final TextEditingController horaInicioController = TextEditingController();
    final TextEditingController horaFinController = TextEditingController();

    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text("Reservar: ${area['nombre']}"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            NeumorphicInset(
              child: TextField(
                controller: fechaController,
                readOnly: true,
                decoration: const InputDecoration(
                  hintText: "Selecciona fecha",
                  border: InputBorder.none,
                ),
                onTap: () async {
                  DateTime? picked = await showDatePicker(
                    context: context,
                    initialDate: _selectedDay,
                    firstDate: DateTime.now(),
                    lastDate: DateTime(2100),
                  );
                  if (picked != null) {
                    fechaController.text = DateFormat(
                      'yyyy-MM-dd',
                    ).format(picked);
                    _onDaySelected(picked, picked);
                  }
                },
              ),
            ),
            const SizedBox(height: 10),
            NeumorphicInset(
              child: TextField(
                controller: horaInicioController,
                readOnly: true,
                decoration: const InputDecoration(
                  hintText: "Hora inicio",
                  border: InputBorder.none,
                ),
                onTap: () async {
                  TimeOfDay? picked = await showTimePicker(
                    context: context,
                    initialTime: TimeOfDay.now(),
                  );
                  if (picked != null) {
                    horaInicioController.text =
                        "${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}:00";
                  }
                },
              ),
            ),
            const SizedBox(height: 10),
            NeumorphicInset(
              child: TextField(
                controller: horaFinController,
                readOnly: true,
                decoration: const InputDecoration(
                  hintText: "Hora fin",
                  border: InputBorder.none,
                ),
                onTap: () async {
                  TimeOfDay? picked = await showTimePicker(
                    context: context,
                    initialTime: TimeOfDay.now(),
                  );
                  if (picked != null) {
                    horaFinController.text =
                        "${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}:00";
                  }
                },
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("Cancelar"),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.black,
              foregroundColor: Colors.white,
            ),
            onPressed: () async {
              if (fechaController.text.isEmpty ||
                  horaInicioController.text.isEmpty ||
                  horaFinController.text.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("Completa todos los campos")),
                );
                return;
              }

              final token = await storage.read(key: "access");
              final data = {
                "area_comun_id": area['id'],
                "fecha": fechaController.text,
                "hora_inicio": horaInicioController.text,
                "hora_fin": horaFinController.text,
                "estado": "pendiente",
              };

              final response = await http.post(
                apiUri('reservas/'),
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": "Bearer $token",
                },
                body: jsonEncode(data),
              );

              if (response.statusCode == 201) {
                Navigator.pop(context);
                _fetchReservations(_selectedDay);
                ScaffoldMessenger.of(
                  context,
                ).showSnackBar(const SnackBar(content: Text("Reserva creada")));
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("Error al crear reserva")),
                );
              }
            },
            child: const Text("Reservar"),
          ),
        ],
      ),
    );
  }

  Color _getEstadoColor(String estado) {
    switch (estado) {
      case 'Pendiente':
        return Colors.orange.shade700;
      case 'Ocupado':
        return Colors.red.shade700;
      default:
        return Colors.green.shade700;
    }
  }

  void _showAreaImages(dynamic area) {
    final List<String> images = [];
    if (area['imagenes'] != null) {
      images.addAll(
        List<String>.from(
          (area['imagenes'] as List).map((e) => e['imagen'].toString()),
        ),
      );
    } else if (area['imagen'] != null) {
      images.add(area['imagen'].toString());
    }

    int currentIndex = 0;

    showDialog(
      context: context,
      builder: (_) => StatefulBuilder(
        builder: (context, setState) => Dialog(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Stack(
                children: [
                  SizedBox(
                    width: double.infinity,
                    height: 400,
                    child: PageView.builder(
                      itemCount: images.length,
                      controller: PageController(initialPage: 0),
                      onPageChanged: (index) {
                        setState(() {
                          currentIndex = index;
                        });
                      },
                      itemBuilder: (context, index) {
                        return Image.network(
                          _resolveImageUrl(images[index]),
                          fit: BoxFit.cover,
                          errorBuilder: (c, e, s) => Container(
                            color: Colors.grey[200],
                            child: const Icon(Icons.image, size: 50),
                          ),
                        );
                      },
                    ),
                  ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: IconButton(
                      icon: const Icon(Icons.close, color: Colors.white),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  images.length,
                  (index) => Container(
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    width: currentIndex == index ? 12 : 8,
                    height: currentIndex == index ? 12 : 8,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: currentIndex == index
                          ? Colors.teal.shade700
                          : Colors.grey,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[300],
      appBar: AppBar(
        title: const Text(
          "Reservas",
          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black),
        ),
        backgroundColor: Colors.white,
        centerTitle: true,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error.isNotEmpty
          ? Center(child: Text(_error))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  NeumorphicSurface(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const MisReservasPage(),
                          ),
                        );
                      },
                      icon: const Icon(Icons.person),
                      label: const Text("Mis Reservas"),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.black,
                        foregroundColor: Colors.white,
                        minimumSize: const Size.fromHeight(50),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  NeumorphicSurface(
                    child: TableCalendar(
                      firstDay: DateTime.utc(2023, 1, 1),
                      lastDay: DateTime.utc(2030, 12, 31),
                      focusedDay: _focusedDay,
                      selectedDayPredicate: (day) =>
                          isSameDay(_selectedDay, day),
                      onDaySelected: _onDaySelected,
                      calendarFormat: _calendarFormat,
                      onFormatChanged: (format) {
                        setState(() {
                          _calendarFormat = format;
                        });
                      },
                      onPageChanged: (focusedDay) {
                        _focusedDay = focusedDay;
                        _fetchReservations(focusedDay);
                      },
                      calendarStyle: CalendarStyle(
                        todayDecoration: BoxDecoration(
                          color: Colors.teal.shade300,
                          shape: BoxShape.circle,
                        ),
                        selectedDecoration: BoxDecoration(
                          color: Colors.teal.shade700,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    "Áreas Comunes",
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  ListView.builder(
                    physics: const NeverScrollableScrollPhysics(),
                    shrinkWrap: true,
                    itemCount: _areas.length,
                    itemBuilder: (context, index) {
                      final area = _areas[index];
                      final estado =
                          _availabilityMap[area['id']] ?? 'Disponible';
                      final imageUrl = _resolveImageUrl(area['imagen']);

                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: NeumorphicSurface(
                          padding: const EdgeInsets.all(12),
                          child: ListTile(
                            leading: GestureDetector(
                              onTap: () => _showAreaImages(area),
                              child: ClipRRect(
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
                            ),
                            title: Text(area['nombre'] ?? '-'),
                            subtitle: Text(
                              estado,
                              style: TextStyle(color: _getEstadoColor(estado)),
                            ),
                            trailing: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.black,
                                foregroundColor: Colors.white,
                              ),
                              onPressed: estado == "Disponible"
                                  ? () => _showReservaForm(area)
                                  : null,
                              child: const Text("Reservar"),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
    );
  }
}
