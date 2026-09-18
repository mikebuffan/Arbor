import 'package:flutter/material.dart';
import 'environment_tokens.dart';

class EnvironmentCommand {
  const EnvironmentCommand(this.label, this.action);
  final String label;
  final VoidCallback action;
}

Future<void> showEnvironmentCommandPalette(
  BuildContext context,
  List<EnvironmentCommand> commands,
) {
  return showDialog<void>(
    context: context,
    builder: (context) => Dialog(
      backgroundColor: ArborEnvironmentTokens.midnight,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 620),
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('COMMAND PALETTE', style: TextStyle(color: ArborEnvironmentTokens.cyan, letterSpacing: 1.5, fontSize: 11)),
            const SizedBox(height: 12),
            ...commands.map((command) => ListTile(
              title: Text(command.label),
              trailing: const Icon(Icons.arrow_forward_rounded, size: 16),
              onTap: () {
                Navigator.of(context).pop();
                command.action();
              },
            )),
          ]),
        ),
      ),
    ),
  );
}
