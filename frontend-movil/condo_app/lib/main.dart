import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';

import 'core/app_colors.dart';
import 'core/app_routes.dart';
import 'models/resident_profile.dart';
import 'screens/auth/forgot_password_page.dart';
import 'screens/auth/reset_password_page.dart';
import 'screens/dashboard_page.dart';
import 'screens/login_page.dart';
import 'services/push_notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await PushNotificationService.initialize();
  runApp(const CondoApp());
}

class CondoApp extends StatelessWidget {
  const CondoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Condo App',
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: AppColors.background,
        fontFamily: 'Roboto',
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.accent,
          brightness: Brightness.light,
        ),
        textTheme: const TextTheme(
          headlineMedium: TextStyle(fontSize: 28, letterSpacing: -0.5),
          titleLarge: TextStyle(fontSize: 22, letterSpacing: -0.2),
          bodyMedium: TextStyle(fontSize: 16),
        ),
      ),
      initialRoute: AppRoutes.login,
      onGenerateRoute: (settings) {
        switch (settings.name) {
          case AppRoutes.login:
            return MaterialPageRoute(builder: (_) => const LoginPage());
          case AppRoutes.forgotPassword:
            return MaterialPageRoute(builder: (_) => const ForgotPasswordPage());
          case AppRoutes.resetPassword:
            return MaterialPageRoute(
              builder: (_) => const ResetPasswordPage(),
              settings: settings,
            );
          case AppRoutes.dashboard:
            final args = settings.arguments;
            if (args is ResidentSession) {
              return MaterialPageRoute(
                builder: (_) => DashboardPage(session: args),
              );
            }
            return MaterialPageRoute(builder: (_) => const LoginPage());
          default:
            return MaterialPageRoute(builder: (_) => const LoginPage());
        }
      },
    );
  }
}
