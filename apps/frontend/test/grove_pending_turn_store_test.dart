import 'dart:convert';
import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/grove_pending_turn_store.dart';

import 'support/device_string_store_fake.dart';

const user = '00000000-0000-4000-8000-000000000001';
const project = '00000000-0000-4000-8000-000000000003';
const conversation = '00000000-0000-4000-8000-000000000004';
const retry = '00000000-0000-4000-8000-000000000005';
const other = '00000000-0000-4000-8000-000000000006';

GrovePendingTurnStore store(FakeDeviceStringStore storage, {
  String owner = user, String projectId = project,
  String api = 'https://grove-private.example.org',
  String auth = 'https://fqjqpuaoifgbweiguacf.supabase.co',
}) => GrovePendingTurnStore(userId: owner, projectId: projectId,
    apiOrigin: api, authOrigin: auth, storage: storage);

void main() {
  test('a blocked device store does not stall another device store', () async {
    final blocked = FakeDeviceStringStore();
    final release = Completer<void>();
    blocked.pauseWrite = release.future;
    final pending = store(blocked).save(conversation,
      const GrovePendingTurn(text: 'Waiting'));
    try {
      expect(await store(FakeDeviceStringStore()).load(conversation), isNull);
    } finally {
      release.complete();
      await pending;
    }
  });

  test('opening empty storage does not opt in or write', () async {
    final disk = FakeDeviceStringStore();
    expect(await store(disk).load(conversation), isNull);
    expect(disk.writes, 0);
  });

  test('restart restores exact unsent draft and frozen retry identity', () async {
    final disk = FakeDeviceStringStore();
    await store(disk).save(conversation, const GrovePendingTurn(text: 'Draft'));
    expect((await store(disk).load(conversation))?.requestId, isNull);
    await store(disk).save(conversation,
      const GrovePendingTurn(text: 'Original message', requestId: retry));
    final restored = await store(disk).load(conversation);
    expect(restored?.text, 'Original message');
    expect(restored?.requestId, retry);
    expect(disk.values.values.single, isNot(contains('accessToken')));
  });

  test('account, project, conversation, receiver and auth realms isolate drafts', () async {
    final disk = FakeDeviceStringStore();
    await store(disk).save(conversation,
      const GrovePendingTurn(text: 'Private', requestId: retry));
    expect(await store(disk, owner: other).load(conversation), isNull);
    expect(await store(disk, projectId: other).load(conversation), isNull);
    expect(await store(disk).load(other), isNull);
    expect(await store(disk, api: 'https://other.example.org').load(conversation), isNull);
    expect(await store(disk, auth: 'https://other.supabase.co').load(conversation), isNull);
  });

  test('stale panel cannot replace or silently clear an uncertain retry', () async {
    final disk = FakeDeviceStringStore();
    await store(disk).save(conversation,
      const GrovePendingTurn(text: 'Original', requestId: retry));
    for (final turn in [
      const GrovePendingTurn(text: 'Edited', requestId: retry),
      const GrovePendingTurn(text: 'Original', requestId: other),
      const GrovePendingTurn(text: ''),
    ]) {
      await expectLater(store(disk).save(conversation, turn), throwsStateError);
    }
    await store(disk).save(conversation, const GrovePendingTurn(text: ''),
      completedRequestId: retry);
    expect((await store(disk).load(conversation))?.text, '');
  });

  test('failed save and failed erase preserve previous identity and report failure', () async {
    final disk = FakeDeviceStringStore();
    await store(disk).save(conversation,
      const GrovePendingTurn(text: 'Original', requestId: retry));
    disk.failWrites = true;
    await expectLater(store(disk).save(conversation,
      const GrovePendingTurn(text: ''), completedRequestId: retry), throwsStateError);
    await expectLater(store(disk).erase(conversation), throwsStateError);
    expect((await store(disk).load(conversation))?.requestId, retry);
    disk.failWrites = false;
    await store(disk).erase(conversation);
    expect(await store(disk).load(conversation), isNull);
  });

  test('unknown and foreign-scope records are held without overwrite', () async {
    final disk = FakeDeviceStringStore();
    await store(disk).save(conversation, const GrovePendingTurn(text: 'Private'));
    final key = disk.values.keys.single;
    final original = jsonDecode(disk.values[key]!) as Map<String, dynamic>;
    for (final changed in [
      {...original, 'version': 99},
      {...original, 'userId': other},
      {...original, 'requestId': 'invalid'},
    ]) {
      disk.values[key] = jsonEncode(changed);
      final bytes = disk.values[key];
      await expectLater(store(disk).load(conversation), throwsFormatException);
      await expectLater(store(disk).save(conversation,
        const GrovePendingTurn(text: 'Replacement')), throwsFormatException);
      expect(disk.values[key], bytes);
    }
    await store(disk).erase(conversation);
    expect(await store(disk).load(conversation), isNull);
  });
}
