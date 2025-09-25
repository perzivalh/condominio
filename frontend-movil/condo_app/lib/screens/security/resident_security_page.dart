import 'package:flutter/material.dart';

import '../../core/app_colors.dart';
import '../../models/resident_profile.dart';
import '../../models/security_models.dart';
import '../../services/security_service.dart';
import '../../widgets/neumorphic.dart';

class ResidentSecurityPage extends StatefulWidget {
  const ResidentSecurityPage({super.key, required this.session});

  final ResidentSession session;

  @override
  State<ResidentSecurityPage> createState() => _ResidentSecurityPageState();
}

class _ResidentSecurityPageState extends State<ResidentSecurityPage> {
  final _service = SecurityService();
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _otherCategoryController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();
  final TextEditingController _locationController = TextEditingController();

  List<SecurityIncidentCategory> _categories = [];
  String? _selectedCategoryId;
  bool _loadingCategories = false;
  bool _submitting = false;
  String? _loadError;

  @override
  void initState() {
    super.initState();
    final defaultLocation = widget.session.profile.codigoUnidad;
    if (defaultLocation != null && defaultLocation.isNotEmpty) {
      _locationController.text = defaultLocation;
    }
    _loadCategories();
  }

  @override
  void dispose() {
    _otherCategoryController.dispose();
    _descriptionController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  Future<void> _loadCategories() async {
    setState(() {
      _loadingCategories = true;
      _loadError = null;
    });
    try {
      final categories = await _service.fetchCategories();
      if (!mounted) return;
      setState(() {
        _categories = categories;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loadError = 'No se pudieron cargar las categorías.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loadingCategories = false;
        });
      }
    }
  }

  bool get _isOtherCategorySelected => _selectedCategoryId == '_other';

  Future<void> _submit({required bool emergency}) async {
    if (_submitting) return;

    if (!emergency) {
      final valid = _formKey.currentState?.validate() ?? false;
      if (!valid) {
        return;
      }
    }

    setState(() {
      _submitting = true;
    });

    try {
      final defaultLocation = widget.session.profile.codigoUnidad;
      final String locationValue;
      if (emergency) {
        if (defaultLocation != null && defaultLocation.isNotEmpty) {
          locationValue = 'Vivienda $defaultLocation';
        } else {
          locationValue = 'Vivienda del residente';
        }
      } else {
        locationValue = _locationController.text;
      }

      await _service.reportIncident(
        categoriaId: emergency || _isOtherCategorySelected ? null : _selectedCategoryId,
        categoriaOtro: emergency
            ? 'Emergencia'
            : (_isOtherCategorySelected ? _otherCategoryController.text : null),
        descripcion: _descriptionController.text,
        ubicacion: locationValue,
        esEmergencia: emergency,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(emergency
              ? 'Emergencia enviada. Seguridad está notificándose.'
              : 'Reporte enviado a seguridad.'),
        ),
      );

      if (!emergency) {
        _formKey.currentState?.reset();
        setState(() {
          _selectedCategoryId = null;
        });
        _otherCategoryController.clear();
        _descriptionController.clear();
      }
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    } finally {
      if (mounted) {
        setState(() {
          _submitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back_ios_new_rounded),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'Seguridad',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primaryText,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildHeroCard(context),
                    const SizedBox(height: 24),
                    _buildReportForm(context),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeroCard(BuildContext context) {
    return NeumorphicSurface(
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Icon(Icons.local_police_outlined, size: 48, color: AppColors.primaryText),
          const SizedBox(height: 16),
          const Text(
            'Reportar a seguridad',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: AppColors.primaryText,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          const Text(
            'Describe la situación o usa el botón de emergencia para alertar al personal de guardia.',
            style: TextStyle(color: AppColors.secondaryText, height: 1.4),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _submitting ? null : () => _submit(emergency: false),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.accent,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 36, vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
            ),
            child: Text(_submitting ? 'Enviando...' : 'Reportar'),
          ),
          const SizedBox(height: 14),
          TextButton.icon(
            onPressed: _submitting ? null : () => _submit(emergency: true),
            style: TextButton.styleFrom(
              foregroundColor: Colors.red.shade500,
              textStyle: const TextStyle(fontWeight: FontWeight.w700),
            ),
            icon: const Icon(Icons.emergency_outlined),
            label: const Text('Botón de emergencia'),
          ),
        ],
      ),
    );
  }

  Widget _buildReportForm(BuildContext context) {
    return NeumorphicSurface(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Detalles del incidente',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: AppColors.primaryText,
            ),
          ),
          const SizedBox(height: 16),
          if (_loadingCategories)
            const Center(child: CircularProgressIndicator())
          else if (_loadError != null)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _loadError!,
                  style: const TextStyle(color: Colors.redAccent, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 12),
                FilledButton.tonal(
                  onPressed: _loadCategories,
                  child: const Text('Reintentar'),
                ),
              ],
            )
          else
            Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  DropdownButtonFormField<String>(
                    value: _selectedCategoryId,
                    decoration: _inputDecoration('Categoría'),
                    items: [
                      ..._categories.map(
                        (category) => DropdownMenuItem(
                          value: category.id,
                          child: Text(category.nombre),
                        ),
                      ),
                      const DropdownMenuItem(
                        value: '_other',
                        child: Text('Otro (especificar)'),
                      ),
                    ],
                    onChanged: (value) {
                      setState(() {
                        _selectedCategoryId = value;
                      });
                    },
                    validator: (value) {
                      final otherText = _otherCategoryController.text.trim();
                      if ((value == null || value.isEmpty) && otherText.isEmpty) {
                        return 'Selecciona una categoría o describe la situación.';
                      }
                      return null;
                    },
                  ),
                  if (_isOtherCategorySelected) ...[
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _otherCategoryController,
                      decoration: _inputDecoration('Describe la categoría'),
                      validator: (value) {
                        if (_isOtherCategorySelected && (value == null || value.trim().isEmpty)) {
                          return 'Escribe una categoría.';
                        }
                        return null;
                      },
                    ),
                  ],
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: _descriptionController,
                    maxLines: 3,
                    decoration: _inputDecoration('Descripción (opcional)'),
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: _locationController,
                    decoration: _inputDecoration('Ubicación'),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Indica una ubicación de referencia.';
                      }
                      return null;
                    },
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  InputDecoration _inputDecoration(String label) {
    return InputDecoration(
      labelText: label,
      filled: true,
      fillColor: AppColors.surface,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: BorderSide.none,
      ),
    );
  }
}
