import 'package:flutter/material.dart';

import '../core/app_colors.dart';
import '../core/app_routes.dart';
import '../models/resident_profile.dart';
import '../services/auth_service.dart';
import '../widgets/neumorphic.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _userController = TextEditingController();
  final _passwordController = TextEditingController();
  final _authService = AuthService();

  bool _obscurePassword = true;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _userController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    final form = _formKey.currentState;
    if (form == null || !form.validate()) {
      return;
    }

    FocusScope.of(context).unfocus();
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final session = await _authService.loginResident(
        _userController.text.trim(),
        _passwordController.text,
      );
      if (!mounted) return;
      _goToDashboard(session);
    } on AuthException catch (error) {
      setState(() {
        _errorMessage = error.message;
      });
    } catch (_) {
      setState(() {
        _errorMessage = 'No se pudo iniciar sesion. Intenta nuevamente.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _goToDashboard(ResidentSession session) {
    Navigator.of(context).pushReplacementNamed(
      AppRoutes.dashboard,
      arguments: session,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 32),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Bienvenido',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        color: AppColors.primaryText,
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  'a Colinas del Urubo I',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.secondaryText,
                        fontWeight: FontWeight.w500,
                      ),
                ),
                const SizedBox(height: 36),
                Text(
                  'Iniciar sesion',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: AppColors.primaryText,
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 28),
                _buildLabel('Usuario'),
                const SizedBox(height: 10),
                NeumorphicInset(
                  child: TextFormField(
                    controller: _userController,
                    decoration: const InputDecoration(
                      border: InputBorder.none,
                      hintText: 'Ingresa tu usuario',
                    ),
                    cursorColor: AppColors.accent,
                    style: const TextStyle(
                      color: AppColors.primaryText,
                      fontWeight: FontWeight.w500,
                    ),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'El usuario es obligatorio.';
                      }
                      return null;
                    },
                  ),
                ),
                const SizedBox(height: 24),
                _buildLabel('Contrasena'),
                const SizedBox(height: 10),
                NeumorphicInset(
                  child: Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _passwordController,
                          obscureText: _obscurePassword,
                          decoration: const InputDecoration(
                            border: InputBorder.none,
                            hintText: 'Ingresa tu contrasena',
                          ),
                          cursorColor: AppColors.accent,
                          style: const TextStyle(
                            color: AppColors.primaryText,
                            fontWeight: FontWeight.w500,
                          ),
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'La contrasena es obligatoria.';
                            }
                            return null;
                          },
                        ),
                      ),
                      const SizedBox(width: 12),
                      GestureDetector(
                        onTap: () {
                          setState(() {
                            _obscurePassword = !_obscurePassword;
                          });
                        },
                        child: Icon(
                          _obscurePassword
                              ? Icons.visibility_off_outlined
                              : Icons.visibility_outlined,
                          color: AppColors.secondaryText,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () {
                      Navigator.of(context).pushNamed(AppRoutes.forgotPassword);
                    },
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.secondaryText,
                      padding: EdgeInsets.zero,
                      textStyle: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    child: const Text('Olvidaste tu contrasena?'),
                  ),
                ),
                const SizedBox(height: 16),
                NeumorphicSurface(
                  borderRadius: BorderRadius.circular(24),
                  padding: EdgeInsets.zero,
                  child: Material(
                    color: Colors.transparent,
                    borderRadius: BorderRadius.circular(24),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(24),
                      onTap: _isLoading ? null : _handleLogin,
                      child: SizedBox(
                        height: 56,
                        child: Center(
                          child: _isLoading
                              ? const SizedBox(
                                  width: 26,
                                  height: 26,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2.6,
                                    valueColor: AlwaysStoppedAnimation(
                                      AppColors.primaryText,
                                    ),
                                  ),
                                )
                              : const Text(
                                  'Iniciar sesion',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 18,
                                    color: AppColors.primaryText,
                                  ),
                                ),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 250),
                  child: _errorMessage == null
                      ? const SizedBox.shrink()
                      : Text(
                          _errorMessage!,
                          key: ValueKey(_errorMessage),
                          style: const TextStyle(
                            color: Colors.redAccent,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Text(
      text,
      style: const TextStyle(
        color: AppColors.primaryText,
        fontWeight: FontWeight.w600,
        fontSize: 14,
      ),
    );
  }
}
