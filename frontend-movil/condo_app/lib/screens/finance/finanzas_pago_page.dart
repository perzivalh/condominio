import 'package:flutter/material.dart';

import '../../core/app_colors.dart';
import '../../models/finance_models.dart';
import '../../models/resident_profile.dart';
import '../../widgets/neumorphic.dart';
import '../../widgets/resident_bottom_nav.dart';

class FinanzasPagoPage extends StatelessWidget {
  const FinanzasPagoPage({
    super.key,
    required this.session,
    required this.summary,
    required this.montoSeleccionado,
    required this.tituloSeleccion,
    this.facturaSeleccionada,
  });

  final ResidentSession session;
  final FinanceSummary summary;
  final double montoSeleccionado;
  final String tituloSeleccion;
  final FinanceInvoice? facturaSeleccionada;

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
                    'Métodos de pago',
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
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    NeumorphicSurface(
                      borderRadius: BorderRadius.circular(32),
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 26),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Detalles',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primaryText,
                            ),
                          ),
                          const SizedBox(height: 18),
                          _detailLine('Tipo de producto', facturaSeleccionada?.tipo ?? 'expensa'),
                          _detailLine('Numero de cuenta', session.profile.residenteId),
                          _detailLine('Monto seleccionado', 'Bs ${montoSeleccionado.toStringAsFixed(2)}'),
                          _detailLine('Número de factura', facturaSeleccionada?.id ?? '--'),
                          _detailLine('Periodo', facturaSeleccionada?.periodo ?? '--'),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        _PaymentOption(
                          icon: Icons.qr_code_2_rounded,
                          label: 'QR',
                          onTap: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Pago con QR pendiente de integración.')),
                            );
                          },
                        ),
                        _PaymentOption(
                          icon: Icons.credit_card,
                          label: 'Tarjeta',
                          onTap: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Pago con tarjeta pendiente de integración.')),
                            );
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: ResidentBottomNavBar(
        selectedIndex: 1,
        onChanged: (index) {
          Navigator.of(context).pop();
        },
      ),
    );
  }

  Widget _detailLine(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: RichText(
        text: TextSpan(
          text: '$label: ',
          style: const TextStyle(
            color: AppColors.primaryText,
            fontWeight: FontWeight.w700,
            fontSize: 15,
          ),
          children: [
            TextSpan(
              text: value,
              style: const TextStyle(
                color: AppColors.secondaryText,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PaymentOption extends StatelessWidget {
  const _PaymentOption({required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8),
        child: NeumorphicSurface(
          borderRadius: BorderRadius.circular(26),
          padding: EdgeInsets.zero,
          child: Material(
            color: Colors.transparent,
            borderRadius: BorderRadius.circular(26),
            child: InkWell(
              borderRadius: BorderRadius.circular(26),
              onTap: onTap,
              child: SizedBox(
                height: 120,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(icon, size: 48, color: AppColors.primaryText),
                    const SizedBox(height: 16),
                    Text(
                      label,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primaryText,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
