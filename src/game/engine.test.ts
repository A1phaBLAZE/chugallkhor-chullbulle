import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activateCrewAbility,
  advanceToNextDay,
  answerResultQuickQuestion,
  attemptDay10Launch,
  createInitialGameState,
  getLaunchRequirements,
  halveChoiceEffectForMiss,
  resolveDayTurn,
  runDay10SafetyCheck,
} from './engine';
import { getCrewSpeechBubble, MISSION_DAYS } from './gameData';
import { CrewId } from './types';
import {
  flareClassToStormLevel,
  selectFastestCme,
  selectStrongestFlare,
} from './nasaService';

test('initial state starts on Day 1 with 100 across all 4 systems, Mood 80, Science 0, and 2 bonus days', () => {
  const state = createInitialGameState(() => 0.42);
  assert.equal(state.day, 1);
  assert.deepEqual(state.meters, {
    power: 100,
    airWater: 100,
    radiation: 100,
    food: 100,
    mood: 80,
    science: 0,
  });
  assert.equal(Object.keys(state.bonusEventsByDay).length, 2);
});

test('daily upkeep reduces Power -5, Air & Water -5, Food -5, Radiation -2, and Mood -2 when any system < 30', () => {
  const state = createInitialGameState(() => 0.1);
  state.bonusEventsByDay = {};
  state.meters.airWater = 25;

  const day1 = MISSION_DAYS[0];
  const after = resolveDayTurn(state, day1.choices[0], { rng: () => 0.5 });

  // Brush panels: P+15 (cap 100) -> -5 = 95
  // Air & Water: 25 -> -5 = 20 (<30 triggers Mood -2)
  // Radiation: 100 - 3 - 2 = 95
  // Food: 100 - 5 = 95
  // Mood: 80 - 5 (choice) - 2 (low meter) = 73
  assert.equal(after.meters.power, 95);
  assert.equal(after.meters.airWater, 20);
  assert.equal(after.meters.radiation, 95);
  assert.equal(after.meters.food, 95);
  assert.equal(after.meters.mood, 73);
});

test('Day 2 choice B gives +20 Air & Water, -10 Power today, then -10 Air & Water tomorrow', () => {
  const state = createInitialGameState(() => 0.1);
  state.bonusEventsByDay = {};
  state.day = 2;
  state.meters.airWater = 60;

  const choiceB = MISSION_DAYS[1].choices[1];
  const afterDay2 = resolveDayTurn(state, choiceB);
  assert.equal(afterDay2.meters.airWater, 75); // 60 + 20 - 5 upkeep
  assert.equal(afterDay2.meters.power, 85); // 100 - 10 - 5 upkeep

  const day3Morning = advanceToNextDay(afterDay2);
  assert.equal(day3Morning.day, 3);
  assert.equal(day3Morning.meters.airWater, 65); // 75 - 10 tomorrow penalty
});

test('Amy Overclock adds +15 today and -25 tomorrow on any of the 4 systems with 3-day cooldown', () => {
  const state = createInitialGameState(() => 0.1);
  state.bonusEventsByDay = {};
  state.meters.food = 50;

  const { nextState } = activateCrewAbility(state, 'amy', {
    overclockMeter: 'food',
  });
  assert.equal(nextState.meters.food, 65);
  assert.equal(nextState.cooldowns.amy, 3);
  assert.equal(nextState.abilityUsedToday, true);

  const afterDay1 = resolveDayTurn(nextState, MISSION_DAYS[0].choices[2]); // Food -5 upkeep => 60
  const day2 = advanceToNextDay(afterDay1);
  assert.equal(day2.meters.food, 35); // 60 - 25 tomorrow penalty
  assert.equal(day2.cooldowns.amy, 2);
});

test('Berry Deep Scan reveals tomorrow crisis & hidden risk and uses whole day', () => {
  const state = createInitialGameState(() => 0.1);
  state.bonusEventsByDay = {};
  state.day = 2;

  const { nextState, triggeredFullDayResult } = activateCrewAbility(state, 'berry');
  assert.equal(triggeredFullDayResult, true);
  assert.equal(nextState.deepScanRevealedForDay, 3);
  assert.equal(nextState.lastResult?.deepScanPreview?.nextDay, 3);
  assert.ok(nextState.lastResult?.deepScanPreview?.hiddenRisk.includes('Storm Level'));
});

test('Day 3 Level 3 solar storm triggers Radiation Emergency when Radiation hits 0, saved once by Triage', () => {
  const state = createInitialGameState(() => 0.1);
  state.bonusEventsByDay = {};
  state.day = 3;
  state.meters.radiation = 40;

  const choiceB = MISSION_DAYS[2].choices[1]; // -15 * stormLevel = -45 => 0
  const saved = resolveDayTurn(state, choiceB, { stormLevel: 3 });

  assert.equal(saved.failReason, null);
  assert.equal(saved.triageUsed, true);
  assert.equal(saved.lastResult?.triageAutoSaved, true);
  assert.equal(saved.meters.radiation, 13); // Restored to 15, then -2 daily drain

  const stateNoTriage = createInitialGameState(() => 0.1);
  stateNoTriage.bonusEventsByDay = {};
  stateNoTriage.day = 3;
  stateNoTriage.triageUsed = true;
  stateNoTriage.meters.radiation = 40;

  const failed = resolveDayTurn(stateNoTriage, choiceB, { stormLevel: 3 });
  assert.equal(failed.failReason, 'RADIATION_EMERGENCY');
});

test('Power=0 (any day), Air & Water=0, and Food=0 trigger Lights Out, Not Enough Air, and Hungry Crew', () => {
  // Power=0 on Day 1 (no Day 6 exception!)
  const sPower = createInitialGameState(() => 0.1);
  sPower.bonusEventsByDay = {};
  sPower.day = 1;
  sPower.meters.power = 12;
  const rPower = resolveDayTurn(sPower, MISSION_DAYS[0].choices[1]); // -10 -5 => 0
  assert.equal(rPower.failReason, 'POWER_EMPTY');

  // Air & Water=0
  const sAir = createInitialGameState(() => 0.1);
  sAir.bonusEventsByDay = {};
  sAir.day = 2;
  sAir.meters.airWater = 15;
  const rAir = resolveDayTurn(sAir, MISSION_DAYS[1].choices[2]); // -15 -5 => 0
  assert.equal(rAir.failReason, 'AIR_WATER_EMPTY');

  // Food=0
  const sFood = createInitialGameState(() => 0.1);
  sFood.bonusEventsByDay = {};
  sFood.day = 4;
  sFood.meters.food = 8;
  const rFood = resolveDayTurn(sFood, MISSION_DAYS[3].choices[1]); // -5 -5 => 0
  assert.equal(rFood.failReason, 'FOOD_EMPTY');
});

test('Mood reaching 0 deducts 30 from a random base system and refuses one ability next day', () => {
  const state = createInitialGameState(() => 0.1);
  state.bonusEventsByDay = {};
  state.day = 1;
  state.meters.mood = 5;

  const after = resolveDayTurn(state, MISSION_DAYS[0].choices[0], {
    rng: () => 0, // picks power (-30) and capt
  });
  assert.equal(after.lastResult?.moodZeroTriggered, true);
  assert.equal(after.meters.power, 65); // 100 - 5 upkeep - 30 mood=0 penalty
  assert.equal(after.refusedAbilityToday, 'capt');

  const day2 = advanceToNextDay(after);
  const attempt = activateCrewAbility(day2, 'capt');
  assert.ok(attempt.message.includes('grumpy'));
});

test('Quick Question grants +5 Science on right answer and 0 penalty on wrong answer', () => {
  const state = createInitialGameState(() => 0.1);
  state.bonusEventsByDay = {};
  const afterDay = resolveDayTurn(state, MISSION_DAYS[0].choices[1]); // Science +10
  assert.equal(afterDay.meters.science, 10);

  const right = answerResultQuickQuestion(afterDay, 0);
  assert.equal(right.isCorrect, true);
  assert.equal(right.nextState.meters.science, 15);

  const wrong = answerResultQuickQuestion(afterDay, 2);
  assert.equal(wrong.isCorrect, false);
  assert.equal(wrong.nextState.meters.science, 10);
});

test('Day 9 backup radio adds +10 extra launch Power (to 60); Day 10 Safety Check & Gold rule (>100 Sci, !crewHurt, all 4 > 40)', () => {
  const state = createInitialGameState(() => 0.1);
  state.bonusEventsByDay = {};
  state.day = 9;
  const afterDay9 = resolveDayTurn(state, MISSION_DAYS[8].choices[1]); // backup radio (+10 Power req)
  const day10 = advanceToNextDay(afterDay9);

  assert.equal(getLaunchRequirements(day10).power, 60);

  // 55 Power fails because Day 10 needs 60
  day10.meters = { power: 55, airWater: 50, radiation: 50, food: 50, mood: 80, science: 120 };
  assert.equal(attemptDay10Launch(day10).failReason, 'MISSED_LAUNCH');

  // Safety Check: spend 10 Power -> Radiation +10
  day10.meters = { power: 70, airWater: 50, radiation: 35, food: 50, mood: 80, science: 110 };
  const { nextState: checked } = runDay10SafetyCheck(day10);
  assert.equal(checked.meters.power, 60);
  assert.equal(checked.meters.radiation, 45);

  // Gold requires all 4 systems > 40, science > 100, !crewHurt
  assert.equal(attemptDay10Launch(checked).endingTier, 'GOLD');

  // If Food is 35 (<= 40) even though > 20 launch min, earns SILVER!
  const lowFoodGoldCheck = {
    ...checked,
    meters: { ...checked.meters, food: 35 },
  };
  assert.equal(attemptDay10Launch(lowFoodGoldCheck).endingTier, 'SILVER');
});

test('NASA DONKI flare mapping, strongest flare, and fastest CME speed parsing', () => {
  assert.equal(flareClassToStormLevel('C5.2'), 1);
  assert.equal(flareClassToStormLevel('M1.9'), 2);
  assert.equal(flareClassToStormLevel('X2.1'), 3);
  assert.equal(flareClassToStormLevel(undefined), 1);

  const picked = selectStrongestFlare([
    { classType: 'C8.0', peakTime: '2026-11-01T10:00Z' },
    { classType: 'X1.2', peakTime: '2026-11-05T12:00Z' },
    { classType: 'M4.5', peakTime: '2026-11-08T09:00Z' },
  ]);
  assert.equal(picked.flareClass, 'X1.2');
  assert.equal(picked.stormLevel, 3);
  assert.equal(picked.flareDate, '2026-11-05');

  const cme = selectFastestCme([
    { startTime: '2026-11-02T00:00Z', cmeAnalyses: [{ speed: 540 }] },
    { startTime: '2026-11-05T00:00Z', cmeAnalyses: [{ speed: 1280.4 }] },
  ]);
  assert.equal(cme.speedKmS, 1280);
  assert.equal(cme.cmeDate, '2026-11-05');
});

test('mini-game fail/skip halves positive gains rounded down while keeping negative costs exact', () => {
  // Day 1 A: +15 Power, -5 Mood, -3 Radiation -> miss gives +7 Power, -5 Mood, -3 Radiation
  const d1Halved = halveChoiceEffectForMiss(MISSION_DAYS[0].choices[0].effect);
  assert.equal(d1Halved.power, 7);
  assert.equal(d1Halved.mood, -5);
  assert.equal(d1Halved.radiation, -3);

  // Day 4 A: +15 Food, +5 Mood, -10 Power, -5 Air/Water -> miss gives +7 Food, +2 Mood, same costs
  const d4Halved = halveChoiceEffectForMiss(MISSION_DAYS[3].choices[0].effect);
  assert.equal(d4Halved.food, 7);
  assert.equal(d4Halved.mood, 2);
  assert.equal(d4Halved.power, -10);
  assert.equal(d4Halved.airWater, -5);

  // Full turn resolution check on Day 2 A (+25 Air -> +12 when missed, -5 Power stays -5)
  const state = createInitialGameState(() => 0.1);
  state.bonusEventsByDay = {};
  state.day = 2;
  state.meters.airWater = 50;
  state.meters.power = 60;

  const missed = resolveDayTurn(state, MISSION_DAYS[1].choices[0], {
    miniGameSucceeded: false,
  });
  // AirWater: 50 + 12 (halved) - 5 (upkeep) = 57
  // Power: 60 - 5 (cost) - 5 (upkeep) = 50
  assert.equal(missed.meters.airWater, 57);
  assert.equal(missed.meters.power, 50);
  assert.equal(missed.lastResult?.miniGameSucceeded, false);
  assert.equal(missed.lastResult?.actionStarEarned, false);
  assert.equal(missed.lastResult?.dayStars, 1); // only noSystemBelow30
});

test('Day Stars (1-3) and Mission Patch unlock update when answering Quick Question right', () => {
  const state = createInitialGameState(() => 0.1);
  state.bonusEventsByDay = {};

  // Day 1 A won mini-game + all systems >= 30 => 2 stars initially
  const afterDay1 = resolveDayTurn(state, MISSION_DAYS[0].choices[0], {
    miniGameSucceeded: true,
  });
  assert.equal(afterDay1.lastResult?.dayStars, 2);
  assert.equal(afterDay1.patchEarnedDays.length, 0);

  // Answering right => 3 stars & unlocks Day 1 badge
  const right = answerResultQuickQuestion(afterDay1, 0);
  assert.equal(right.isCorrect, true);
  assert.equal(right.nextState.lastResult?.dayStars, 3);
  assert.deepEqual(right.nextState.patchEarnedDays, [1]);
  assert.equal(right.nextState.dayStarsByDay[1], 3);
});

test('all 10 day stories stay concise (<= 2 sentences) and crew speech bubbles stay <= 8 words', () => {
  const crewIds: CrewId[] = ['capt', 'amy', 'berry', 'nikita'];
  const state = createInitialGameState(() => 0.2);

  for (const dayDef of MISSION_DAYS) {
    const sentences = dayDef.story
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    assert.ok(
      sentences.length <= 2,
      `Day ${dayDef.day} story has ${sentences.length} sentences (max 2)`
    );

    state.day = dayDef.day;
    for (const cid of crewIds) {
      for (const storm of [1, 2, 3] as const) {
        const line = getCrewSpeechBubble(cid, state, storm);
        const words = line.trim().split(/\s+/).filter(Boolean);
        assert.ok(
          words.length <= 8,
          `Day ${dayDef.day} crew ${cid} bubble "${line}" has ${words.length} words (max 8)`
        );
      }
    }
  }
});

test('full 10-day simulated playthrough reaches Day 10 and launches safely', () => {
  let state = createInitialGameState(() => 0.15);
  state.bonusEventsByDay = {};

  // Smart resource-balanced strategy across Days 1-9
  const strategyChoiceIndex: Record<number, number> = {
    1: 2, // C: Quick wipe (+5 P, +5 S) -> keeps Power high
    2: 0, // A: Swap filter (+25 A, -5 P)
    3: 2, // C: Stack water tanks (+15 R, -10 A, -5 P)
    4: 2, // C: Tend small plant shelf (+8 F, +5 S, -4 P)
    5: 1, // B: Switch off non-essential (+15 P, -5 S, -3 M)
    6: 2, // C: Stay cozy (+5 M, -5 S) -> saves Power for launch
    7: 1, // B: Team dinner (+15 M, -10 F)
    8: 0, // A: Nikita EVA (+15 S, -10 R, Triage auto-saves)
    9: 2, // C: Wait patiently (+5 M, -5 A)
  };

  for (let d = 1; d <= 9; d++) {
    assert.equal(state.day, d);
    const dayDef = MISSION_DAYS[d - 1];
    state = resolveDayTurn(state, dayDef.choices[strategyChoiceIndex[d]], {
      stormLevel: 2,
      miniGameSucceeded: true,
    });
    assert.equal(state.failReason, null, `Unexpected fail on Day ${d}: ${state.failReason}`);
    const answered = answerResultQuickQuestion(
      state,
      dayDef.quickQuestion.correctIndex
    );
    state = advanceToNextDay(answered.nextState);
    assert.equal(state.failReason, null, `Unexpected morning fail entering Day ${d + 1}`);
  }

  assert.equal(state.day, 10);
  const launched = attemptDay10Launch(state);
  assert.equal(launched.failReason, null, `Missed launch: ${JSON.stringify(launched.meters)}`);
  assert.ok(launched.endingTier === 'GOLD' || launched.endingTier === 'SILVER');
});

