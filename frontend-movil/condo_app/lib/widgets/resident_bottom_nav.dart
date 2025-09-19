import 'package:flutter/material.dart';

import '../core/app_colors.dart';

class ResidentBottomNavBar extends StatelessWidget {
  const ResidentBottomNavBar({
    super.key,
    required this.selectedIndex,
    required this.onChanged,
  });

  final int selectedIndex;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        boxShadow: [
          BoxShadow(
            color: AppColors.shadowDark,
            offset: Offset(0, -6),
            blurRadius: 16,
            spreadRadius: 2,
          ),
          BoxShadow(
            color: AppColors.shadowLight,
            offset: Offset(0, -1),
            blurRadius: 6,
          ),
        ],
      ),
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 32),
      child: SafeArea(
        top: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _NavItem(
              icon: Icons.directions_car_filled_outlined,
              index: 0,
              selectedIndex: selectedIndex,
              onChanged: onChanged,
            ),
            _NavItem(
              icon: Icons.home_outlined,
              index: 1,
              selectedIndex: selectedIndex,
              onChanged: onChanged,
            ),
            _NavItem(
              icon: Icons.person_outline,
              index: 2,
              selectedIndex: selectedIndex,
              onChanged: onChanged,
            ),
          ],
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.index,
    required this.selectedIndex,
    required this.onChanged,
  });

  final IconData icon;
  final int index;
  final int selectedIndex;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final bool isSelected = index == selectedIndex;
    return GestureDetector(
      onTap: () => onChanged(index),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: isSelected ? Colors.white.withValues(alpha: 0.7) : Colors.transparent,
          shape: BoxShape.circle,
        ),
        child: Icon(
          icon,
          size: 28,
          color: isSelected ? AppColors.primaryText : AppColors.secondaryText,
        ),
      ),
    );
  }
}

