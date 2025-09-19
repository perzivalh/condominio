/// Base URL del backend. Usa `--dart-define=API_BASE_URL=...` para sobreescribirla.
const String apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:8000/api/',
);

const String accessTokenKey = 'access';
const String refreshTokenKey = 'refresh';
