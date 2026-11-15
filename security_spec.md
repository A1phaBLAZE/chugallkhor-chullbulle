# Moon Base Mission Security Specification (Phase 0)

## 1. Data Invariants
1. **Strict Ownership**: Every document under `/users/{userId}/...` belongs solely to `request.auth.uid == userId`, with `incoming().ownerId == request.auth.uid`.
2. **PII Isolation**: User email is strictly isolated inside `/users/{userId}/private/{infoId}` where both read and write require `isOwner(userId) && isVerified()`. Public profiles and `/leaderboard/{entryId}` NEVER contain email addresses or phone numbers.
3. **Immutable Identity & Timestamps**: `ownerId` and `createdAt` cannot be modified on update. `createdAt == request.time` on create; `updatedAt == request.time` on update.
4. **Terminal State Locking**: Once a `/users/{userId}/missions/{missionId}` document reaches `status == 'completed'` or `status == 'failed'`, no subsequent update may mutate that completed mission record.
5. **Strict Key & Size Boundaries**: Every write validates `keys().hasAll(...) && keys().hasOnly(...)` on create, `affectedKeys().hasOnly(...)` action branches on update, and `.size()` bounds on all strings.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Write**: Writing `/users/u1/missions/m1` with `request.auth == null`.
2. **Identity Spoofing**: User `u2` creating `/users/u1/missions/m1` or setting `ownerId: 'u1'` as `u2`.
3. **PII Blanket Read**: User `u2` attempting `get` on `/users/u1/private/info`.
4. **Shadow Field Injection**: Creating a mission with extra ghost field `isAdmin: true`.
5. **Unverified Email Write**: Authenticated user with `email_verified: false` attempting a write.
6. **Timestamp Forgery**: Creating a mission with client-supplied `createdAt` instead of `request.time`.
7. **Immutable Owner Mutation**: Updating `ownerId` on an existing `/leaderboard/{entryId}` document.
8. **ID Poisoning**: Creating `/users/u1/missions/bad$id!` with disallowed characters or >128 length.
9. **Resource Exhaustion String**: Creating a `CrewThought` with `message.size() > 600`.
10. **Terminal State Bypass**: Updating a `/users/u1/missions/m1` record whose existing `status == 'completed'`.
11. **Value Poisoning**: Updating `leaderboard` `scienceScore` to a string `"99999"` instead of an integer.
12. **List Scraping on Private Collection**: Querying `list` on `/users/u1/private` as `u2`.
