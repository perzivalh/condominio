import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../widgets/neumorphic.dart';

const String baseUrl = 'http://192.168.0.15:8000/api/historial-visitas/';

class ListaVisitantesPage extends StatefulWidget {
  const ListaVisitantesPage({super.key});

  @override
  State<ListaVisitantesPage> createState() => _ListaVisitantesPageState();
}

class _ListaVisitantesPageState extends State<ListaVisitantesPage> {
  final _scrollController = ScrollController();
  final _storage = const FlutterSecureStorage();

  bool _loadingList = true;
  bool _hasMore = true;
  List<dynamic> visitantes = [];
  String? _nextPageUrl;
  String _searchText = '';

  @override
  void initState() {
    super.initState();
    _fetchVisitantes();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_loadingList &&
        _hasMore &&
        _scrollController.position.pixels >=
            _scrollController.position.maxScrollExtent * 0.9) {
      _fetchVisitantes(isPaginating: true);
    }
  }

  Future<void> _fetchVisitantes({bool isPaginating = false}) async {
    if (!mounted) return;

    if (!isPaginating) {
      setState(() {
        _loadingList = true;
        _hasMore = true;
        _nextPageUrl = null;
        visitantes.clear();
      });
    }

    final token = await _storage.read(key: "access");
    if (token == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("No autenticado. Por favor, inicia sesión."),
            backgroundColor: Colors.red,
          ),
        );
        setState(() => _loadingList = false);
      }
      return;
    }

    final url = _nextPageUrl ?? baseUrl;

    try {
      final res = await http.get(
        Uri.parse(url),
        headers: {
          "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
      );

      if (!mounted) return;

      if (res.statusCode == 200) {
        final decodedData = jsonDecode(utf8.decode(res.bodyBytes));
        List<dynamic> newVisitantes = [];

        if (decodedData is Map && decodedData.containsKey('results')) {
          newVisitantes = decodedData['results'];
          _nextPageUrl = decodedData['next'];
          _hasMore = _nextPageUrl != null;
        } else if (decodedData is List) {
          newVisitantes = decodedData;
          _hasMore = false;
        } else {
          _hasMore = false;
        }

        setState(() {
          visitantes.addAll(newVisitantes);
        });
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Error al traer visitantes (${res.statusCode})"),
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text("Error de conexión.")));
      }
    } finally {
      if (mounted) setState(() => _loadingList = false);
    }
  }

  Color _getEstadoColor(String estado) {
    switch (estado.toLowerCase()) {
      case 'pendiente':
        return Colors.orange.shade700;
      case 'autorizado':
        return Colors.blue.shade700;
      case 'ingresado':
        return Colors.green.shade700;
      case 'salida':
        return Colors.grey.shade700;
      case 'denegado':
        return Colors.red.shade700;
      default:
        return Colors.black54;
    }
  }

  @override
  Widget build(BuildContext context) {
    final filteredVisitantes = visitantes.where((v) {
      final nombre = (v['visitante']?['nombre'] ?? '').toLowerCase();
      final ci = (v['visitante']?['ci'] ?? '').toLowerCase();
      final motivo = (v['motivo'] ?? '').toLowerCase();
      return nombre.contains(_searchText) ||
          ci.contains(_searchText) ||
          motivo.contains(_searchText);
    }).toList();

    return Scaffold(
      backgroundColor: Colors.grey[300],
      appBar: AppBar(
        title: const Text(
          "Mis Visitantes",
          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: Column(
        children: [
          // Campo de búsqueda neumórfico
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: NeumorphicSurface(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: TextField(
                decoration: const InputDecoration(
                  border: InputBorder.none,
                  hintText: "Buscar visitante",
                  prefixIcon: Icon(Icons.search, color: Colors.black),
                ),
                onChanged: (value) {
                  setState(() => _searchText = value.toLowerCase());
                },
              ),
            ),
          ),
          // Lista de visitantes
          Expanded(
            child: _loadingList && visitantes.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : RefreshIndicator(
                    onRefresh: () async {
                      visitantes.clear();
                      _hasMore = true;
                      _nextPageUrl = null;
                      await _fetchVisitantes();
                    },
                    child: ListView.builder(
                      controller: _scrollController,
                      itemCount: filteredVisitantes.length + (_hasMore ? 1 : 0),
                      itemBuilder: (_, index) {
                        if (index == filteredVisitantes.length) {
                          return _hasMore
                              ? const Padding(
                                  padding: EdgeInsets.symmetric(vertical: 20),
                                  child: Center(
                                    child: CircularProgressIndicator(),
                                  ),
                                )
                              : const SizedBox.shrink();
                        }

                        final v = filteredVisitantes[index];
                        final visitanteData = v['visitante'] ?? {};
                        final estado = v['estado'] ?? 'pendiente';
                        final estadoColor = _getEstadoColor(estado);

                        return Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 8,
                          ),
                          child: NeumorphicSurface(
                            padding: const EdgeInsets.all(12),
                            child: ListTile(
                              leading: Icon(
                                Icons.person,
                                size: 36,
                                color: Colors.black,
                              ),
                              title: Text(
                                visitanteData['nombre'] ?? '-',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                              subtitle: Text(
                                "CI: ${visitanteData['ci'] ?? '-'}\nMotivo: ${v['motivo'] ?? '-'}",
                                style: const TextStyle(
                                  height: 1.5,
                                  fontSize: 14,
                                ),
                              ),
                              trailing: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: estadoColor.withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: estadoColor,
                                    width: 1.5,
                                  ),
                                ),
                                child: Text(
                                  estado.toUpperCase(),
                                  style: TextStyle(
                                    color: estadoColor,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
