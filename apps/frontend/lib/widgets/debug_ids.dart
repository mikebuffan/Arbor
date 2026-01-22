import 'package:flutter/material.dart';

class DebugIdsBanner extends StatelessWidget {
  final bool isAuthed;
  final String? userId;
  final String? projectId;
  final String? conversationId;

  const DebugIdsBanner({
    super.key,
    required this.isAuthed,
    required this.userId,
    required this.projectId,
    required this.conversationId,
  });

  @override
  Widget build(BuildContext context) {
    if (!isAuthed || (userId?.isEmpty ?? true)) return const SizedBox.shrink();

    final t = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.only(top: 8.0),
      child: Text(
        'userId: ${userId ?? "(null)"}\n'
        'projectId: ${projectId ?? "(null)"}\n'
        'conversationId: ${conversationId ?? "(null)"}',
        style: t.bodySmall?.copyWith(color: Colors.white54),
      ),
    );
  }
}
