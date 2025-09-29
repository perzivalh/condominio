import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../widgets/neumorphic.dart';
import 'lista_visitantes_page.dart';

const String baseUrl = 'http://192.168.0.15:8000/api/historial-visitas/';

class RegistroVisitantePage extends StatefulWidget {
  const RegistroVisitantePage({super.key});

  @override
  State<RegistroVisitantePage> createState() => _RegistroVisitantePageState();
}

class _RegistroVisitantePageState extends State<RegistroVisitantePage> {
  final _formKey = GlobalKey<FormState>();
  final _nombreController = TextEditingController();
  final _ciController = TextEditingController();
  final _motivoController = TextEditingController();
  final _placaController = TextEditingController();
  final _vehiculoController = TextEditingController();
  final _notasController = TextEditingController();
  final _storage = const FlutterSecureStorage();

  bool _loadingForm = false;

  @override
  void dispose() {
    _nombreController.dispose();
    _ciController.dispose();
    _motivoController.dispose();
    _placaController.dispose();
    _vehiculoController.dispose();
    _notasController.dispose();
    super.dispose();
  }

  Future<void> _registrarVisitante() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _loadingForm = true);

    final token = await _storage.read(key: "access");
    if (token == null && mounted) {
      _showSnack("No autenticado. Por favor, inicia sesión.", isError: true);
      setState(() => _loadingForm = false);
      return;
    }

    final body = jsonEncode({
      "nombre": _nombreController.text.trim(),
      "ci": _ciController.text.trim(),
      "motivo": _motivoController.text.trim(),
      "placa": _placaController.text.trim(),
      "vehiculo": _vehiculoController.text.trim(),
      "notas": _notasController.text.trim(),
    });

    try {
      final res = await http.post(
        Uri.parse(baseUrl),
        headers: {
          "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
        body: body,
      );

      if (!mounted) return;

      if (res.statusCode == 201) {
        _showSnack("✅ Visitante registrado con éxito.");
        _nombreController.clear();
        _ciController.clear();
        _motivoController.clear();
        _placaController.clear();
        _vehiculoController.clear();
        _notasController.clear();
      } else if (res.statusCode == 400) {
        final errorBody = jsonDecode(utf8.decode(res.bodyBytes));
        String errorMessage = "Error desconocido.";
        if (errorBody.containsKey('visitante')) {
          errorMessage = "El CI ya está registrado.";
        } else if (errorBody.containsKey('detail')) {
          errorMessage = errorBody['detail'];
        }
        _showSnack("Error: $errorMessage", isError: true);
      } else {
        _showSnack("Error al registrar (${res.statusCode})", isError: true);
      }
    } catch (err) {
      _showSnack("Error de conexión. Inténtalo de nuevo.", isError: true);
    } finally {
      if (mounted) setState(() => _loadingForm = false);
    }
  }

  void _showSnack(String msg, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: isError ? Colors.red.shade800 : Colors.green.shade800,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[300],
      appBar: AppBar(
        title: const Text(
          "Registro de Visitantes",
          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              NeumorphicSurface(
                padding: const EdgeInsets.all(20),
                child: Form(
                  key: _formKey,
                  child: Column(
                    children: [
                      NeumorphicInset(
                        child: TextFormField(
                          controller: _nombreController,
                          validator: (v) => v == null || v.isEmpty
                              ? "El nombre es obligatorio"
                              : null,
                          decoration: const InputDecoration(
                            border: InputBorder.none,
                            hintText: "Nombre completo",
                          ),
                        ),
                      ),
                      const SizedBox(height: 15),
                      NeumorphicInset(
                        child: TextFormField(
                          controller: _ciController,
                          validator: (v) {
                            if (v == null || v.isEmpty)
                              return "El CI es obligatorio";
                            if (!RegExp(r'^\d+$').hasMatch(v))
                              return "El CI debe contener solo números";
                            return null;
                          },
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            border: InputBorder.none,
                            hintText: "C.I. (Carnet de Identidad)",
                          ),
                        ),
                      ),
                      const SizedBox(height: 15),
                      NeumorphicInset(
                        child: TextFormField(
                          controller: _motivoController,
                          decoration: const InputDecoration(
                            border: InputBorder.none,
                            hintText: "Motivo (opcional)",
                          ),
                        ),
                      ),
                      const SizedBox(height: 15),
                      NeumorphicInset(
                        child: TextFormField(
                          controller: _placaController,
                          decoration: const InputDecoration(
                            border: InputBorder.none,
                            hintText: "Placa del vehículo (opcional)",
                          ),
                        ),
                      ),
                      const SizedBox(height: 15),
                      NeumorphicInset(
                        child: TextFormField(
                          controller: _vehiculoController,
                          decoration: const InputDecoration(
                            border: InputBorder.none,
                            hintText: "Tipo de vehículo (opcional)",
                          ),
                        ),
                      ),
                      const SizedBox(height: 15),
                      NeumorphicInset(
                        child: TextFormField(
                          controller: _notasController,
                          minLines: 3,
                          maxLines: null, // permite crecer dinámicamente
                          keyboardType: TextInputType.multiline,
                          decoration: const InputDecoration(
                            border: InputBorder.none,
                            hintText: "Notas (opcional)",
                            contentPadding: EdgeInsets.all(12),
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      _loadingForm
                          ? const CircularProgressIndicator()
                          : NeumorphicSurface(
                              padding: const EdgeInsets.symmetric(vertical: 0),
                              child: ElevatedButton.icon(
                                onPressed: _registrarVisitante,
                                icon: const Icon(Icons.person_add),
                                label: const Text("Registrar Visitante"),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.black,
                                  foregroundColor: Colors.white,
                                  minimumSize: const Size.fromHeight(50),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                ),
                              ),
                            ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
              NeumorphicSurface(
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const ListaVisitantesPage(),
                      ),
                    );
                  },
                  icon: const Icon(Icons.list),
                  label: const Text("Ver mis visitantes"),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.black,
                    foregroundColor: Colors.white,
                    minimumSize: const Size.fromHeight(50),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
