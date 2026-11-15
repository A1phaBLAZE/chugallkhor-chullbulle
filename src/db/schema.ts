import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull().default('Lunar Commander'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const moonBases = pgTable('moon_bases', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull().unique(),
  commanderName: text('commander_name').notNull().default('Lunar Commander'),
  day: integer('day').notNull().default(1),
  power: integer('power').notNull().default(100),
  oxygen: integer('oxygen').notNull().default(100),
  shields: integer('shields').notNull().default(100),
  mood: integer('mood').notNull().default(80),
  science: integer('science').notNull().default(0),
  moonRocks: integer('moon_rocks').notNull().default(120),
  solarCharge: integer('solar_charge').notNull().default(80),
  wavesSurvived: integer('waves_survived').notNull().default(0),
  buildingsJson: text('buildings_json').notNull(),
  missionStateJson: text('mission_state_json').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const crewMemories = pgTable('crew_memories', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  crewId: text('crew_id').notNull(),
  sender: text('sender').notNull(),
  message: text('message').notNull(),
  moodState: text('mood_state').notNull().default('curious'),
  dayContext: integer('day_context').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const missionLogs = pgTable('mission_logs', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  day: integer('day').notNull(),
  eventType: text('event_type').notNull(),
  summary: text('summary').notNull(),
  outcome: text('outcome').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
