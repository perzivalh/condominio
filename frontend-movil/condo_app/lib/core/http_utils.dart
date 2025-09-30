import 'app_constants.dart';

String _ensureTrailingSlash(String value) => value.endsWith('/') ? value : '$value/';

String apiBaseUrlNormalized() {
  return _ensureTrailingSlash(apiBaseUrl);
}

Uri apiUri(String path) {
  final normalized = apiBaseUrlNormalized();
  final sanitizedPath = path.startsWith('/') ? path.substring(1) : path;
  return Uri.parse('$normalized$sanitizedPath');
}

String apiOrigin() {
  final uri = Uri.parse(apiBaseUrlNormalized());
  return '${uri.scheme}://${uri.authority}';
}

String rewriteBackendUrl(String? url) {
  if (url == null || url.isEmpty) {
    return '';
  }
  final parsed = Uri.tryParse(url);
  if (parsed == null || parsed.host.isEmpty) {
    return url;
  }
  final normalizedBase = Uri.parse(apiBaseUrlNormalized());
  final sameHost = parsed.host == normalizedBase.host &&
      (parsed.hasPort ? parsed.port : null) == (normalizedBase.hasPort ? normalizedBase.port : null);
  if (sameHost) {
    return url;
  }
  const fallbackHosts = {'localhost', '127.0.0.1', '0.0.0.0', '192.168.0.15'};
  if (!fallbackHosts.contains(parsed.host)) {
    return url;
  }
  final updated = parsed.replace(
    scheme: normalizedBase.scheme,
    host: normalizedBase.host,
    port: normalizedBase.hasPort ? normalizedBase.port : null,
  );
  return updated.toString();
}
