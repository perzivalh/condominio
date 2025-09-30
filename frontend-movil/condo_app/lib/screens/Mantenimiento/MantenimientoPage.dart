import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:image_picker/image_picker.dart';
import '../../widgets/neumorphic.dart';
import '../../core/http_utils.dart';

class MantenimientoPage extends StatefulWidget {
  const MantenimientoPage({super.key});

  @override
  State<MantenimientoPage> createState() => _MantenimientoPageState();
}

class _MantenimientoPageState extends State<MantenimientoPage> {
  final storage = const FlutterSecureStorage();

  final _formKey = GlobalKey<FormState>();
  final TextEditingController _tituloController = TextEditingController();
  final TextEditingController _descripcionController = TextEditingController();

  List<dynamic> _areas = [];
  bool _loading = true;
  String _error = '';

  String tipo = 'preventivo';
  String prioridad = 'media';
  dynamic _areaSeleccionada; // opcional
  File? _imagen;
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _fetchAreas();
  }

  Future<void> _fetchAreas() async {
    setState(() => _loading = true);
    try {
      final response = await http.get(apiUri('areas/'));
      if (response.statusCode == 200) {
        final decodedData = jsonDecode(response.body);
        if (decodedData is Map && decodedData.containsKey('results')) {
          _areas = decodedData['results'];
        } else if (decodedData is List) {
          _areas = decodedData;
        } else {
          throw Exception('Formato de datos de areas invalido.');
        }
      } else {
        throw Exception('Error al cargar areas: ${response.statusCode}');
      }
    } catch (e) {
      _error = 'Error cargando areas: $e';
    }
    setState(() => _loading = false);
  }

  Future<void> _mostrarOpcionesImagen() async {
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Galeria'),
              onTap: () async {
                Navigator.of(context).pop();
                final pickedFile = await _picker.pickImage(
                  source: ImageSource.gallery,
                );
                if (pickedFile != null) {
                  setState(() => _imagen = File(pickedFile.path));
                }
              },
            ),
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('Camara'),
              onTap: () async {
                Navigator.of(context).pop();
                final pickedFile = await _picker.pickImage(
                  source: ImageSource.camera,
                );
                if (pickedFile != null) {
                  setState(() => _imagen = File(pickedFile.path));
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _enviarMantenimiento() async {
    if (!_formKey.currentState!.validate()) return;

    final token = await storage.read(key: 'access');
    if (token == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Usuario no autenticado')));
      return;
    }

    final request = http.MultipartRequest(
      'POST',
      apiUri('mantenimientos/'),
    );

    request.fields['titulo'] = _tituloController.text;
    request.fields['descripcion'] = _descripcionController.text;
    request.fields['tipo'] = tipo;
    request.fields['prioridad'] = prioridad;

    if (_areaSeleccionada != null) {
      request.fields['area_comun_id'] = _areaSeleccionada['id'].toString();
    }

    if (_imagen != null) {
      final file = await http.MultipartFile.fromPath('imagen', _imagen!.path);
      request.files.add(file);
    }

    request.headers['Authorization'] = 'Bearer $token';

    try {
      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (!mounted) return;

      if (response.statusCode == 201) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Mantenimiento registrado')),
        );
        _formKey.currentState!.reset();
        setState(() {
          _imagen = null;
          _areaSeleccionada = null;
          tipo = 'preventivo';
          prioridad = 'media';
        });
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'No se pudo registrar el mantenimiento (${response.statusCode})',
            ),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error al enviar mantenimiento: $e')),
      );
    }
  }

  @override
  void dispose() {
    _tituloController.dispose();
    _descripcionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[300],
      appBar: AppBar(
        title: const Text(
          'Registro de Mantenimiento',
          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black),
        ),
        backgroundColor: const Color.fromARGB(255, 255, 255, 255),
        centerTitle: true,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error.isNotEmpty
              ? Center(child: Text(_error))
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      children: [
                        NeumorphicSurface(
                          child: TextFormField(
                            controller: _tituloController,
                            decoration: const InputDecoration(
                              labelText: 'Titulo',
                              border: InputBorder.none,
                            ),
                            validator: (value) =>
                                value!.isEmpty ? 'Ingrese un titulo' : null,
                          ),
                        ),
                        const SizedBox(height: 12),
                        NeumorphicSurface(
                          child: TextFormField(
                            controller: _descripcionController,
                            decoration: const InputDecoration(
                              labelText: 'Descripcion',
                              border: InputBorder.none,
                            ),
                            maxLines: 4,
                            validator: (value) => value!.isEmpty
                                ? 'Ingrese una descripcion'
                                : null,
                          ),
                        ),
                        const SizedBox(height: 12),
                        NeumorphicSurface(
                          child: DropdownButtonFormField<String>(
                            value: tipo,
                            items: const [
                              DropdownMenuItem(
                                value: 'preventivo',
                                child: Text('Preventivo'),
                              ),
                              DropdownMenuItem(
                                value: 'correctivo',
                                child: Text('Correctivo'),
                              ),
                            ],
                            onChanged: (value) => setState(() => tipo = value!),
                            decoration: const InputDecoration(
                              border: InputBorder.none,
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        NeumorphicSurface(
                          child: DropdownButtonFormField<String>(
                            value: prioridad,
                            items: const [
                              DropdownMenuItem(value: 'baja', child: Text('Baja')),
                              DropdownMenuItem(
                                value: 'media',
                                child: Text('Media'),
                              ),
                              DropdownMenuItem(value: 'alta', child: Text('Alta')),
                            ],
                            onChanged: (value) =>
                                setState(() => prioridad = value!),
                            decoration: const InputDecoration(
                              border: InputBorder.none,
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        NeumorphicSurface(
                          child: DropdownButtonFormField<dynamic>(
                            value: _areaSeleccionada,
                            items: _areas.map((area) {
                              return DropdownMenuItem(
                                value: area,
                                child: Text(area['nombre']),
                              );
                            }).toList(),
                            onChanged: (value) =>
                                setState(() => _areaSeleccionada = value),
                            decoration: const InputDecoration(
                              border: InputBorder.none,
                              hintText: 'Selecciona area (opcional)',
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        if (_imagen != null)
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.file(_imagen!, height: 150),
                          ),
                        NeumorphicSurface(
                          child: TextButton.icon(
                            icon: const Icon(Icons.image),
                            label:
                                const Text('Seleccionar Imagen o Tomar Foto'),
                            onPressed: _mostrarOpcionesImagen,
                          ),
                        ),
                        const SizedBox(height: 20),
                        NeumorphicSurface(
                          child: ElevatedButton(
                            onPressed: _enviarMantenimiento,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.black,
                              foregroundColor: Colors.white,
                              minimumSize: const Size.fromHeight(50),
                            ),
                            child: const Text('Registrar Mantenimiento'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
    );
  }
}
