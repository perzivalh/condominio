import 'package:flutter/material.dart';

import '../../core/app_colors.dart';
import '../../models/notification_model.dart';
import '../../models/resident_profile.dart';
import '../../services/notification_service.dart';
import '../../widgets/neumorphic.dart';
import '../../widgets/resident_bottom_nav.dart';

class ResidentNotificationsPage extends StatefulWidget {
  const ResidentNotificationsPage({
    super.key,
    required this.session,
  });

  final ResidentSession session;

  @override
  State<ResidentNotificationsPage> createState() =>
      _ResidentNotificationsPageState();
}

class _ResidentNotificationsPageState extends State<ResidentNotificationsPage> {
  final NotificationService _service = NotificationService();
  final Set<String> _marking = <String>{};

  List<ResidentNotification> _notifications = <ResidentNotification>[];
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final data = await _service.fetchNotifications();
      setState(() {
        _notifications = data;
      });
    } catch (error) {
      setState(() {
        _error = error.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _markAsRead(ResidentNotification notification) async {
    if (notification.leida || _marking.contains(notification.id)) {
      return;
    }

    setState(() {
      _marking.add(notification.id);
    });

    try {
      await _service.markAsRead(notification.id);
      if (!mounted) return;
      setState(() {
        _notifications = _notifications
            .map(
              (item) => item.id == notification.id
                  ? item.copyWith(estado: 'LEIDA', actualizadoEn: DateTime.now())
                  : item,
            )
            .toList();
      });
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('No se pudo marcar como leída: $error')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _marking.remove(notification.id);
        });
      } else {
        _marking.remove(notification.id);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = widget.session.profile;

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
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Notificaciones',
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primaryText,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          profile.fullName.isNotEmpty
                              ? profile.fullName
                              : profile.displayCode,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.secondaryText,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: RefreshIndicator(
                color: AppColors.primaryText,
                onRefresh: _loadNotifications,
                child: _buildContent(),
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

  Widget _buildContent() {
    if (_isLoading && _notifications.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.only(top: 80),
          child: CircularProgressIndicator(),
        ),
      );
    }

    final physics = const AlwaysScrollableScrollPhysics();

    if (_notifications.isEmpty) {
      return ListView(
        physics: physics,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
        children: [
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Text(
                _error!,
                style: const TextStyle(
                  color: Colors.redAccent,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          const NeumorphicSurface(
            borderRadius: BorderRadius.all(Radius.circular(24)),
            padding: EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: Text(
              'Aún no tienes notificaciones. Aquí aparecerán los avisos que el administrador te envíe.',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: AppColors.secondaryText,
              ),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      );
    }

    return ListView.separated(
      physics: physics,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      itemCount: _notifications.length,
      separatorBuilder: (_, __) => const SizedBox(height: 16),
      itemBuilder: (context, index) {
        final notification = _notifications[index];
        return _NotificationCard(
          notification: notification,
          onMarkAsRead: _markAsRead,
          isProcessing: _marking.contains(notification.id),
        );
      },
    );
  }
}

class _NotificationCard extends StatelessWidget {
  const _NotificationCard({
    required this.notification,
    required this.onMarkAsRead,
    required this.isProcessing,
  });

  final ResidentNotification notification;
  final ValueChanged<ResidentNotification> onMarkAsRead;
  final bool isProcessing;

  String _formatDate(DateTime date) {
    final local = date.toLocal();
    final day = local.day.toString().padLeft(2, '0');
    final month = local.month.toString().padLeft(2, '0');
    return '$day/$month/${local.year}';
  }

  @override
  Widget build(BuildContext context) {
    final isRead = notification.leida;
    final statusColor = isRead ? Colors.teal : AppColors.primaryText;

    return NeumorphicSurface(
      borderRadius: BorderRadius.circular(26),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  notification.titulo,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primaryText,
                  ),
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Text(
                  isRead ? 'Leída' : 'Nueva',
                  style: TextStyle(
                    color: statusColor,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            notification.mensaje,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w500,
              color: AppColors.secondaryText,
              height: 1.45,
            ),
          ),
          if (notification.facturaId != null || notification.pagoId != null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (notification.facturaId != null)
                    Text(
                      'Factura vinculada: ${notification.facturaId}',
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.secondaryText,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  if (notification.pagoId != null)
                    Text(
                      'Pago relacionado: ${notification.pagoId}',
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.secondaryText,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                ],
              ),
            ),
          const SizedBox(height: 16),
          Row(
            children: [
              Text(
                'Enviado: ${_formatDate(notification.creadoEn)}',
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.secondaryText,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const Spacer(),
              if (!notification.leida)
                TextButton.icon(
                  onPressed:
                      isProcessing ? null : () => onMarkAsRead(notification),
                  icon: isProcessing
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.done_all_rounded),
                  label: const Text('Marcar como leída'),
                )
              else
                const Icon(
                  Icons.verified_rounded,
                  color: Colors.teal,
                ),
            ],
          ),
        ],
      ),
    );
  }
}

