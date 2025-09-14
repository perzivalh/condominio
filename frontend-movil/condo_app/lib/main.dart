import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CondoApp Login',
      theme: ThemeData(primarySwatch: Colors.blue),
      home: const LoginPage(),
    );
  }
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});
  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final TextEditingController _userController = TextEditingController();
  final TextEditingController _passController = TextEditingController();
  final storage = const FlutterSecureStorage();
  String _msg = "";

  Future<void> login() async {
    // OJO: en emulador Android se usa 10.0.2.2 para apuntar al localhost de tu PC
    final url = Uri.parse("http://192.168.0.13:8000/api/token/");
    final response = await http.post(
      url,
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({
        "username": _userController.text,
        "password": _passController.text,
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      await storage.write(key: "access", value: data["access"]);
      await storage.write(key: "refresh", value: data["refresh"]);
      setState(() {
        _msg = "✅ Login correcto";
      });
    } else {
      setState(() {
        _msg = "❌ Credenciales inválidas";
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Login Condo")),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(
              controller: _userController,
              decoration: const InputDecoration(labelText: "Usuario"),
            ),
            TextField(
              controller: _passController,
              decoration: const InputDecoration(labelText: "Contraseña"),
              obscureText: true,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: login,
              child: const Text("Ingresar"),
            ),
            const SizedBox(height: 12),
            Text(_msg),
          ],
        ),
      ),
    );
  }
}
