import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/app_colors.dart';
import '../../models/finance_models.dart';
import '../../models/resident_profile.dart';
import '../../services/finance_service.dart';
import '../../widgets/neumorphic.dart';
import '../../widgets/resident_bottom_nav.dart';

class FinanzasPagoQrPage extends StatefulWidget {
  const FinanzasPagoQrPage({
    super.key,
    required this.session,
    required this.montoSeleccionado,
    required this.facturaSeleccionada,
  });

  final ResidentSession session;
  final double montoSeleccionado;
  final FinanceInvoice? facturaSeleccionada;

  @override
  State<FinanzasPagoQrPage> createState() => _FinanzasPagoQrPageState();
}

class _FinanzasPagoQrPageState extends State<FinanzasPagoQrPage> {
  final FinanceService _service = FinanceService();
  FinanceQrConfig? _qrConfig;
  bool _isLoading = false;
  bool _confirming = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadQr();
  }

  Future<void> _loadQr() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final config = await _service.fetchQrConfig();
      setState(() {
        _qrConfig = config;
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

  Future<void> _openQrInBrowser() async {
    final url = _qrConfig?.url;
    if (url == null || url.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No se encontró un archivo QR para descargar.')),
      );
      return;
    }

    final uri = Uri.tryParse(url);
    if (uri == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('El enlace del QR no es válido.')),
      );
      return;
    }

    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No fue posible abrir el enlace.')),
      );
    }
  }

  Future<void> _shareQr() async {
    final url = _qrConfig?.url;
    if (url == null || url.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No se encontró un archivo QR para compartir.')),
      );
      return;
    }

    await Share.share(url, subject: 'QR de pago del condominio');
  }

  Future<void> _confirmarPago() async {
    final factura = widget.facturaSeleccionada;
    if (factura == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecciona una factura pendiente para confirmar el pago.')),
      );
      return;
    }

    final continuar = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Confirmar pago'),
          content: const Text('¿Confirma que realizó el pago mediante QR?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancelar'),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Aceptar'),
            ),
          ],
        );
      },
    );

    if (continuar != true) {
      return;
    }

    setState(() {
      _confirming = true;
      _error = null;
    });

    try {
      await _service.confirmInvoicePayment(
        factura.id,
        monto: widget.montoSeleccionado,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Tu pago fue enviado a revisión.')),
      );
      Navigator.of(context).pop(true);
    } catch (error) {
      setState(() {
        _error = error.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _confirming = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final factura = widget.facturaSeleccionada;

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
                    'Pago con QR',
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
                onRefresh: _loadQr,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      NeumorphicSurface(
                        borderRadius: BorderRadius.circular(32),
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Detalles de la factura',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primaryText,
                              ),
                            ),
                            const SizedBox(height: 16),
                            _detailLine('Periodo', factura?.periodo ?? '--'),
                            _detailLine('Monto a pagar',
                                'Bs ${widget.montoSeleccionado.toStringAsFixed(2)}'),
                            _detailLine('Estado', factura?.estado ?? '--'),
                            _detailLine('Número de factura', factura?.id ?? '--'),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      if (_error != null)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Text(
                            _error!,
                            style: const TextStyle(color: Colors.redAccent),
                          ),
                        ),
                      NeumorphicSurface(
                        borderRadius: BorderRadius.circular(32),
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 26),
                        child: Column(
                          children: [
                            if (_isLoading)
                              const Padding(
                                padding: EdgeInsets.symmetric(vertical: 32),
                                child: CircularProgressIndicator(),
                              )
                            else if (_qrConfig == null)
                              const Padding(
                                padding: EdgeInsets.symmetric(vertical: 32),
                                child: Text(
                                  'Aún no se configuró un QR de pago. Vuelve a intentarlo más tarde.',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    color: AppColors.secondaryText,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              )
                            else
                              Column(
                                children: [
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(28),
                                    child: Image.network(
                                      _qrConfig!.url,
                                      height: 220,
                                      fit: BoxFit.cover,
                                      errorBuilder: (context, error, stackTrace) {
                                        return const SizedBox(
                                          height: 220,
                                          child: Center(
                                            child: Text('No se pudo cargar la imagen.'),
                                          ),
                                        );
                                      },
                                    ),
                                  ),
                                  const SizedBox(height: 18),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                                    children: [
                                      _ActionButton(
                                        icon: Icons.download_rounded,
                                        label: 'Descargar',
                                        onTap: _openQrInBrowser,
                                      ),
                                      _ActionButton(
                                        icon: Icons.ios_share_rounded,
                                        label: 'Compartir',
                                        onTap: _shareQr,
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            const SizedBox(height: 28),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(vertical: 16),
                                  backgroundColor: AppColors.primaryText,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(18),
                                  ),
                                ),
                                onPressed:
                                    _confirming || _qrConfig == null ? null : _confirmarPago,
                                child: _confirming
                                    ? const SizedBox(
                                        height: 18,
                                        width: 18,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white,
                                        ),
                                      )
                                    : const Text(
                                        'Confirmar pago',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: ResidentBottomNavBar(
        selectedIndex: 1,
        onChanged: (index) {
          if (index != 1) {
            Navigator.of(context).pop();
          }
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

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8),
        child: NeumorphicSurface(
          borderRadius: BorderRadius.circular(22),
          padding: EdgeInsets.zero,
          child: Material(
            color: Colors.transparent,
            borderRadius: BorderRadius.circular(22),
            child: InkWell(
              borderRadius: BorderRadius.circular(22),
              onTap: onTap,
              child: SizedBox(
                height: 100,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(icon, size: 40, color: AppColors.primaryText),
                    const SizedBox(height: 12),
                    Text(
                      label,
                      style: const TextStyle(
                        fontSize: 15,
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
