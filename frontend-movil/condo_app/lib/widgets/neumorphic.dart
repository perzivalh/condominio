import 'package:flutter/material.dart';

import '../core/app_colors.dart';

class NeumorphicSurface extends StatelessWidget {
  const NeumorphicSurface({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.borderRadius = const BorderRadius.all(Radius.circular(28)),
    this.color,
  });

  final Widget child;
  final EdgeInsets padding;
  final BorderRadius borderRadius;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final surfaceColor = color ?? AppColors.surface;
    return Container(
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: borderRadius,
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.surfaceLight, AppColors.surfaceDark],
        ),
        boxShadow: const [
          BoxShadow(
            color: AppColors.shadowLight,
            offset: Offset(-8, -8),
            blurRadius: 16,
          ),
          BoxShadow(
            color: AppColors.shadowDark,
            offset: Offset(10, 10),
            blurRadius: 20,
          ),
        ],
      ),
      child: Padding(
        padding: padding,
        child: child,
      ),
    );
  }
}

class NeumorphicInset extends StatelessWidget {
  const NeumorphicInset({
    super.key,
    required this.child,
    this.borderRadius = const BorderRadius.all(Radius.circular(22)),
    this.padding = const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
  });

  final Widget child;
  final BorderRadius borderRadius;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: borderRadius,
        boxShadow: const [
          BoxShadow(
            color: AppColors.shadowDark,
            offset: Offset(6, 6),
            blurRadius: 14,
            spreadRadius: 1,
          ),
          BoxShadow(
            color: AppColors.shadowLight,
            offset: Offset(-6, -6),
            blurRadius: 14,
            spreadRadius: 1,
          ),
        ],
      ),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: borderRadius,
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [AppColors.surfaceDark, AppColors.surfaceLight],
          ),
        ),
        child: Padding(
          padding: padding,
          child: child,
        ),
      ),
    );
  }
}

class NeumorphicIconButton extends StatelessWidget {
  const NeumorphicIconButton({
    super.key,
    required this.icon,
    this.onTap,
    this.size = 48,
  });

  final IconData icon;
  final VoidCallback? onTap;
  final double size;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: NeumorphicSurface(
        borderRadius: BorderRadius.circular(size / 2),
        padding: EdgeInsets.all(size * 0.3),
        child: Icon(icon, size: size * 0.5, color: AppColors.primaryText),
      ),
    );
  }
}
