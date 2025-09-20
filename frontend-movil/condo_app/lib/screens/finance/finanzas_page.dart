import 'package:flutter/material.dart';

import '../../core/app_colors.dart';
import '../../models/finance_models.dart';
import '../../models/resident_profile.dart';
import '../../services/finance_service.dart';
import '../../widgets/neumorphic.dart';
import '../../widgets/resident_bottom_nav.dart';
import 'finanzas_historial_page.dart';
import 'finanzas_pago_page.dart';

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

  Future<void> _navigateToPayment(FinanceInvoice invoice) async {
    final result = await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => FinanzasPagoPage(
          session: widget.session,
          montoSeleccionado: invoice.monto,
          facturaSeleccionada: invoice,
        ),
      ),
    );

    if (!mounted) return;
    if (result == true) {
      await _loadSummary();
    }
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
    final oldestInvoice = summary.facturaMasAntigua;

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
              if (oldestInvoice != null) ...[
                Text(
                  'Factura pendiente más antigua: ${oldestInvoice.periodo}',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primaryText,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Monto: Bs ${oldestInvoice.monto.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontSize: 15,
                    color: AppColors.secondaryText,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ] else ...[
                const Text(
                  'No tienes facturas antiguas en espera.',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppColors.secondaryText,
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 24),
        const Text(
          'Facturas pendientes',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.primaryText,
          ),
        ),
        const SizedBox(height: 12),
        if (!hasPendientes)
          const NeumorphicSurface(
            borderRadius: BorderRadius.all(Radius.circular(24)),
            padding: EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: Center(
              child: Text(
                'No tienes pagos pendientes. ¡Todo al día!',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: AppColors.secondaryText,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          )
        else
          Column(
            children: summary.pendientes
                .map((invoice) => _invoiceCard(invoice))
                .toList(),
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

  Widget _invoiceCard(FinanceInvoice invoice) {
    String formatDate(DateTime? date) {
      if (date == null) return '--';
      final local = date.toLocal();
      final day = local.day.toString().padLeft(2, '0');
      final month = local.month.toString().padLeft(2, '0');
      return '$day/$month/${local.year}';
    }

    final estado = (invoice.estado).toUpperCase();
    final isRevision = estado == 'REVISION';
    final canPay = estado == 'PENDIENTE';
    final statusLabel = isRevision ? 'En revisión' : 'Pendiente';
    final statusColor = isRevision ? Colors.blueGrey : Colors.orangeAccent;

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: NeumorphicSurface(
        borderRadius: BorderRadius.circular(24),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 22),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Periodo ${invoice.periodo}',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppColors.primaryText,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Monto: Bs ${invoice.monto.toStringAsFixed(2)}',
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: AppColors.secondaryText,
              ),
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    statusLabel,
                    style: TextStyle(
                      color: statusColor,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const Spacer(),
                Text(
                  'Vence: ${formatDate(invoice.fechaVencimiento)}',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.secondaryText,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor:
                      canPay ? AppColors.primaryText : Colors.grey.shade400,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(18),
                  ),
                ),
                onPressed: canPay ? () => _navigateToPayment(invoice) : null,
                child: Text(
                  canPay ? 'Pagar factura' : 'En revisión',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}


