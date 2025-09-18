class TokenPair {
  TokenPair({required this.access, required this.refresh});

  final String access;
  final String refresh;
}

class ResidentProfile {
  ResidentProfile({
    required this.usuarioId,
    required this.username,
    required this.residenteId,
    required this.firstName,
    required this.lastName,
    required this.codigoUnidad,
  });

  final String usuarioId;
  final String username;
  final String residenteId;
  final String firstName;
  final String lastName;
  final String? codigoUnidad;

  String get fullName => '$firstName $lastName'.trim();
  String get displayCode => codigoUnidad ?? '--';
}

class ResidentSession {
  ResidentSession({required this.tokens, required this.profile});

  final TokenPair tokens;
  final ResidentProfile profile;
}

class AuthException implements Exception {
  AuthException(this.message);

  final String message;

  @override
  String toString() => message;
}
