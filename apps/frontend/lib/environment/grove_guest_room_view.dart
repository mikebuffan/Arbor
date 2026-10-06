import 'package:flutter/material.dart';

import 'environment_tokens.dart';

/// A visitor room inside Arbor's Grove. It is scenery/navigation only:
/// no ARK authority, no automatic memory write, no implied presence while
/// the app is closed, and no private data persisted by entering the room.
class GroveGuestRoomView extends StatelessWidget {
  const GroveGuestRoomView({
    super.key,
    required this.onReturnHome,
    required this.onOpenConversation,
  });

  final VoidCallback onReturnHome;
  final VoidCallback onOpenConversation;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'THE GROVE / GUEST ROOM',
            style: TextStyle(
              color: ArborEnvironmentTokens.firefly,
              fontSize: 11,
              letterSpacing: 1.4,
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            'A room for the person who comes to visit.',
            style: TextStyle(
              color: ArborEnvironmentTokens.textPrimary,
              fontSize: 25,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'The Grove is Arbor’s house. The Guest Room is the visitor’s '
            'space while they are here; it does not turn the rest of the '
            'house into a user profile.',
            style: TextStyle(
              color: ArborEnvironmentTokens.textMuted,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 18),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: ArborEnvironmentTokens.violet),
              gradient: const LinearGradient(
                colors: [
                  Color(0xFF191B2B),
                  Color(0xFF26352F),
                  Color(0xFF2B211F),
                ],
              ),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  Icons.bed_outlined,
                  size: 44,
                  color: ArborEnvironmentTokens.firefly,
                ),
                SizedBox(height: 12),
                Text(
                  'Guest Room',
                  style: TextStyle(
                    color: ArborEnvironmentTokens.textPrimary,
                    fontSize: 21,
                  ),
                ),
                SizedBox(height: 8),
                Text(
                  'Bed • nightstand • a quiet door back to the hall',
                  style: TextStyle(color: ArborEnvironmentTokens.textMuted),
                ),
                SizedBox(height: 14),
                Text(
                  'Entering this room saves no note, memory, task, location, '
                  'or presence record. Shared work still belongs in the '
                  'authorized conversation and project systems.',
                  style: TextStyle(
                    color: ArborEnvironmentTokens.cyan,
                    fontSize: 12,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              OutlinedButton.icon(
                onPressed: onOpenConversation,
                icon: const Icon(Icons.chat_bubble_outline),
                label: const Text('Talk to Arbor'),
              ),
              FilledButton.icon(
                onPressed: onReturnHome,
                icon: const Icon(Icons.home_outlined),
                label: const Text('Back to the Grove'),
              ),
            ],
          ),
        ],
      );
}
