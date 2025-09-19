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
        borderRadius: borderRadius,
        color: AppColors.surface,
        boxShadow: const [
          BoxShadow(
            color: AppColors.shadowDark,
            offset: Offset(4, 4),
            blurRadius: 12,
            spreadRadius: -6,
          ),
          BoxShadow(
            color: AppColors.shadowLight,
            offset: Offset(-4, -4),
            blurRadius: 12,
            spreadRadius: -6,
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: borderRadius,
        child: Stack(
          children: [
            Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    AppColors.surfaceDark,
                    AppColors.surface,
                    AppColors.surfaceLight,
                  ],
                  stops: [0.0, 0.5, 1.0],
                ),
              ),
            ),
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      AppColors.shadowLight.withValues(alpha: 0.35),
                      Colors.transparent,
                      AppColors.shadowDark.withValues(alpha: 0.25),
                    ],
                    stops: const [0.0, 0.55, 1.0],
                  ),
                ),
              ),
            ),
            Padding(
              padding: padding,
              child: child,
            ),
          ],
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

