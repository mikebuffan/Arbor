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

  Future<Map<String, String>> _authHeaders({
    bool json = true,
  }) async {
    final session = Supabase.instance.client.auth.currentSession;
    final token = session?.accessToken;

    if (token == null) {
      throw Exception('Not authenticated');
    }

    return <String, String>{
      if (json) 'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  Future<Map<String, dynamic>> post(
    String path, {
    required Map<String, dynamic> body,
  }) async {
    final uri = Uri.parse('$baseUrl$path');

    final response = await _http.post(
      uri,
      headers: await _authHeaders(),
      body: jsonEncode(body),
    );

    dynamic decoded;

    try {
      decoded = jsonDecode(response.body);
    } catch (_) {
      decoded = response.body;
    }

    if (response.statusCode >= 400) {
      throw ApiException(
        statusCode: response.statusCode,
        error: decoded is Map ? decoded['error'] : decoded,
      );
    }

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
    final uri = Uri.parse('$baseUrl$path');

    final response = await _http.post(
      uri,
      headers: await _authHeaders(),
      body: jsonEncode(body),
    );

    if (response.statusCode >= 400) {
      dynamic error;

      try {
        final decoded = jsonDecode(response.body);
        error = decoded is Map ? decoded['error'] : decoded;
      } catch (_) {
        error = response.body;
      }

      throw ApiException(
        statusCode: response.statusCode,
        error: error,
      );
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
    final uri = Uri.parse('$baseUrl$path');

    final response = await _http.post(
      uri,
      headers: await _authHeaders(),
      body: jsonEncode(body),
    );

    if (response.statusCode >= 400) {
      dynamic error;

      try {
        final decoded = jsonDecode(response.body);
        error = decoded is Map ? decoded['error'] : decoded;
      } catch (_) {
        error = response.body;
      }

      throw ApiException(
        statusCode: response.statusCode,
        error: error,
      );
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
