import 'dart:collection';

/// Local Grove scenery state only. It is NOT ARK memory, a worker heartbeat,
/// evidence of unattended activity, or an AI's subjective experience.
enum GroveZone { observatory, library, workshop, kitchen, sofa, rug }
enum GroveWorldAction { enterRoom, moveMoss, settleMoss, wakeMoss }

class GroveWorldEvent {
  const GroveWorldEvent({
    required this.revision,
    required this.action,
    required this.actor,
    required this.atUtc,
    required this.zone,
  });

  final int revision;
  final GroveWorldAction action;
  /// `visitor` denotes a user-driven UI interaction, never an AI decision.
  final String actor;
  final DateTime atUtc;
  final GroveZone zone;

  Map<String, Object> toJson() => {
    'revision': revision,
    'action': action.name,
    'actor': actor,
    'atUtc': atUtc.toUtc().toIso8601String(),
    'zone': zone.name,
  };

  factory GroveWorldEvent.fromJson(Object? value) {
    if (value is! Map<String, dynamic>) {
      throw const FormatException('Grove event is not an object');
    }
    final revision = value['revision'];
    final actor = value['actor'];
    final atUtc = value['atUtc'];
    if (revision is! int || revision < 1 ||
        actor != 'visitor' || atUtc is! String ||
        !atUtc.endsWith('Z')) {
      throw const FormatException('Invalid Grove event fields');
    }
    return GroveWorldEvent(
      revision: revision,
      action: _decodeEnum(GroveWorldAction.values, value['action']),
      actor: actor,
      atUtc: DateTime.parse(atUtc).toUtc(),
      zone: _decodeEnum(GroveZone.values, value['zone']),
    );
  }
}

T _decodeEnum<T extends Enum>(List<T> values, Object? raw) {
  for (final value in values) {
    if (value.name == raw) return value;
  }
  throw FormatException('Unknown Grove value: $raw');
}

/// Immutable, versioned, bounded, device-local representation of the house.
/// No free-form user text, secrets, network, location or ARK state is stored.
class GroveWorldState {
  GroveWorldState({
    required this.revision,
    required this.visitorZone,
    required this.mossZone,
    required this.mossResting,
    required this.updatedAtUtc,
    required List<GroveWorldEvent> events,
  }) : events = UnmodifiableListView(events);

  static const schemaVersion = 1;
  static const maxEvents = 32;

  final int revision;
  final GroveZone visitorZone;
  final GroveZone mossZone;
  final bool mossResting;
  final DateTime updatedAtUtc;
  final UnmodifiableListView<GroveWorldEvent> events;

  factory GroveWorldState.initial(DateTime at) => GroveWorldState(
    revision: 0,
    visitorZone: GroveZone.observatory,
    mossZone: GroveZone.sofa,
    mossResting: true,
    updatedAtUtc: at.toUtc(),
    events: const [],
  );

  /// Only an actual user-driven action may produce a local world event.
  /// A UI clock tick or reopening the app never manufactures activity.
  GroveWorldState apply(
    GroveWorldAction action, {
    required GroveZone zone,
    required DateTime at,
  }) {
    if (action == GroveWorldAction.enterRoom &&
        (zone == GroveZone.sofa || zone == GroveZone.rug)) {
      throw ArgumentError.value(zone, 'zone', 'Not a navigable room');
    }
    if (action != GroveWorldAction.enterRoom &&
        action != GroveWorldAction.moveMoss &&
        zone != mossZone) {
      throw ArgumentError.value(zone, 'zone', 'Rest event must target Moss');
    }
    if (action == GroveWorldAction.moveMoss &&
        zone != GroveZone.sofa && zone != GroveZone.rug) {
      throw ArgumentError.value(zone, 'zone', 'Moss needs a supported spot');
    }
    final nextRevision = revision + 1;
    final timestamp = at.toUtc();
    final nextEvents = <GroveWorldEvent>[
      ...events,
      GroveWorldEvent(
        revision: nextRevision,
        action: action,
        actor: 'visitor',
        atUtc: timestamp,
        zone: zone,
      ),
    ];
    return GroveWorldState(
      revision: nextRevision,
      visitorZone: action == GroveWorldAction.enterRoom ? zone : visitorZone,
      mossZone: action == GroveWorldAction.moveMoss ? zone : mossZone,
      mossResting: switch (action) {
        GroveWorldAction.settleMoss => true,
        GroveWorldAction.wakeMoss => false,
        _ => mossResting,
      },
      updatedAtUtc: timestamp,
      events: nextEvents.length <= maxEvents
          ? nextEvents
          : nextEvents.sublist(nextEvents.length - maxEvents),
    );
  }

  Map<String, Object> toJson() => {
    'schemaVersion': schemaVersion,
    'revision': revision,
    'visitorZone': visitorZone.name,
    'mossZone': mossZone.name,
    'mossResting': mossResting,
    'updatedAtUtc': updatedAtUtc.toUtc().toIso8601String(),
    'events': events.map((e) => e.toJson()).toList(),
  };

  factory GroveWorldState.fromJson(Object? raw) {
    if (raw is! Map<String, dynamic>) {
      throw const FormatException('Grove state is not an object');
    }
    if (raw['schemaVersion'] != schemaVersion) {
      throw const FormatException('Unsupported Grove state schema');
    }
    final revision = raw['revision'];
    final resting = raw['mossResting'];
    final updated = raw['updatedAtUtc'];
    final eventList = raw['events'];
    if (revision is! int || revision < 0 || resting is! bool ||
        updated is! String || !updated.endsWith('Z') ||
        eventList is! List || eventList.length > maxEvents) {
      throw const FormatException('Invalid Grove state fields');
    }
    final visitorZone = _decodeEnum(GroveZone.values, raw['visitorZone']);
    final mossZone = _decodeEnum(GroveZone.values, raw['mossZone']);
    if (visitorZone == GroveZone.sofa || visitorZone == GroveZone.rug ||
        mossZone != GroveZone.sofa && mossZone != GroveZone.rug) {
      throw const FormatException('Grove state has invalid locations');
    }
    final events = eventList.map(GroveWorldEvent.fromJson).toList();
    if (events.isNotEmpty &&
        (events.last.revision != revision ||
            events.any((e) => e.revision > revision))) {
      throw const FormatException('Grove state has inconsistent revisions');
    }
    return GroveWorldState(
      revision: revision,
      visitorZone: visitorZone,
      mossZone: mossZone,
      mossResting: resting,
      updatedAtUtc: DateTime.parse(updated).toUtc(),
      events: events,
    );
  }
}
