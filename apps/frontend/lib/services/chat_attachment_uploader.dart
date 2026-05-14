import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:frontend/api/attachment_api.dart';

const int kMaxAttachmentBytes = 10 * 1024 * 1024;

const Map<String, String> _mimeByExtension = {
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'webp': 'image/webp',
  'pdf': 'application/pdf',
  'txt': 'text/plain',
  'md': 'text/markdown',
};

enum ChatAttachmentKind {
  image,
  file,
}

class UploadedChatAttachment {
  const UploadedChatAttachment({
    required this.attachmentId,
    required this.projectId,
    required this.conversationId,
    required this.bucket,
    required this.storagePath,
    required this.filename,
    required this.mimeType,
    required this.sizeBytes,
    required this.kind,
  });

  final String attachmentId;
  final String projectId;
  final String conversationId;
  final String bucket;
  final String storagePath;
  final String filename;
  final String mimeType;
  final int sizeBytes;
  final ChatAttachmentKind kind;

  String get kindLabel {
    switch (kind) {
      case ChatAttachmentKind.image:
        return 'Image';
      case ChatAttachmentKind.file:
        return 'File';
    }
  }
}

class ChatAttachmentUploader {
  ChatAttachmentUploader({
    required AttachmentApi api,
    required SupabaseClient supabase,
  })  : _api = api,
        _supabase = supabase;

  final AttachmentApi _api;
  final SupabaseClient _supabase;

  Future<UploadedChatAttachment?> pickAndUpload({
    required ChatAttachmentKind kind,
    String? projectId,
    String? conversationId,
  }) async {
    final result = await FilePicker.pickFiles(
      type: FileType.custom,
      allowMultiple: false,
      withData: true,
      allowedExtensions: kind == ChatAttachmentKind.image
          ? const ['jpg', 'jpeg', 'png', 'webp']
          : const ['pdf', 'txt', 'md'],
    );

    if (result == null || result.files.isEmpty) return null;

    final file = result.files.single;
    final bytes = file.bytes;

    if (bytes == null || bytes.isEmpty) {
      throw Exception('Could not read selected file bytes.');
    }

    if (bytes.length > kMaxAttachmentBytes) {
      throw Exception('Attachment exceeds 10 MB limit.');
    }

    final extension =
        (file.extension ?? _extensionFromName(file.name)).toLowerCase();
    final mimeType = _mimeByExtension[extension];

    if (mimeType == null) {
      throw Exception('Unsupported attachment type .$extension');
    }

    final resolvedKind = mimeType.startsWith('image/')
        ? ChatAttachmentKind.image
        : ChatAttachmentKind.file;

    if (kind == ChatAttachmentKind.image &&
        resolvedKind != ChatAttachmentKind.image) {
      throw Exception('Selected file is not an allowed image type.');
    }

    final intent = await _api.createIntent(
      projectId: projectId,
      conversationId: conversationId,
      originalFilename: file.name,
      mimeType: mimeType,
      sizeBytes: bytes.length,
    );

    await _uploadBytes(
      bucket: intent.bucket,
      storagePath: intent.storagePath,
      bytes: bytes,
      mimeType: mimeType,
    );

    await _api.complete(attachmentId: intent.attachmentId);

    return UploadedChatAttachment(
      attachmentId: intent.attachmentId,
      projectId: intent.projectId,
      conversationId: intent.conversationId,
      bucket: intent.bucket,
      storagePath: intent.storagePath,
      filename: file.name,
      mimeType: mimeType,
      sizeBytes: bytes.length,
      kind: resolvedKind,
    );
  }

  Future<void> _uploadBytes({
    required String bucket,
    required String storagePath,
    required Uint8List bytes,
    required String mimeType,
  }) async {
    await _supabase.storage.from(bucket).uploadBinary(
          storagePath,
          bytes,
          fileOptions: FileOptions(
            contentType: mimeType,
            upsert: false,
          ),
        );
  }

  String _extensionFromName(String name) {
    final index = name.lastIndexOf('.');
    if (index < 0 || index == name.length - 1) return '';
    return name.substring(index + 1);
  }
}
