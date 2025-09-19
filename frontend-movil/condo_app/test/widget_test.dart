import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:condo_app/main.dart';

void main() {
  testWidgets('Login screen renders', (tester) async {
    await tester.pumpWidget(const CondoApp());

    expect(find.text('Bienvenido'), findsOneWidget);
    expect(find.text('Olvidaste tu contrasena?'), findsOneWidget);
    expect(find.byType(TextFormField), findsNWidgets(2));
  });
}
