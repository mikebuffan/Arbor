import 'dart:convert';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:http/http.dart' as http;

class ChatResponse {
  final String projectId;
  final String conversationId;
  final String assistantText;

  ChatResponse({
    required this.projectId,
    required this.conversationId,
    required this.assistantText,
  });

  factory ChatResponse.fromJson(Map<String, dynamic> json) {
    final pid = json['projectId'];
    final cid = json['conversationId'];
    final text = json['assistantText'];

    if (pid is! String || pid.isEmpty) throw Exception('Invalid projectId in response');
    if (cid is! String || cid.isEmpty) throw Exception('Invalid conversationId in response');
    if (text is! String) throw Exception('Invalid assistantText in response');

    return ChatResponse(projectId: pid, conversationId: cid, assistantText: text);
  }
}

class ArborApi {
  static const String baseUrl = String.fromEnvironment(
    'ARBOR_API_URL',
    defaultValue: 'http://localhost:3000',
  );

  static Future<String?> getLastConversationId({required String projectId}) async {
    final supa = Supabase.instance.client;
    final token = supa.auth.currentSession?.accessToken;
    if (token == null) throw Exception("Not authed");

    final uri = Uri.parse("$baseUrl/api/conversations/last?projectId=$projectId");

    final resp = await http.get(
      uri,
      headers: {
        "authorization": "Bearer $token",
      },
    );

    if (resp.statusCode == 204) return null; // no conversations yet
    if (resp.statusCode < 200 || resp.statusCode >= 300) {
      throw Exception("getLastConversationId failed: ${resp.statusCode} ${resp.body}");
    }

    final json = jsonDecode(resp.body) as Map<String, dynamic>;
    final id = json["conversationId"];
    return id is String && id.isNotEmpty ? id : null;
  }

  static Future<ChatResponse> sendMessage({
    required String userText,
    String? projectId,
    String? conversationId,
  }) async {
    final supa = Supabase.instance.client;
    final token = supa.auth.currentSession?.accessToken;
    if (token == null) throw Exception("Not authed");

    final uri = Uri.parse("$baseUrl/api/chat");

    final body = <String, dynamic>{
      "userText": userText,
      "projectId": projectId,
      "conversationId": conversationId,
    }..removeWhere((k, v) => v == null);

    final resp = await http.post(
      uri,
      headers: {
        "authorization": "Bearer $token",
        "content-type": "application/json",
      },
      body: jsonEncode(body),
    );

    if (resp.statusCode < 200 || resp.statusCode >= 300) {
      throw Exception("sendMessage failed: ${resp.statusCode} ${resp.body}");
    }

    final json = jsonDecode(resp.body) as Map<String, dynamic>;
    return ChatResponse.fromJson(json);
  }
}
