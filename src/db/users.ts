import { db } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string
) {
  try {
    const safeName = (displayName || email.split('@')[0] || 'Lunar Commander').slice(0, 48);
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: safeName,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName: safeName,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database user upsert failed:', error);
    throw new Error('Failed to synchronize commander profile.', { cause: error });
  }
}
