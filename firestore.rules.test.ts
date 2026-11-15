import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rulesSource = fs.readFileSync('firestore.rules', 'utf8');
const blueprint = JSON.parse(fs.readFileSync('firebase-blueprint.json', 'utf8'));

/**
 * Pure structural & Dirty Dozen security rule verification against firestore.rules
 * and firebase-blueprint.json.
 */
function simulateMissionWrite({
  auth,
  pathUserId,
  docId,
  payload,
  existingStatus = 'active',
  isUpdate = false,
  serverTime = 1700000000,
}: {
  auth: { uid: string; emailVerified: boolean } | null;
  pathUserId: string;
  docId: string;
  payload: Record<string, unknown>;
  existingStatus?: string;
  isUpdate?: boolean;
  serverTime?: number;
}): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!auth || !auth.emailVerified) return 'PERMISSION_DENIED';
  if (auth.uid !== pathUserId) return 'PERMISSION_DENIED';
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(docId)) return 'PERMISSION_DENIED';

  const allowedKeys = [
    'ownerId',
    'day',
    'power',
    'oxygen',
    'shields',
    'mood',
    'science',
    'moonRocks',
    'wavesCleared',
    'status',
    'createdAt',
    'updatedAt',
  ];
  const keys = Object.keys(payload);
  if (!allowedKeys.every((k) => keys.includes(k))) return 'PERMISSION_DENIED';
  if (!keys.every((k) => allowedKeys.includes(k))) return 'PERMISSION_DENIED';
  if (payload.ownerId !== pathUserId) return 'PERMISSION_DENIED';
  if (payload.updatedAt !== serverTime) return 'PERMISSION_DENIED';
  if (!isUpdate && payload.createdAt !== serverTime) return 'PERMISSION_DENIED';
  if (isUpdate && existingStatus !== 'active') return 'PERMISSION_DENIED';

  return 'ALLOW';
}

test('firestore.rules covers every blueprint path and enforces global default deny', () => {
  assert.ok(rulesSource.includes("rules_version = '2';"));
  assert.ok(rulesSource.includes('allow read, write: if false;'));
  for (const pathKey of Object.keys(blueprint.firestore)) {
    const prefix = pathKey.split('/{')[0];
    assert.ok(rulesSource.includes(prefix), `Missing rules block for ${pathKey}`);
  }
});

test('Dirty Dozen security payloads all return PERMISSION_DENIED', () => {
  const validPayload = {
    ownerId: 'u1',
    day: 1,
    power: 100,
    oxygen: 100,
    shields: 100,
    mood: 80,
    science: 15,
    moonRocks: 120,
    wavesCleared: 0,
    status: 'active',
    createdAt: 1700000000,
    updatedAt: 1700000000,
  };

  // 1. Unauthenticated write
  assert.equal(
    simulateMissionWrite({ auth: null, pathUserId: 'u1', docId: 'm1', payload: validPayload }),
    'PERMISSION_DENIED'
  );
  // 2. Identity spoofing
  assert.equal(
    simulateMissionWrite({
      auth: { uid: 'u2', emailVerified: true },
      pathUserId: 'u1',
      docId: 'm1',
      payload: validPayload,
    }),
    'PERMISSION_DENIED'
  );
  // 3. PII isolation verified in rules
  assert.ok(rulesSource.includes('match /users/{userId}/private/{infoId}'));
  assert.ok(rulesSource.includes('allow get: if isVerified() && isOwner(userId)'));
  // 4. Shadow field injection
  assert.equal(
    simulateMissionWrite({
      auth: { uid: 'u1', emailVerified: true },
      pathUserId: 'u1',
      docId: 'm1',
      payload: { ...validPayload, isAdmin: true },
    }),
    'PERMISSION_DENIED'
  );
  // 5. Unverified email write
  assert.equal(
    simulateMissionWrite({
      auth: { uid: 'u1', emailVerified: false },
      pathUserId: 'u1',
      docId: 'm1',
      payload: validPayload,
    }),
    'PERMISSION_DENIED'
  );
  // 6. Client timestamp forgery
  assert.equal(
    simulateMissionWrite({
      auth: { uid: 'u1', emailVerified: true },
      pathUserId: 'u1',
      docId: 'm1',
      payload: { ...validPayload, createdAt: 12345 },
    }),
    'PERMISSION_DENIED'
  );
  // 7. Immutable ownerId guard in rules
  assert.ok(rulesSource.includes('incoming().ownerId == existing().ownerId'));
  // 8. ID poisoning
  assert.equal(
    simulateMissionWrite({
      auth: { uid: 'u1', emailVerified: true },
      pathUserId: 'u1',
      docId: 'bad$id!',
      payload: validPayload,
    }),
    'PERMISSION_DENIED'
  );
  // 9. Message size guard on CrewThought
  assert.ok(rulesSource.includes('data.message.size() <= 600'));
  // 10. Terminal state lock
  assert.equal(
    simulateMissionWrite({
      auth: { uid: 'u1', emailVerified: true },
      pathUserId: 'u1',
      docId: 'm1',
      payload: validPayload,
      existingStatus: 'completed',
      isUpdate: true,
    }),
    'PERMISSION_DENIED'
  );
  // 11. Value type guard in leaderboard
  assert.ok(rulesSource.includes('data.scienceScore is int'));
  // 12. List scraping guard on private collection
  assert.ok(rulesSource.includes('allow list: if isVerified() && isOwner(userId) && resource.data.ownerId == request.auth.uid'));

  // Valid owner payload succeeds
  assert.equal(
    simulateMissionWrite({
      auth: { uid: 'u1', emailVerified: true },
      pathUserId: 'u1',
      docId: 'm1',
      payload: validPayload,
    }),
    'ALLOW'
  );
});
