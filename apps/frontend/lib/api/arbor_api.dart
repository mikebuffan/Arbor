import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import 'arbor_api_client.dart';
import 'chat_api.dart' as canonical;

class ArborApi {
  static const String baseUrl = String.fromEnvironment(
    'ARBOR_API_URL',
    defaultValue: 'http://localhost:3000',
  );

  static final ArborApiClient _client =
      ArborApiClient(baseUrl: baseUrl);

  static final canonical.ChatApi _chat =
      canonical.ChatApi(_client);

  static Future<String?> getLastConversationId({
    required String projectId,
  }) async {
    final supa = Supabase.instance.client;
    final token = supa.auth.currentSession?.accessToken;

    if (token == null) {
      throw Exception('Not authed');
    }

    final uri = Uri.parse(
      '$baseUrl/api/conversations/last?projectId=$projectId',
    );

    final resp = await http.get(
      uri,
      headers: {
        'authorization': 'Bearer $token',
      },
    );

    if (resp.statusCode == 204) return null;

    if (resp.statusCode < 200 || resp.statusCode >= 300) {
      throw Exception(
        'getLastConversationId failed: '
        '${resp.statusCode} ${resp.body}',
      );
    }

    final json =
        jsonDecode(resp.body) as Map<String, dynamic>;

    final id = json['conversationId'];

    return id is String && id.isNotEmpty
        ? id
        : null;
  }

  static Future<canonical.ChatResponse> sendMessage({
    required String userText,
    String? projectId,
    String? conversationId,
    String? turnId,
  }) {
    return _chat.sendMessage(
      projectId: projectId,
      conversationId: conversationId,
      turnId: turnId,
      userText: userText,
    );
  }
}
