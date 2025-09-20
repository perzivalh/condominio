import 'package:flutter/material.dart';

import '../core/app_colors.dart';
import '../core/app_routes.dart';
import '../models/notification_model.dart';
import '../models/resident_profile.dart';
import '../services/auth_service.dart';
import '../services/notification_service.dart';
import '../widgets/neumorphic.dart';
import '../widgets/resident_bottom_nav.dart';
import 'finance/finanzas_page.dart';
import 'notifications/resident_notifications_page.dart';

class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key, required this.session});

  final ResidentSession session;

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  int _selectedIndex = 1;
  final NotificationService _notificationService = NotificationService();
  final AuthService _authService = AuthService();
  bool _hasUnreadNotifications = false;
  bool _isLoggingOut = false;

  void _handleModuleTap(String module) {
    if (module == 'Finanzas') {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => FinanzasPage(session: widget.session),
        ),
      );
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Módulo "$module" aún no está disponible.'),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  void initState() {
    super.initState();
    _loadUnreadNotifications();
  }

  Future<void> _loadUnreadNotifications() async {
    try {
      final List<ResidentNotification> notifications =
          await _notificationService.fetchNotifications();
      if (!mounted) return;
      setState(() {
        _hasUnreadNotifications =
            notifications.any((notification) => !notification.leida);
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _hasUnreadNotifications = false;
      });
    }
  }

  Future<void> _handleNotificationsTap() async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ResidentNotificationsPage(session: widget.session),
      ),
    );
    if (!mounted) return;
    await _loadUnreadNotifications();
  }

  @override
  Widget build(BuildContext context) {
    final profile = widget.session.profile;
    final content = _buildContent(profile);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 250),
          child: content,
        ),
      ),
      bottomNavigationBar: ResidentBottomNavBar(
        selectedIndex: _selectedIndex,
        onChanged: _handleNavigationTap,
      ),
    );
  }

  Widget _buildContent(ResidentProfile profile) {
    switch (_selectedIndex) {
      case 2:
        return _ProfileContent(
          key: const ValueKey('profile'),
          profile: profile,
          onLogout: _handleLogout,
          isLoggingOut: _isLoggingOut,
        );
      case 0:
        return _ComingSoonContent(
          key: const ValueKey('coming-soon'),
          profile: profile,
          onNotificationsTap: _handleNotificationsTap,
          hasUnreadNotifications: _hasUnreadNotifications,
        );
      default:
        return _DashboardHomeContent(
          key: const ValueKey('home'),
          profile: profile,
          onModuleTap: _handleModuleTap,
          onNotificationsTap: _handleNotificationsTap,
          hasUnreadNotifications: _hasUnreadNotifications,
        );
    }
  }

  void _handleNavigationTap(int index) {
    if (index == _selectedIndex) {
      return;
    }

    setState(() {
      _selectedIndex = index;
    });
  }

  Future<void> _handleLogout() async {
    final confirmed = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Cerrar sesión'),
            content: const Text('¿Deseas cerrar tu sesión actual?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('Cancelar'),
              ),
              FilledButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: const Text('Cerrar sesión'),
              ),
            ],
          ),
        ) ??
        false;

    if (!confirmed || !mounted) {
      return;
    }

    setState(() {
      _isLoggingOut = true;
    });

    try {
      await _authService.clearSession();
      if (!mounted) return;
      Navigator.of(context).pushNamedAndRemoveUntil(
        AppRoutes.login,
        (route) => false,
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No se pudo cerrar sesión: $error')),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isLoggingOut = false;
        });
      }
    }
  }
}

class _DashboardHomeContent extends StatelessWidget {
  const _DashboardHomeContent({
    super.key,
    required this.profile,
    required this.onModuleTap,
    required this.onNotificationsTap,
    required this.hasUnreadNotifications,
  });

  final ResidentProfile profile;
  final void Function(String module) onModuleTap;
  final VoidCallback onNotificationsTap;
  final bool hasUnreadNotifications;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 28, 24, 0),
          child: _HeaderRow(
            profile: profile,
            onNotificationsTap: onNotificationsTap,
            hasUnreadNotifications: hasUnreadNotifications,
          ),
        ),
        const SizedBox(height: 24),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: _ModuleGrid(onModuleTap: onModuleTap),
          ),
        ),
        const SizedBox(height: 12),
      ],
    );
  }
}

class _ComingSoonContent extends StatelessWidget {
  const _ComingSoonContent({
    super.key,
    required this.profile,
    required this.onNotificationsTap,
    required this.hasUnreadNotifications,
  });

  final ResidentProfile profile;
  final VoidCallback onNotificationsTap;
  final bool hasUnreadNotifications;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 28, 24, 0),
          child: _HeaderRow(
            profile: profile,
            onNotificationsTap: onNotificationsTap,
            hasUnreadNotifications: hasUnreadNotifications,
          ),
        ),
        const SizedBox(height: 32),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: const [
                  Icon(
                    Icons.construction_outlined,
                    size: 64,
                    color: AppColors.secondaryText,
                  ),
                  SizedBox(height: 20),
                  Text(
                    'Este módulo estará disponible pronto.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primaryText,
                    ),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Mientras tanto puedes acceder a Finanzas y tus notificaciones desde aquí.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: AppColors.secondaryText,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
      ],
    );
  }
}

class _ProfileContent extends StatelessWidget {
  const _ProfileContent({
    super.key,
    required this.profile,
    required this.onLogout,
    required this.isLoggingOut,
  });

  final ResidentProfile profile;
  final VoidCallback onLogout;
  final bool isLoggingOut;

  @override
  Widget build(BuildContext context) {
    final fullName = profile.fullName.isEmpty ? 'Sin nombre registrado' : profile.fullName;
    final username = profile.username.isEmpty ? 'Sin usuario asignado' : profile.username;
    final vivienda = profile.codigoUnidad == null || profile.codigoUnidad!.isEmpty
        ? 'Sin vivienda asignada'
        : profile.codigoUnidad!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 28, 24, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Text(
                'Mi perfil',
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primaryText,
                ),
              ),
              SizedBox(height: 6),
              Text(
                'Consulta los datos asociados a tu cuenta.',
                style: TextStyle(
                  color: AppColors.secondaryText,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _ProfileInfoCard(
                  fullName: fullName,
                  username: username,
                  usuarioId: profile.usuarioId,
                  residenteId: profile.residenteId,
                  vivienda: vivienda,
                  displayCode: profile.displayCode,
                ),
                const SizedBox(height: 20),
                TextButton.icon(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Solicita el cambio de contraseña al administrador.'),
                        duration: Duration(seconds: 3),
                      ),
                    );
                  },
                  icon: const Icon(Icons.lock_reset_outlined),
                  label: const Text('Cambiar contraseña'),
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.primaryText,
                  ),
                ),
                const SizedBox(height: 28),
                FilledButton(
                  onPressed: isLoggingOut ? null : onLogout,
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.redAccent.shade400,
                    foregroundColor: Colors.white,
                    minimumSize: const Size.fromHeight(52),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: isLoggingOut
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.4,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : Row(
                          mainAxisSize: MainAxisSize.min,
                          children: const [
                            Icon(Icons.logout),
                            SizedBox(width: 10),
                            Text(
                              'Cerrar sesión',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _ProfileInfoCard extends StatelessWidget {
  const _ProfileInfoCard({
    required this.fullName,
    required this.username,
    required this.usuarioId,
    required this.residenteId,
    required this.vivienda,
    required this.displayCode,
  });

  final String fullName;
  final String username;
  final String usuarioId;
  final String residenteId;
  final String vivienda;
  final String displayCode;

  @override
  Widget build(BuildContext context) {
    final fields = [
      _ProfileFieldData(
        label: 'Nombre completo',
        value: fullName,
        icon: Icons.person_outline,
      ),
      _ProfileFieldData(
        label: 'Usuario',
        value: username,
        icon: Icons.badge_outlined,
      ),
      _ProfileFieldData(
        label: 'ID de usuario',
        value: usuarioId,
        icon: Icons.perm_identity,
      ),
      _ProfileFieldData(
        label: 'ID de residente',
        value: residenteId,
        icon: Icons.home_pin_outlined,
      ),
      _ProfileFieldData(
        label: 'Vivienda asignada',
        value: vivienda,
        icon: Icons.house_outlined,
      ),
      _ProfileFieldData(
        label: 'Código de acceso',
        value: displayCode == '--' ? 'No disponible' : displayCode,
        icon: Icons.vpn_key_outlined,
      ),
      _ProfileFieldData(
        label: 'Contraseña',
        value: '********',
        icon: Icons.lock_outline,
      ),
    ];

    return NeumorphicInset(
      borderRadius: BorderRadius.circular(28),
      padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 26),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var i = 0; i < fields.length; i++) ...[
            _ProfileField(field: fields[i]),
            if (i != fields.length - 1)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 14),
                child: Divider(
                  height: 1,
                  thickness: 0.6,
                  color: Color(0xFFE2E6EB),
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class _ProfileField extends StatelessWidget {
  const _ProfileField({required this.field});

  final _ProfileFieldData field;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(field.icon, size: 22, color: AppColors.secondaryText),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                field.label.toUpperCase(),
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.8,
                  color: AppColors.secondaryText,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                field.value,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primaryText,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ProfileFieldData {
  const _ProfileFieldData({
    required this.label,
    required this.value,
    required this.icon,
  });

  final String label;
  final String value;
  final IconData icon;
}

class _HeaderRow extends StatelessWidget {
  const _HeaderRow({
    required this.profile,
    required this.onNotificationsTap,
    required this.hasUnreadNotifications,
  });

  final ResidentProfile profile;
  final VoidCallback onNotificationsTap;
  final bool hasUnreadNotifications;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                profile.displayCode,
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primaryText,
                  letterSpacing: 0.6,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                profile.fullName.isEmpty ? 'Residente' : profile.fullName,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: AppColors.secondaryText,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 16),
        Stack(
          clipBehavior: Clip.none,
          children: [
            NeumorphicSurface(
              borderRadius: BorderRadius.circular(22),
              padding: EdgeInsets.zero,
              child: Material(
                color: Colors.transparent,
                borderRadius: BorderRadius.circular(22),
                child: InkWell(
                  borderRadius: BorderRadius.circular(22),
                  onTap: onNotificationsTap,
                  child: const SizedBox(
                    width: 48,
                    height: 48,
                    child: Icon(
                      Icons.notifications_none_outlined,
                      color: AppColors.primaryText,
                      size: 26,
                    ),
                  ),
                ),
              ),
            ),
            if (hasUnreadNotifications)
              Positioned(
                right: 6,
                top: 6,
                child: Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: Colors.redAccent.shade400,
                    shape: BoxShape.circle,
                    boxShadow: const [
                      BoxShadow(
                        color: Color.fromRGBO(220, 38, 38, 0.45),
                        blurRadius: 4,
                        offset: Offset(0, 1),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

class _ModuleGrid extends StatelessWidget {
  const _ModuleGrid({required this.onModuleTap});

  final void Function(String module) onModuleTap;

  static final List<_ModuleData> _modules = [
    _ModuleData(label: 'Finanzas', icon: Icons.attach_money_rounded),
    _ModuleData(label: 'Avisos', icon: Icons.mark_email_unread_outlined),
    _ModuleData(label: 'Reservas', icon: Icons.calendar_today_outlined),
    _ModuleData(label: 'Visitas', icon: Icons.meeting_room_outlined),
  ];

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final itemHeight = (constraints.maxHeight - 24) / 2;
        return Column(
          children: [
            Row(
              children: [
                Expanded(child: _ModuleCard(data: _modules[0], height: itemHeight, onTap: onModuleTap)),
                const SizedBox(width: 18),
                Expanded(child: _ModuleCard(data: _modules[1], height: itemHeight, onTap: onModuleTap)),
              ],
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                Expanded(child: _ModuleCard(data: _modules[2], height: itemHeight, onTap: onModuleTap)),
                const SizedBox(width: 18),
                Expanded(child: _ModuleCard(data: _modules[3], height: itemHeight, onTap: onModuleTap)),
              ],
            ),
          ],
        );
      },
    );
  }
}

class _ModuleCard extends StatelessWidget {
  const _ModuleCard({
    required this.data,
    required this.height,
    required this.onTap,
  });

  final _ModuleData data;
  final double height;
  final void Function(String module) onTap;

  @override
  Widget build(BuildContext context) {
    return NeumorphicSurface(
      borderRadius: BorderRadius.circular(26),
      padding: EdgeInsets.zero,
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(26),
        child: InkWell(
          borderRadius: BorderRadius.circular(26),
          onTap: () => onTap(data.label),
          child: SizedBox(
            height: height,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(data.icon, size: 40, color: AppColors.primaryText),
                const SizedBox(height: 12),
                Text(
                  data.label,
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
    );
  }
}

class _ModuleData {
  const _ModuleData({required this.label, required this.icon});

  final String label;
  final IconData icon;
}
