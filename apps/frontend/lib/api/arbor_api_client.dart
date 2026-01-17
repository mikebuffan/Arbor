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

  Future<Map<String, dynamic>> post(
    String path, {
    required Map<String, dynamic> body,
  }) async {
    final session = Supabase.instance.client.auth.currentSession;
    final token = session?.accessToken;

    if (token == null) {
      throw Exception('Not authenticated');
    }

    final uri = Uri.parse('$baseUrl$path');

    final response = await _http.post(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(body),
    );

    final decoded = jsonDecode(response.body);

    if (response.statusCode >= 400) {
      throw ApiException(
        statusCode: response.statusCode,
        error: decoded is Map ? decoded['error'] : decoded,
      );
    }

    return decoded as Map<String, dynamic>;
  }
}

class ApiException implements Exception {
  ApiException({required this.statusCode, this.error});

  final int statusCode;
  final dynamic error;

  @override
  String toString() => 'ApiException($statusCode): $error';
}
