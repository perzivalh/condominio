import 'package:flutter/material.dart';

import '../../core/app_colors.dart';
import '../../models/finance_models.dart';
import '../../models/resident_profile.dart';
import '../../services/finance_service.dart';
import '../../widgets/neumorphic.dart';
import '../../widgets/resident_bottom_nav.dart';
import 'finanzas_historial_page.dart';
import 'finanzas_pago_page.dart';

enum FinancePaymentSelection { total, oldest }

class FinanzasPage extends StatefulWidget {
  const FinanzasPage({super.key, required this.session});

  final ResidentSession session;

  @override
  State<FinanzasPage> createState() => _FinanzasPageState();
}

class _FinanzasPageState extends State<FinanzasPage> {
  final FinanceService _service = FinanceService();
  FinanceSummary? _summary;
  String? _error;
  bool _isLoading = false;
  FinancePaymentSelection _selection = FinancePaymentSelection.total;

  @override
  void initState() {
    super.initState();
    _loadSummary();
  }

  Future<void> _loadSummary() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final summary = await _service.fetchSummary();
      setState(() {
        _summary = summary;
      });
    } catch (error) {
      setState(() {
        _error = error.toString();
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _navigateToHistory() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => FinanzasHistorialPage(session: widget.session),
      ),
    );
  }

  void _navigateToPayment(FinanceSummary summary) {
    FinanceInvoice? selectedInvoice;
    double monto = summary.totalPendiente;
    String titulo = 'Deuda total';

    if (_selection == FinancePaymentSelection.oldest) {
      selectedInvoice = summary.facturaMasAntigua;
      if (selectedInvoice == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No hay facturas pendientes.')),
        );
        return;
      }
      monto = selectedInvoice.monto;
      titulo = 'Factura más antigua';
    }

    if (summary.cantidadPendiente == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No tienes pagos pendientes.')),
      );
      return;
    }

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => FinanzasPagoPage(
          session: widget.session,
          summary: summary,
          montoSeleccionado: monto,
          tituloSeleccion: titulo,
          facturaSeleccionada: selectedInvoice,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final summary = _summary;

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
                    'Finanzas',
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
              child: RefreshIndicator(
                color: AppColors.primaryText,
                onRefresh: _loadSummary,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  child: _buildContent(summary),
                ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: ResidentBottomNavBar(
        selectedIndex: 1,
        onChanged: (index) {
          if (index == 1) return;
          Navigator.of(context).pop();
        },
      ),
    );
  }

  Widget _buildContent(FinanceSummary? summary) {
    if (_isLoading) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.only(top: 80),
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (_error != null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'No se pudo cargar la información.',
            style: const TextStyle(
              color: Colors.redAccent,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _error!,
            style: const TextStyle(color: AppColors.secondaryText),
          ),
          const SizedBox(height: 16),
          NeumorphicSurface(
            borderRadius: BorderRadius.circular(20),
            child: TextButton(
              onPressed: _loadSummary,
              child: const Text('Reintentar'),
            ),
          ),
        ],
      );
    }

    if (summary == null) {
      return const SizedBox.shrink();
    }

    final hasPendientes = summary.cantidadPendiente > 0;
    final oldestAmount = summary.facturaMasAntigua?.monto ?? 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        NeumorphicSurface(
          borderRadius: BorderRadius.circular(32),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 26),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Total a Pagar',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.secondaryText,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Bs ${summary.totalPendiente.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primaryText,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Facturas pendientes:  ${summary.cantidadPendiente}',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primaryText,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Monto factura pendiente más antigua:  Bs ${oldestAmount.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primaryText,
                ),
              ),
              const SizedBox(height: 18),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _radioOption(
                    title: 'Deuda total',
                    subtitle: 'Bs ${summary.totalPendiente.toStringAsFixed(2)}',
                    value: FinancePaymentSelection.total,
                    enabled: hasPendientes,
                  ),
                  const SizedBox(height: 8),
                  _radioOption(
                    title: 'Más antigua',
                    subtitle: 'Bs ${oldestAmount.toStringAsFixed(2)}',
                    value: FinancePaymentSelection.oldest,
                    enabled: hasPendientes && summary.facturaMasAntigua != null,
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        NeumorphicSurface(
          borderRadius: BorderRadius.circular(24),
          padding: EdgeInsets.zero,
          child: Material(
            color: Colors.transparent,
            borderRadius: BorderRadius.circular(24),
            child: InkWell(
              borderRadius: BorderRadius.circular(24),
              onTap: hasPendientes ? () => _navigateToPayment(summary) : null,
              child: const SizedBox(
                height: 56,
                child: Center(
                  child: Text(
                    'Pagar',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primaryText,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 18),
        NeumorphicSurface(
          borderRadius: BorderRadius.circular(24),
          padding: EdgeInsets.zero,
          child: Material(
            color: Colors.transparent,
            borderRadius: BorderRadius.circular(24),
            child: InkWell(
              borderRadius: BorderRadius.circular(24),
              onTap: _navigateToHistory,
              child: const SizedBox(
                height: 56,
                child: Center(
                  child: Text(
                    'Historial',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primaryText,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _radioOption({
    required String title,
    required String subtitle,
    required FinancePaymentSelection value,
    required bool enabled,
  }) {
    return Opacity(
      opacity: enabled ? 1 : 0.4,
      child: GestureDetector(
        onTap: enabled
            ? () {
                setState(() {
                  _selection = value;
                });
              }
            : null,
        child: Row(
          children: [
            Radio<FinancePaymentSelection>(
              value: value,
              // ignore: deprecated_member_use
              groupValue: enabled ? _selection : null,
              activeColor: AppColors.primaryText,
              // ignore: deprecated_member_use
              onChanged: enabled
                  ? (val) {
                      if (val != null) {
                        setState(() {
                          _selection = val;
                        });
                      }
                    }
                  : null,
            ),
            const SizedBox(width: 4),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 16,
                      color: AppColors.primaryText,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 14,
                      color: AppColors.secondaryText,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}


