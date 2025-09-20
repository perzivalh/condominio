/// Base URL del backend. Usa `--dart-define=API_BASE_URL=...` para sobreescribirla.
const String apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://condominio-production.up.railway.app/api/',
);

const String accessTokenKey = 'access';
const String refreshTokenKey = 'refresh';
