import 'package:flutter/foundation.dart';

/// A reversible display-only sundial shared by the house scene and its
/// Living Window controls. This NEVER changes device time or ARK timestamps.
///
/// Persisted research events and the House Clock always use real timestamps.
/// The preview lasts until the user taps Return to Now (or the app restarts).
class GroveWindowTimeSelection extends ChangeNotifier {
  GroveWindowTimeSelection();

  static final GroveWindowTimeSelection shared = GroveWindowTimeSelection();

  DateTime? _previewAt;

  bool get isPreviewing => _previewAt != null;
  DateTime? get previewAt => _previewAt;

  DateTime displayedAt(DateTime houseLocalNow) => _previewAt ?? houseLocalNow;

  void show(DateTime wallTime) {
    final next = wallTime.toLocal();
    if (_previewAt == next) return;
    _previewAt = next;
    notifyListeners();
  }

  void returnToNow() {
    if (_previewAt == null) return;
    _previewAt = null;
    notifyListeners();
  }
}
