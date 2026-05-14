import 'arbor_api_client.dart';

class AttachmentApi {
  AttachmentApi(this._client);

  final ArborApiClient _client;

  Future<AttachmentIntent> createIntent({
    String? projectId,
    String? conversationId,
    required String originalFilename,
    required String mimeType,
    required int sizeBytes,
  }) async {
    final body = <String, dynamic>{
      'originalFilename': originalFilename,
      'mimeType': mimeType,
      'sizeBytes': sizeBytes,
    };

    if (projectId != null) body['projectId'] = projectId;
    if (conversationId != null) body['conversationId'] = conversationId;

    final json = await _client.post('/api/chat/attachments/intent', body: body);
    return AttachmentIntent.fromJson(json);
  }

  Future<void> complete({required String attachmentId}) async {
    await _client.post(
      '/api/chat/attachments/complete',
      body: {'attachmentId': attachmentId},
    );
  }

  Future<void> delete({required String attachmentId, String? reason}) async {
    await _client.post(
      '/api/chat/attachments/delete',
      body: {
        'attachmentId': attachmentId,
        if (reason != null) 'reason': reason,
      },
    );
  }
}

class AttachmentIntent {
  AttachmentIntent({
    required this.attachmentId,
    required this.projectId,
    required this.conversationId,
    required this.bucket,
    required this.storagePath,
    required this.expiresAt,
  });

  final String attachmentId;
  final String projectId;
  final String conversationId;
  final String bucket;
  final String storagePath;
  final DateTime expiresAt;

  factory AttachmentIntent.fromJson(Map<String, dynamic> json) {
    final attachmentId = json['attachmentId'];
    final projectId = json['projectId'];
    final conversationId = json['conversationId'];
    final bucket = json['bucket'];
    final storagePath = json['storagePath'];
    final expiresAt = json['expiresAt'];

    if (attachmentId is! String || attachmentId.isEmpty) {
      throw Exception('Invalid attachmentId in upload intent');
    }
    if (projectId is! String || projectId.isEmpty) {
      throw Exception('Invalid projectId in upload intent');
    }
    if (conversationId is! String || conversationId.isEmpty) {
      throw Exception('Invalid conversationId in upload intent');
    }
    if (bucket is! String || bucket.isEmpty) {
      throw Exception('Invalid bucket in upload intent');
    }
    if (storagePath is! String || storagePath.isEmpty) {
      throw Exception('Invalid storagePath in upload intent');
    }
    if (expiresAt is! String || expiresAt.isEmpty) {
      throw Exception('Invalid expiresAt in upload intent');
    }

    return AttachmentIntent(
      attachmentId: attachmentId,
      projectId: projectId,
      conversationId: conversationId,
      bucket: bucket,
      storagePath: storagePath,
      expiresAt: DateTime.parse(expiresAt),
    );
  }
}
