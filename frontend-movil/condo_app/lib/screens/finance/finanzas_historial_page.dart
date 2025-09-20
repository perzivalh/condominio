import 'package:flutter/material.dart';

import '../../core/app_colors.dart';
import '../../models/finance_models.dart';
import '../../models/resident_profile.dart';
import '../../services/finance_service.dart';
import '../../widgets/neumorphic.dart';
import '../../widgets/resident_bottom_nav.dart';

class FinanzasHistorialPage extends StatefulWidget {
  const FinanzasHistorialPage({super.key, required this.session});

  final ResidentSession session;

  @override
  State<FinanzasHistorialPage> createState() => _FinanzasHistorialPageState();
}

class _FinanzasHistorialPageState extends State<FinanzasHistorialPage> {
  final FinanceService _service = FinanceService();
  late Future<List<FinanceInvoice>> _future;
  final Set<String> _expanded = <String>{};

  @override
  void initState() {
    super.initState();
    _future = _service.fetchInvoices();
  }

  Future<void> _reload() async {
    setState(() {
      _future = _service.fetchInvoices();
    });
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
                    'Historial',
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
                onRefresh: _reload,
                child: FutureBuilder<List<FinanceInvoice>>(
                  future: _future,
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    if (snapshot.hasError) {
                      return ListView(
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                        children: [
                          const SizedBox(height: 40),
                          const Text(
                            'No se pudo cargar el historial.',
                            style: TextStyle(
                              color: Colors.redAccent,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            snapshot.error.toString(),
                            style: const TextStyle(color: AppColors.secondaryText),
                          ),
                        ],
                      );
                    }

                    final facturas = snapshot.data ?? [];
                    if (facturas.isEmpty) {
                      return ListView(
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                        children: const [
                          SizedBox(height: 40),
                          Text(
                            'No existen facturas registradas.',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primaryText,
                            ),
                          ),
                        ],
                      );
                    }

                    return ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                      itemCount: facturas.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 14),
                      itemBuilder: (context, index) {
                        final invoice = facturas[index];
                        final isExpanded = _expanded.contains(invoice.id);
                        return _InvoiceItem(
                          invoice: invoice,
                          expanded: isExpanded,
                          onToggle: () {
                            setState(() {
                              if (isExpanded) {
                                _expanded.remove(invoice.id);
                              } else {
                                _expanded.add(invoice.id);
                              }
                            });
                          },
                        );
                      },
                    );
                  },
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
}

class _InvoiceItem extends StatelessWidget {
  const _InvoiceItem({
    required this.invoice,
    required this.expanded,
    required this.onToggle,
  });

  final FinanceInvoice invoice;
  final bool expanded;
  final VoidCallback onToggle;

  String get _estadoLabel => invoice.estado.toUpperCase();

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onToggle,
      child: NeumorphicInset(
        borderRadius: BorderRadius.circular(24),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    _formatPeriodo(invoice.periodo),
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primaryText,
                    ),
                  ),
                ),
                Text(
                  _estadoLabel,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: _estadoLabel == 'PAGADA'
                        ? Colors.green.shade600
                        : _estadoLabel == 'REVISION'
                            ? Colors.orangeAccent
                            : AppColors.secondaryText,
                  ),
                ),
                const SizedBox(width: 4),
                Icon(expanded ? Icons.expand_less : Icons.expand_more,
                    color: AppColors.secondaryText),
              ],
            ),
            if (expanded) ...[
              const SizedBox(height: 12),
              _infoLine('Monto de factura', 'Bs ${invoice.monto.toStringAsFixed(2)}'),
              _infoLine('Tipo de factura', invoice.tipo),
              _infoLine('Periodo', invoice.periodo),
              _infoLine('Fecha vencimiento', _formatDate(invoice.fechaVencimiento)),
              if (invoice.fechaPago != null)
                _infoLine('Fecha pago', _formatDate(invoice.fechaPago)),
              const SizedBox(height: 8),
              GestureDetector(
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Visualización de factura pendiente.')),
                  );
                },
                child: const Text(
                  'Ver factura',
                  style: TextStyle(
                    decoration: TextDecoration.underline,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primaryText,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _infoLine(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: RichText(
        text: TextSpan(
          text: '$label: ',
          style: const TextStyle(
            color: AppColors.primaryText,
            fontWeight: FontWeight.w600,
            fontSize: 14,
          ),
          children: [
            TextSpan(
              text: value,
              style: const TextStyle(
                fontWeight: FontWeight.w500,
                color: AppColors.secondaryText,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatPeriodo(String periodo) {
    return periodo.replaceAll('-', ' ');
  }

  String _formatDate(DateTime? date) {
    if (date == null) return '--';
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
  }
}
