import 'package:flutter/material.dart';

import 'core/app_colors.dart';
import 'screens/login_page.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
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
      home: const LoginPage(),
    );
  }
}
