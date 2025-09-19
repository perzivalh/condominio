/// Base URL del backend. Usa `--dart-define=API_BASE_URL=...` para sobreescribirla.
const String apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://192.168.0.12:8000/api/',
);

const String accessTokenKey = 'access';
const String refreshTokenKey = 'refresh';
