import 'package:flutter/material.dart';

import '../core/app_colors.dart';
import '../models/resident_profile.dart';
import '../widgets/neumorphic.dart';
import '../widgets/resident_bottom_nav.dart';
import 'finance/finanzas_page.dart';

class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key, required this.session});

  final ResidentSession session;

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  int _selectedIndex = 1;

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
  Widget build(BuildContext context) {
    final profile = widget.session.profile;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 28, 24, 0),
              child: _HeaderRow(profile: profile),
            ),
            const SizedBox(height: 24),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: _ModuleGrid(onModuleTap: _handleModuleTap),
              ),
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
      bottomNavigationBar: ResidentBottomNavBar(
        selectedIndex: _selectedIndex,
        onChanged: (index) {
          setState(() {
            _selectedIndex = index;
          });
        },
      ),
    );
  }
}

class _HeaderRow extends StatelessWidget {
  const _HeaderRow({required this.profile});

  final ResidentProfile profile;

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
        NeumorphicSurface(
          borderRadius: BorderRadius.circular(22),
          padding: const EdgeInsets.all(14),
          child: const Icon(
            Icons.notifications_none_outlined,
            color: AppColors.primaryText,
            size: 26,
          ),
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
