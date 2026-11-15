import { and, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { crewMemories, missionLogs, moonBases } from './schema.ts';

export interface SaveBasePayload {
  userUid: string;
  commanderName: string;
  day: number;
  power: number;
  oxygen: number;
  shields: number;
  mood: number;
  science: number;
  moonRocks: number;
  solarCharge: number;
  wavesSurvived: number;
  buildingsJson: string;
  missionStateJson: string;
}

export async function getMoonBaseForUser(userUid: string) {
  try {
    const rows = await db
      .select()
      .from(moonBases)
      .where(eq(moonBases.userUid, userUid))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database query getMoonBaseForUser failed:', error);
    throw new Error('Unable to load Moon Base progress.', { cause: error });
  }
}

export async function upsertMoonBaseForUser(payload: SaveBasePayload) {
  try {
    const rows = await db
      .insert(moonBases)
      .values({
        ...payload,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: moonBases.userUid,
        set: {
          commanderName: payload.commanderName,
          day: payload.day,
          power: payload.power,
          oxygen: payload.oxygen,
          shields: payload.shields,
          mood: payload.mood,
          science: payload.science,
          moonRocks: payload.moonRocks,
          solarCharge: payload.solarCharge,
          wavesSurvived: payload.wavesSurvived,
          buildingsJson: payload.buildingsJson,
          missionStateJson: payload.missionStateJson,
          updatedAt: new Date(),
        },
      })
      .returning();
    return rows[0];
  } catch (error) {
    console.error('Database upsert upsertMoonBaseForUser failed:', error);
    throw new Error('Unable to save Moon Base progress.', { cause: error });
  }
}

export async function getCrewMemoriesForUser(
  userUid: string,
  crewId?: string,
  limitCount = 24
) {
  try {
    const condition = crewId
      ? and(eq(crewMemories.userUid, userUid), eq(crewMemories.crewId, crewId))
      : eq(crewMemories.userUid, userUid);

    return await db
      .select()
      .from(crewMemories)
      .where(condition)
      .orderBy(desc(crewMemories.createdAt))
      .limit(limitCount);
  } catch (error) {
    console.error('Database query getCrewMemoriesForUser failed:', error);
    throw new Error('Unable to read crew consciousness memories.', { cause: error });
  }
}

export async function addCrewMemoryForUser(entry: {
  userUid: string;
  crewId: string;
  sender: string;
  message: string;
  moodState: string;
  dayContext: number;
}) {
  try {
    const rows = await db
      .insert(crewMemories)
      .values({
        userUid: entry.userUid,
        crewId: entry.crewId,
        sender: entry.sender,
        message: entry.message.slice(0, 600),
        moodState: entry.moodState.slice(0, 48),
        dayContext: entry.dayContext,
      })
      .returning();
    return rows[0];
  } catch (error) {
    console.error('Database insert addCrewMemoryForUser failed:', error);
    throw new Error('Unable to record crew memory.', { cause: error });
  }
}

export async function addMissionLogForUser(entry: {
  userUid: string;
  day: number;
  eventType: string;
  summary: string;
  outcome: string;
}) {
  try {
    const rows = await db
      .insert(missionLogs)
      .values({
        userUid: entry.userUid,
        day: entry.day,
        eventType: entry.eventType.slice(0, 48),
        summary: entry.summary.slice(0, 400),
        outcome: entry.outcome.slice(0, 120),
      })
      .returning();
    return rows[0];
  } catch (error) {
    console.error('Database insert addMissionLogForUser failed:', error);
    throw new Error('Unable to log mission event.', { cause: error });
  }
}

export async function getTopMissionCommanders(limitCount = 10) {
  try {
    return await db
      .select({
        commanderName: moonBases.commanderName,
        day: moonBases.day,
        science: moonBases.science,
        wavesSurvived: moonBases.wavesSurvived,
        moonRocks: moonBases.moonRocks,
      })
      .from(moonBases)
      .orderBy(desc(moonBases.science))
      .limit(limitCount);
  } catch (error) {
    console.error('Database query getTopMissionCommanders failed:', error);
    throw new Error('Unable to load top commanders.', { cause: error });
  }
}
