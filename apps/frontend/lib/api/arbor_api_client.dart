import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

class ArborApiClient {
  ArborApiClient({
    required this.baseUrl,
    http.Client? httpClient,
  }) : _http = httpClient ?? http.Client();

  final String baseUrl;
  final http.Client _http;

  Uri _uri(
    String path, {
    Map<String, String>? queryParameters,
  }) {
    final root = baseUrl.endsWith('/')
        ? baseUrl.substring(0, baseUrl.length - 1)
        : baseUrl;
    final normalizedPath = path.startsWith('/') ? path : '/$path';

    return Uri.parse('$root$normalizedPath').replace(
      queryParameters: queryParameters,
    );
  }

  Future<Map<String, String>> _authHeaders({
    bool json = true,
  }) async {
    final token =
        Supabase.instance.client.auth.currentSession?.accessToken;

    if (token == null) {
      throw Exception('Not authenticated');
    }

    return <String, String>{
      if (json) 'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  dynamic _decode(String body) {
    if (body.trim().isEmpty) return null;

    try {
      return jsonDecode(body);
    } catch (_) {
      return body;
    }
  }

  void _requireSuccess(
    int statusCode,
    dynamic decoded,
  ) {
    if (statusCode >= 200 && statusCode < 300) return;

    throw ApiException(
      statusCode: statusCode,
      error: decoded is Map ? decoded['error'] ?? decoded : decoded,
    );
  }

  Future<Map<String, dynamic>?> get(
    String path, {
    Map<String, String>? queryParameters,
  }) async {
    final response = await _http.get(
      _uri(path, queryParameters: queryParameters),
      headers: await _authHeaders(json: false),
    );

    if (response.statusCode == 204) return null;

    final decoded = _decode(response.body);
    _requireSuccess(response.statusCode, decoded);

    if (decoded is! Map<String, dynamic>) {
      throw ApiException(
        statusCode: response.statusCode,
        error: 'Expected JSON object response',
      );
    }

    return decoded;
  }

  Future<Map<String, dynamic>> post(
    String path, {
    required Map<String, dynamic> body,
  }) async {
    final response = await _http.post(
      _uri(path),
      headers: await _authHeaders(),
      body: jsonEncode(body),
    );

    final decoded = _decode(response.body);
    _requireSuccess(response.statusCode, decoded);

    if (decoded is! Map<String, dynamic>) {
      throw ApiException(
        statusCode: response.statusCode,
        error: 'Expected JSON object response',
      );
    }

    return decoded;
  }

  Future<BinaryApiResponse> postBytes(
    String path, {
    required Map<String, dynamic> body,
  }) async {
    final response = await _http.post(
      _uri(path),
      headers: await _authHeaders(),
      body: jsonEncode(body),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final decoded = _decode(response.body);
      _requireSuccess(response.statusCode, decoded);
    }

    return BinaryApiResponse(
      bytes: response.bodyBytes,
      contentType: response.headers['content-type'],
      headers: response.headers,
    );
  }

  Future<TextApiResponse> postText(
    String path, {
    required Map<String, dynamic> body,
  }) async {
    final response = await _http.post(
      _uri(path),
      headers: await _authHeaders(),
      body: jsonEncode(body),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final decoded = _decode(response.body);
      _requireSuccess(response.statusCode, decoded);
    }

    return TextApiResponse(
      text: response.body,
      contentType: response.headers['content-type'],
      headers: response.headers,
    );
  }

  void close() {
    _http.close();
  }
}

class BinaryApiResponse {
  const BinaryApiResponse({
    required this.bytes,
    required this.contentType,
    required this.headers,
  });

  final Uint8List bytes;
  final String? contentType;
  final Map<String, String> headers;
}

class TextApiResponse {
  const TextApiResponse({
    required this.text,
    required this.contentType,
    required this.headers,
  });

  final String text;
  final String? contentType;
  final Map<String, String> headers;
}

class ApiException implements Exception {
  ApiException({
    required this.statusCode,
    this.error,
  });

  final int statusCode;
  final dynamic error;

  @override
  String toString() => 'ApiException($statusCode): $error';
}
