import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

class ArborApiClient {
  ArborApiClient({
    required this.baseUrl,
    http.Client? httpClient,
  }) : _http = httpClient ?? http.Client();

  final String baseUrl;
  final http.Client _http;

  Uri _uri(String path, [Map<String, String?> queryParameters = const {}]) {
    final normalizedBase = baseUrl.endsWith('/')
        ? baseUrl.substring(0, baseUrl.length - 1)
        : baseUrl;

    final uri = Uri.parse('$normalizedBase$path');
    final qp = <String, String>{};

    for (final entry in queryParameters.entries) {
      final value = entry.value;
      if (value != null && value.isNotEmpty) {
        qp[entry.key] = value;
      }
    }

    if (qp.isEmpty) return uri;
    return uri.replace(queryParameters: qp);
  }

  Map<String, String> _authHeaders({bool json = true}) {
    final session = Supabase.instance.client.auth.currentSession;
    final token = session?.accessToken;

    if (token == null) {
      throw Exception('Not authenticated');
    }

    return {
      if (json) 'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  dynamic _decodeBody(http.Response response) {
    if (response.body.trim().isEmpty) return null;
    return jsonDecode(response.body);
  }

  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, String?> queryParameters = const {},
  }) async {
    final response = await _http.get(
      _uri(path, queryParameters),
      headers: _authHeaders(json: false),
    );

    if (response.statusCode == 204) {
      return <String, dynamic>{};
    }

    final decoded = _decodeBody(response);

    if (response.statusCode >= 400) {
      throw ApiException(
        statusCode: response.statusCode,
        error: decoded is Map ? decoded['error'] : decoded,
      );
    }

    if (decoded == null) return <String, dynamic>{};
    if (decoded is Map<String, dynamic>) return decoded;

    throw ApiException(
      statusCode: response.statusCode,
      error: 'Expected JSON object but received ${decoded.runtimeType}',
    );
  }

  Future<Map<String, dynamic>> post(
    String path, {
    required Map<String, dynamic> body,
  }) async {
    final response = await _http.post(
      _uri(path),
      headers: _authHeaders(),
      body: jsonEncode(body),
    );

    final decoded = _decodeBody(response);

    if (response.statusCode >= 400) {
      throw ApiException(
        statusCode: response.statusCode,
        error: decoded is Map ? decoded['error'] : decoded,
      );
    }

    if (decoded is Map<String, dynamic>) return decoded;

    throw ApiException(
      statusCode: response.statusCode,
      error: 'Expected JSON object but received ${decoded.runtimeType}',
    );
  }
}

class ApiException implements Exception {
  ApiException({required this.statusCode, this.error});

  final int statusCode;
  final dynamic error;

  @override
  String toString() => 'ApiException($statusCode): $error';
}
