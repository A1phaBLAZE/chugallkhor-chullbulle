import { BONUS_EVENTS, DAY10_LAUNCH_MINIGAME, MISSION_DAYS } from './gameData';
import {
  BaseSystemKey,
  BonusEvent,
  CheckpointSnapshot,
  ChoiceEffect,
  CrewId,
  DayChoice,
  DayResultSummary,
  FailReason,
  GameState,
  MeterKey,
  Meters,
  NasaMissionBundle,
  StormLevel,
} from './types';

export const SAVE_STORAGE_KEY = 'moon_base_mission_save_v2';
export const CHECKPOINT_STORAGE_KEY = 'moon_base_mission_checkpoint_v2';
export const MISSION_PATCHES_STORAGE_KEY = 'moon_base_mission_patches_v1';

const METER_DISPLAY_NAME: Record<MeterKey, string> = {
  power: 'Power',
  airWater: 'Air & Water',
  radiation: 'Radiation Protection',
  food: 'Food',
  mood: 'Crew Mood',
};

/**
 * Clamps survival meters between 0 and 100.
 */
export function clampMeter(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Fisher-Yates shuffle helper using a supplied RNG (defaults to Math.random).
 */
export function shuffleArray<T>(items: T[], rng: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * When a mini-game is failed or skipped, positive gains are halved (rounded down)
 * while costs and negative effects stay exactly the same (never extra penalties).
 */
export function halveChoiceEffectForMiss(effect: ChoiceEffect): ChoiceEffect {
  const halvePositive = (val?: number): number | undefined => {
    if (typeof val !== 'number') return val;
    return val > 0 ? Math.floor(val / 2) : val;
  };

  return {
    ...effect,
    power: halvePositive(effect.power),
    airWater: halvePositive(effect.airWater),
    radiation: halvePositive(effect.radiation),
    food: halvePositive(effect.food),
    mood: halvePositive(effect.mood),
    science: halvePositive(effect.science),
  };
}

/**
 * Computes 1..3 stars for a day based on:
 * 1) Mini-game success (or clean action on non-mini-game days)
 * 2) No base system below 30
 * 3) Quick question answered correctly
 */
export function computeDayStars(
  actionStarEarned: boolean,
  noSystemBelow30: boolean,
  quickQuestionCorrect: boolean
): 1 | 2 | 3 {
  const count =
    (actionStarEarned ? 1 : 0) +
    (noSystemBelow30 ? 1 : 0) +
    (quickQuestionCorrect ? 1 : 0);
  return Math.max(1, Math.min(3, count)) as 1 | 2 | 3;
}

/**
 * Creates a fresh Day 1 mission state with 2 random bonus event days and shuffled choices.
 */
export function createInitialGameState(rng: () => number = Math.random): GameState {
  const candidateDays = shuffleArray([2, 3, 4, 5, 6, 7, 8, 9], rng).slice(0, 2);
  const pickedEvents = shuffleArray(BONUS_EVENTS, rng).slice(0, 2);

  const bonusEventsByDay: Record<number, string> = {};
  candidateDays.forEach((dayNum, idx) => {
    bonusEventsByDay[dayNum] = pickedEvents[idx].id;
  });

  const shuffledChoiceOrder: Record<number, string[]> = {};
  for (const dayDef of MISSION_DAYS) {
    if (dayDef.choices.length > 0) {
      shuffledChoiceOrder[dayDef.day] = shuffleArray(
        dayDef.choices.map((c) => c.id),
        rng
      );
    }
  }

  return {
    day: 1,
    meters: {
      power: 100,
      airWater: 100,
      radiation: 100,
      food: 100,
      mood: 80,
      science: 0,
    },
    cooldowns: {
      capt: 0,
      amy: 0,
      berry: 0,
      nikita: 0,
    },
    triageUsed: false,
    abilityUsedToday: false,
    crewHurt: false,
    extraLaunchPowerRequired: 0,
    launchReqRevealed: false,
    pendingTomorrowEffects: [],
    refusedAbilityToday: null,
    deepScanRevealedForDay: null,
    bonusEventsByDay,
    shuffledChoiceOrder,
    patchEarnedDays: [],
    dayStarsByDay: {},
    seenWords: [],
    lastResult: null,
    failReason: null,
    endingTier: null,
  };
}

/**
 * Returns the shuffled choices for the current day.
 */
export function getOrderedChoicesForDay(state: GameState): DayChoice[] {
  const dayDef = MISSION_DAYS.find((d) => d.day === state.day);
  if (!dayDef) return [];
  const order = state.shuffledChoiceOrder[state.day];
  if (!order) return dayDef.choices;
  const byId = new Map(dayDef.choices.map((c) => [c.id, c]));
  return order.map((id) => byId.get(id)).filter((c): c is DayChoice => Boolean(c));
}

/**
 * Returns the bonus event assigned to the given day, if any.
 */
export function getBonusEventForDay(state: GameState, day: number): BonusEvent | null {
  const eventId = state.bonusEventsByDay[day];
  if (!eventId) return null;
  return BONUS_EVENTS.find((e) => e.id === eventId) || null;
}

/**
 * Computes required Day 10 launch minimums.
 */
export function getLaunchRequirements(state: GameState) {
  return {
    power: 50 + state.extraLaunchPowerRequired,
    airWater: 30,
    radiation: 30,
    food: 20,
  };
}

/**
 * Checks core system zero fails after any state change.
 */
function detectSystemFail(
  meters: Meters,
  options: { isStormOrEva: boolean }
): FailReason | null {
  if (meters.airWater <= 0) return 'AIR_WATER_EMPTY';
  if (meters.power <= 0) return 'POWER_EMPTY';
  if (meters.food <= 0) return 'FOOD_EMPTY';
  if (options.isStormOrEva && meters.radiation <= 0) return 'RADIATION_EMERGENCY';
  return null;
}

/**
 * Activates a crew member's daily ability (in addition to daily choice, except Berry who uses the whole day).
 */
export function activateCrewAbility(
  state: GameState,
  crewId: CrewId,
  options?: {
    overclockMeter?: MeterKey;
    stormLevel?: StormLevel;
    nasaInfo?: NasaMissionBundle;
    rng?: () => number;
  }
): { nextState: GameState; message: string; triggeredFullDayResult: boolean } {
  if (state.abilityUsedToday) {
    return {
      nextState: state,
      message: 'A crew ability was already used today!',
      triggeredFullDayResult: false,
    };
  }
  if (state.refusedAbilityToday === crewId) {
    return {
      nextState: state,
      message: 'This crewmate is too grumpy from yesterday to use their ability today.',
      triggeredFullDayResult: false,
    };
  }
  if (state.cooldowns[crewId] > 0) {
    return {
      nextState: state,
      message: `Ability is cooling down (${state.cooldowns[crewId]} day(s) left).`,
      triggeredFullDayResult: false,
    };
  }

  if (crewId === 'capt') {
    if (state.meters.power < 5) {
      return {
        nextState: state,
        message: 'Need at least 5 Power for Capt. Space to Rally!',
        triggeredFullDayResult: false,
      };
    }
    const nextState: GameState = {
      ...state,
      abilityUsedToday: true,
      cooldowns: { ...state.cooldowns, capt: 3 },
      meters: {
        ...state.meters,
        mood: clampMeter(state.meters.mood + 15),
        power: clampMeter(state.meters.power - 5),
      },
    };
    return {
      nextState,
      message: 'Capt. Space rallied the crew! Crew Mood +15, Power -5.',
      triggeredFullDayResult: false,
    };
  }

  if (crewId === 'amy') {
    const targetMeter = options?.overclockMeter;
    if (!targetMeter) {
      return {
        nextState: state,
        message: 'Pick a meter to Overclock.',
        triggeredFullDayResult: false,
      };
    }
    const label = METER_DISPLAY_NAME[targetMeter];
    const nextState: GameState = {
      ...state,
      abilityUsedToday: true,
      cooldowns: { ...state.cooldowns, amy: 3 },
      meters: {
        ...state.meters,
        [targetMeter]: clampMeter(state.meters[targetMeter] + 15),
      },
      pendingTomorrowEffects: [
        ...state.pendingTomorrowEffects,
        {
          meter: targetMeter,
          delta: -25,
          source: `Amy's Overclock wore off on ${label}`,
        },
      ],
    };
    return {
      nextState,
      message: `Amy overclocked ${label}! +15 today, -25 tomorrow.`,
      triggeredFullDayResult: false,
    };
  }

  if (crewId === 'nikita') {
    if (state.triageUsed) {
      return {
        nextState: state,
        message: 'Nikita already used her one-time Triage kit!',
        triggeredFullDayResult: false,
      };
    }
    if (!state.crewHurt) {
      return {
        nextState: state,
        message: 'Everyone is healthy! Nikita saves Triage for a radiation emergency.',
        triggeredFullDayResult: false,
      };
    }
    const nextState: GameState = {
      ...state,
      abilityUsedToday: true,
      triageUsed: true,
      crewHurt: false,
      meters: {
        ...state.meters,
        mood: clampMeter(state.meters.mood + 10),
      },
    };
    return {
      nextState,
      message: 'Nikita used Triage! Everyone is healthy again and Crew Mood +10.',
      triggeredFullDayResult: false,
    };
  }

  // Berry: Deep Scan uses the whole day (no other choice that day)
  if (state.day >= 10) {
    return {
      nextState: state,
      message: 'Day 10 is Launch Day—no tomorrow left to scan!',
      triggeredFullDayResult: false,
    };
  }

  const resolved = resolveDayTurn(state, null, {
    stormLevel: options?.stormLevel ?? options?.nasaInfo?.stormLevel ?? 1,
    nasaInfo: options?.nasaInfo,
    rng: options?.rng,
    usedDeepScan: true,
  });
  return {
    nextState: resolved,
    message: "Berry spent the day running a Deep Scan of tomorrow's crisis!",
    triggeredFullDayResult: true,
  };
}

/**
 * Day 10 optional Safety Check: spend 10 Power -> Radiation Protection +10.
 */
export function runDay10SafetyCheck(state: GameState): {
  nextState: GameState;
  message: string;
} {
  if (state.day !== 10) {
    return { nextState: state, message: 'Only available on Launch Day!' };
  }
  if (state.meters.power < 10) {
    return { nextState: state, message: 'Not enough Power (needs 10 Power).' };
  }
  const nextState: GameState = {
    ...state,
    meters: {
      ...state.meters,
      power: clampMeter(state.meters.power - 10),
      radiation: clampMeter(state.meters.radiation + 10),
    },
  };
  return {
    nextState,
    message: 'Safety Check complete! Spent 10 Power for +10 Radiation Protection.',
  };
}

/**
 * Resolves Day 10 launch attempt and sets GOLD/SILVER ending or MISSED_LAUNCH fail.
 * Gold = everyone safe (!crewHurt), Science > 100, AND all 4 systems > 40 at launch.
 */
export function attemptDay10Launch(state: GameState): GameState {
  const req = getLaunchRequirements(state);
  const { power, airWater, radiation, food, science } = state.meters;
  const dayDef = MISSION_DAYS[9];

  const met =
    power >= req.power &&
    airWater >= req.airWater &&
    radiation >= req.radiation &&
    food >= req.food;

  const noSystemBelow30 =
    power >= 30 && airWater >= 30 && radiation >= 30 && food >= 30;

  if (!met) {
    return {
      ...state,
      failReason: 'MISSED_LAUNCH',
      endingTier: null,
      lastResult: {
        day: 10,
        headline: 'Missed the Window!',
        summaryLines: [
          `Needed Power ${req.power}, Air & Water ${req.airWater}, Radiation ${req.radiation}, and Food ${req.food}.`,
          `Base had Power ${power}, Air & Water ${airWater}, Radiation ${radiation}, and Food ${food}.`,
        ],
        deltas: {},
        realScienceBox: dayDef.realScienceBox,
        inGameRuleBox: dayDef.inGameRuleBox,
        quickQuestion: dayDef.quickQuestion,
        quickQuestionAnswered: false,
        miniGamePlayed: true,
        miniGameSucceeded: false,
        miniGameFactLine: DAY10_LAUNCH_MINIGAME.astronautFactLine,
        actionStarEarned: false,
        noSystemBelow30,
        dayStars: 1,
        triageAutoSaved: false,
        moodZeroTriggered: false,
        failReason: 'MISSED_LAUNCH',
      },
    };
  }

  const allFourAbove40 =
    power > 40 && airWater > 40 && radiation > 40 && food > 40;
  const tier =
    !state.crewHurt && science > 100 && allFourAbove40 ? 'GOLD' : 'SILVER';

  const summaryLines = ['All four cat astronauts blasted safely off the Moon before sunset!'];
  if (tier === 'GOLD') {
    summaryLines.push(
      `Everyone is healthy, Science reached ${science} (>100), and all 4 base systems stayed above 40!`
    );
  } else if (state.crewHurt) {
    summaryLines.push('Everyone returned home, though a crewmate was hurt on an EVA.');
  } else if (science <= 100) {
    summaryLines.push(`You launched safely! Reach over 100 Science (now ${science}) for Gold.`);
  } else {
    summaryLines.push('You launched safely! Keep all four systems above 40 at launch for Gold.');
  }

  const dayStars = computeDayStars(true, noSystemBelow30, false);

  return {
    ...state,
    failReason: null,
    endingTier: tier,
    dayStarsByDay: { ...state.dayStarsByDay, 10: dayStars },
    lastResult: {
      day: 10,
      headline: tier === 'GOLD' ? 'Gold Mission Liftoff!' : 'Silver Mission Liftoff!',
      summaryLines,
      deltas: {},
      realScienceBox: dayDef.realScienceBox,
      inGameRuleBox: dayDef.inGameRuleBox,
      quickQuestion: dayDef.quickQuestion,
      quickQuestionAnswered: false,
      miniGamePlayed: true,
      miniGameSucceeded: true,
      miniGameFactLine: DAY10_LAUNCH_MINIGAME.astronautFactLine,
      actionStarEarned: true,
      noSystemBelow30,
      dayStars,
      triageAutoSaved: false,
      moodZeroTriggered: false,
      endingTier: tier,
    },
  };
}

/**
 * Resolves a daily choice (or Berry's Deep Scan day), applies mini-game scaling
 * (full reward on success, halved positive numbers & same costs on fail/skip),
 * applies bonus events, night drain, Mood == 0 penalty, and fail checks.
 */
export function resolveDayTurn(
  state: GameState,
  choice: DayChoice | null,
  options?: {
    stormLevel?: StormLevel;
    nasaInfo?: NasaMissionBundle;
    rng?: () => number;
    usedDeepScan?: boolean;
    miniGameSucceeded?: boolean;
  }
): GameState {
  const rng = options?.rng ?? Math.random;
  const nasaInfo = options?.nasaInfo;
  const stormLevel = options?.stormLevel ?? nasaInfo?.stormLevel ?? 1;
  const usedDeepScan = Boolean(options?.usedDeepScan);
  const hasMiniGame = Boolean(choice?.miniGame);
  const miniGameSucceeded = hasMiniGame ? options?.miniGameSucceeded !== false : true;
  const dayDef = MISSION_DAYS.find((d) => d.day === state.day)!;

  const startMeters: Meters = { ...state.meters };
  const working: Meters = { ...state.meters };
  const summaryLines: string[] = [];
  let crewHurt = state.crewHurt;
  let triageUsed = state.triageUsed;
  let triageAutoSaved = false;
  let extraLaunchPowerRequired = state.extraLaunchPowerRequired;
  let launchReqRevealed = state.launchReqRevealed;
  const nextPendingEffects = [...state.pendingTomorrowEffects];
  const newTomorrowEffects: typeof nextPendingEffects = [];

  let didEvaAction = false;

  if (usedDeepScan) {
    summaryLines.push(
      'Berry spent all day running Deep Scan while the crew stayed safe inside.'
    );
  } else if (choice) {
    const eff =
      hasMiniGame && !miniGameSucceeded
        ? halveChoiceEffectForMiss(choice.effect)
        : choice.effect;

    const radDelta = eff.stormRadiationMultiplier
      ? eff.stormRadiationMultiplier * stormLevel
      : eff.radiation ?? 0;

    working.power = clampMeter(working.power + (eff.power ?? 0));
    working.airWater = clampMeter(working.airWater + (eff.airWater ?? 0));
    working.radiation = clampMeter(working.radiation + radDelta);
    working.food = clampMeter(working.food + (eff.food ?? 0));
    working.mood = clampMeter(working.mood + (eff.mood ?? 0));
    working.science = Math.max(0, working.science + (eff.science ?? 0));

    if (hasMiniGame) {
      summaryLines.push(
        miniGameSucceeded
          ? `Action (${choice.miniGame!.title} won!): ${choice.label}.`
          : `Action (${choice.miniGame!.title} skipped/missed — positive boosts halved): ${choice.label}.`
      );
    } else {
      summaryLines.push(`Action: ${choice.label}.`);
    }

    if (eff.tomorrowDelta) {
      newTomorrowEffects.push(eff.tomorrowDelta);
    }

    if (eff.riskRadiationIfNoTriage) {
      didEvaAction = true;
      if (!triageUsed) {
        triageUsed = true;
        triageAutoSaved = true;
        summaryLines.push(
          'Nikita caught mild radiation on the spacewalk, and used her 1-time Triage kit to stay healthy!'
        );
      } else {
        crewHurt = true;
        summaryLines.push(
          'Nikita caught mild radiation sickness on the spacewalk because her Triage kit was already used!'
        );
      }
    }

    if (eff.revealsLaunchReq) {
      launchReqRevealed = true;
      summaryLines.push(
        `Earth confirmed Day 10 launch needs: ${50 + extraLaunchPowerRequired} Power, 30 Air & Water, 30 Radiation, and 20 Food.`
      );
    }

    if (eff.hiddenExtraLaunchPower) {
      extraLaunchPowerRequired += eff.hiddenExtraLaunchPower;
    }
  }

  // Apply random Bonus Event if scheduled for today
  const bonusEvent = getBonusEventForDay(state, state.day);
  if (bonusEvent) {
    if (bonusEvent.deltas.power)
      working.power = clampMeter(working.power + bonusEvent.deltas.power);
    if (bonusEvent.deltas.airWater)
      working.airWater = clampMeter(working.airWater + bonusEvent.deltas.airWater);
    if (bonusEvent.deltas.radiation)
      working.radiation = clampMeter(working.radiation + bonusEvent.deltas.radiation);
    if (bonusEvent.deltas.food)
      working.food = clampMeter(working.food + bonusEvent.deltas.food);
    if (bonusEvent.deltas.mood)
      working.mood = clampMeter(working.mood + bonusEvent.deltas.mood);
    if (bonusEvent.deltas.science)
      working.science = Math.max(0, working.science + bonusEvent.deltas.science);
    summaryLines.push(`Bonus Event (${bonusEvent.title}): ${bonusEvent.description}`);
  }

  const isStormOrEvaRisk =
    Boolean(dayDef.isStormDay) || (Boolean(dayDef.isEvaDay) && didEvaAction);

  // Check Radiation=0 during storm or spacewalk BEFORE night drain
  let failReason: FailReason | null = null;
  if (isStormOrEvaRisk && working.radiation <= 0) {
    if (!triageUsed) {
      triageUsed = true;
      triageAutoSaved = true;
      working.radiation = 15;
      summaryLines.push(
        'Radiation Protection hit 0! Nikita used her 1-time Triage kit to shield the crew (Radiation restored to 15).'
      );
    } else {
      failReason = 'RADIATION_EMERGENCY';
    }
  }

  // End-of-day resource drain: Power -5, Air & Water -5, Food -5, Radiation -2. Mood -2 if any system < 30.
  if (!failReason && state.day < 10) {
    const anyUnder30 =
      working.power < 30 ||
      working.airWater < 30 ||
      working.radiation < 30 ||
      working.food < 30;

    working.power = clampMeter(working.power - 5);
    working.airWater = clampMeter(working.airWater - 5);
    working.food = clampMeter(working.food - 5);
    working.radiation = clampMeter(working.radiation - 2);

    if (anyUnder30) {
      working.mood = clampMeter(working.mood - 2);
      summaryLines.push(
        'Daily upkeep: Power -5, Air & Water -5, Food -5, Radiation -2 (Mood -2 from low system).'
      );
    } else {
      summaryLines.push(
        'Daily upkeep: Power -5, Air & Water -5, Food -5, Radiation -2.'
      );
    }
  }

  // Mood == 0 penalty
  let moodZeroTriggered = false;
  let moodPenaltyMeter: BaseSystemKey | undefined;
  let refusedCrewNextDay: CrewId | undefined;
  if (!failReason && working.mood <= 0) {
    moodZeroTriggered = true;
    const systemChoices: BaseSystemKey[] = ['power', 'airWater', 'radiation', 'food'];
    moodPenaltyMeter = systemChoices[Math.floor(rng() * systemChoices.length)];
    working[moodPenaltyMeter] = clampMeter(working[moodPenaltyMeter] - 30);
    working.mood = 15;

    const crewChoices: CrewId[] = ['capt', 'amy', 'berry', 'nikita'];
    refusedCrewNextDay = crewChoices[Math.floor(rng() * crewChoices.length)];
    summaryLines.push(
      `Crew Mood hit 0! Stress caused ${METER_DISPLAY_NAME[moodPenaltyMeter]} -30, and one crewmate will rest tomorrow.`
    );
  }

  // Final fail conditions check
  if (!failReason) {
    if (isStormOrEvaRisk && working.radiation <= 0) {
      if (!triageUsed) {
        triageUsed = true;
        triageAutoSaved = true;
        working.radiation = 15;
        summaryLines.push(
          'Radiation Protection hit 0! Nikita used Triage to save the crew (Radiation 15).'
        );
      } else {
        failReason = 'RADIATION_EMERGENCY';
      }
    } else {
      failReason = detectSystemFail(working, { isStormOrEva: isStormOrEvaRisk });
    }
  }

  // Berry Deep Scan preview for tomorrow
  let deepScanPreview: DayResultSummary['deepScanPreview'];
  if (usedDeepScan && state.day < 10) {
    const nextDef = MISSION_DAYS.find((d) => d.day === state.day + 1);
    if (nextDef) {
      deepScanPreview = {
        nextDay: nextDef.day,
        title: nextDef.title,
        story: nextDef.story,
        hiddenRisk: nextDef.hiddenRiskSummary,
      };
    }
  }

  // Optional NASA data box for Day 3 & Day 8
  let nasaDataBox: DayResultSummary['nasaDataBox'];
  if (dayDef.day === 3) {
    const statusLabel: 'LIVE' | 'ARCHIVED EXAMPLE (not live)' = nasaInfo?.isLive
      ? 'LIVE'
      : 'ARCHIVED EXAMPLE (not live)';
    const flareStr = nasaInfo?.flareClass ?? 'M3.2';
    const cmeStr = nasaInfo?.cmeSpeedKmS
      ? `CME speed: ${nasaInfo.cmeSpeedKmS} km/s. CMEs take 1 to 3 days to cross space.`
      : 'No fast CME cloud active now. CMEs take 1 to 3 days to cross space.';
    nasaDataBox = {
      statusLabel,
      headline: `NASA DONKI Solar Flare ${flareStr} → Storm Level ${stormLevel}`,
      detail: cmeStr,
    };
  } else if (dayDef.day === 8) {
    const statusLabel: 'LIVE' | 'ARCHIVED EXAMPLE (not live)' = nasaInfo?.isLive
      ? 'LIVE'
      : 'ARCHIVED EXAMPLE (not live)';
    const sepCount = nasaInfo?.sepCount ?? 2;
    const win = nasaInfo?.windowDays ?? 30;
    nasaDataBox = {
      statusLabel,
      headline: `NASA DONKI Storm Level ${stormLevel} · ${sepCount} Recent SEP Events`,
      detail: `Over the last ${win} days, NASA recorded ${sepCount} Solar Energetic Particle events.`,
    };
  }

  const deltas: DayResultSummary['deltas'] = {
    power: working.power - startMeters.power,
    airWater: working.airWater - startMeters.airWater,
    radiation: working.radiation - startMeters.radiation,
    food: working.food - startMeters.food,
    mood: working.mood - startMeters.mood,
    science: working.science - startMeters.science,
  };

  const noSystemBelow30 =
    working.power >= 30 &&
    working.airWater >= 30 &&
    working.radiation >= 30 &&
    working.food >= 30;
  const actionStarEarned = hasMiniGame
    ? miniGameSucceeded
    : !failReason && !moodZeroTriggered;
  const dayStars = computeDayStars(actionStarEarned, noSystemBelow30, false);

  const result: DayResultSummary = {
    day: state.day,
    headline: failReason
      ? 'Emergency Alert!'
      : usedDeepScan
        ? `Day ${state.day} Deep Scan Complete`
        : `Day ${state.day} Complete`,
    summaryLines,
    deltas,
    realScienceBox: dayDef.realScienceBox,
    inGameRuleBox: dayDef.inGameRuleBox,
    nasaDataBox,
    quickQuestion: dayDef.quickQuestion,
    quickQuestionAnswered: false,
    miniGamePlayed: hasMiniGame,
    miniGameSucceeded: hasMiniGame ? miniGameSucceeded : undefined,
    miniGameFactLine: choice?.miniGame?.astronautFactLine,
    actionStarEarned,
    noSystemBelow30,
    dayStars,
    triageAutoSaved,
    moodZeroTriggered,
    moodPenaltyMeter,
    refusedCrewNextDay,
    revealedLaunchReq: launchReqRevealed && choice?.effect.revealsLaunchReq,
    deepScanPreview,
    bonusEventApplied: bonusEvent ?? undefined,
    failReason: failReason ?? undefined,
  };

  return {
    ...state,
    meters: working,
    triageUsed,
    crewHurt,
    extraLaunchPowerRequired,
    launchReqRevealed,
    pendingTomorrowEffects: [...nextPendingEffects, ...newTomorrowEffects],
    refusedAbilityToday: refusedCrewNextDay ?? null,
    deepScanRevealedForDay: usedDeepScan ? state.day + 1 : state.deepScanRevealedForDay,
    dayStarsByDay: { ...state.dayStarsByDay, [state.day]: dayStars },
    failReason,
    lastResult: result,
  };
}

/**
 * Handles tapping one of the 3 answers in the Result screen's Quick Question.
 * Right answer gives +5 Science, unlocks that day's Mission Patch badge, and updates Day Stars.
 * Wrong answer gives no penalty.
 */
export function answerResultQuickQuestion(
  state: GameState,
  selectedIndex: 0 | 1 | 2
): { nextState: GameState; isCorrect: boolean } {
  if (!state.lastResult || state.lastResult.quickQuestionAnswered) {
    return {
      nextState: state,
      isCorrect: Boolean(state.lastResult?.quickQuestionCorrect),
    };
  }

  const isCorrect = selectedIndex === state.lastResult.quickQuestion.correctIndex;
  const scienceGain = isCorrect ? 5 : 0;
  const updatedStars = computeDayStars(
    state.lastResult.actionStarEarned,
    state.lastResult.noSystemBelow30,
    isCorrect
  );

  const nextPatchDays =
    isCorrect && !state.patchEarnedDays.includes(state.lastResult.day)
      ? [...state.patchEarnedDays, state.lastResult.day]
      : state.patchEarnedDays;

  if (isCorrect) {
    saveEarnedMissionPatch(state.lastResult.day);
  }

  return {
    isCorrect,
    nextState: {
      ...state,
      meters: {
        ...state.meters,
        science: state.meters.science + scienceGain,
      },
      patchEarnedDays: nextPatchDays,
      dayStarsByDay: {
        ...state.dayStarsByDay,
        [state.lastResult.day]: updatedStars,
      },
      lastResult: {
        ...state.lastResult,
        quickQuestionAnswered: true,
        quickQuestionCorrect: isCorrect,
        dayStars: updatedStars,
        deltas: isCorrect
          ? {
              ...state.lastResult.deltas,
              science: (state.lastResult.deltas.science ?? 0) + scienceGain,
            }
          : state.lastResult.deltas,
      },
    },
  };
}

/**
 * Advances from the Result screen to the next day (Day + 1),
 * ticking cooldowns, applying any scheduled tomorrow penalties,
 * and checking if delayed penalties trigger a fail condition.
 */
export function advanceToNextDay(state: GameState): GameState {
  const nextDay = Math.min(10, state.day + 1);
  const working: Meters = { ...state.meters };
  const morningNotes: string[] = [];

  for (const eff of state.pendingTomorrowEffects) {
    working[eff.meter] = clampMeter(working[eff.meter] + eff.delta);
    morningNotes.push(
      `${eff.source}: ${METER_DISPLAY_NAME[eff.meter]} ${eff.delta}`
    );
  }

  const failReason = detectSystemFail(working, { isStormOrEva: false });

  const nextCooldowns: Record<CrewId, number> = {
    capt: Math.max(0, state.cooldowns.capt - 1),
    amy: Math.max(0, state.cooldowns.amy - 1),
    berry: Math.max(0, state.cooldowns.berry - 1),
    nikita: state.cooldowns.nikita,
  };

  return {
    ...state,
    day: nextDay,
    meters: working,
    cooldowns: nextCooldowns,
    abilityUsedToday: false,
    pendingTomorrowEffects: [],
    failReason,
    lastResult:
      failReason && state.lastResult
        ? {
            ...state.lastResult,
            summaryLines: [...state.lastResult.summaryLines, ...morningNotes],
            failReason,
          }
        : null,
  };
}

/**
 * Safe localStorage helpers wrapped in try/catch.
 */
export function loadEarnedMissionPatches(): number[] {
  try {
    const raw = localStorage.getItem(MISSION_PATCHES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((d) => typeof d === 'number' && d >= 1 && d <= 10)
      : [];
  } catch {
    return [];
  }
}

export function saveEarnedMissionPatch(day: number): number[] {
  const existing = loadEarnedMissionPatches();
  if (existing.includes(day)) return existing;
  const updated = [...existing, day].sort((a, b) => a - b);
  try {
    localStorage.setItem(MISSION_PATCHES_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
  return updated;
}

export function saveGameProgress(state: GameState): void {
  try {
    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota / private mode errors
  }
}

export function loadGameProgress(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (
      !parsed?.meters ||
      typeof parsed.meters.airWater !== 'number' ||
      typeof parsed.meters.radiation !== 'number' ||
      typeof parsed.meters.food !== 'number'
    ) {
      return null;
    }
    return {
      ...parsed,
      patchEarnedDays: Array.isArray(parsed.patchEarnedDays)
        ? parsed.patchEarnedDays
        : [],
      dayStarsByDay: parsed.dayStarsByDay ?? {},
    };
  } catch {
    return null;
  }
}

export function saveCheckpoint(state: GameState): void {
  try {
    const snapshot: CheckpointSnapshot = {
      savedAtDay: state.day,
      state,
    };
    localStorage.setItem(CHECKPOINT_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore storage errors
  }
}

export function loadCheckpoint(): CheckpointSnapshot | null {
  try {
    const raw = localStorage.getItem(CHECKPOINT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CheckpointSnapshot;
    if (
      !parsed?.state?.meters ||
      typeof parsed.state.meters.airWater !== 'number'
    ) {
      return null;
    }
    return {
      savedAtDay: parsed.savedAtDay,
      state: {
        ...parsed.state,
        patchEarnedDays: Array.isArray(parsed.state.patchEarnedDays)
          ? parsed.state.patchEarnedDays
          : [],
        dayStarsByDay: parsed.state.dayStarsByDay ?? {},
      },
    };
  } catch {
    return null;
  }
}

export function clearSavedMission(): void {
  try {
    localStorage.removeItem(SAVE_STORAGE_KEY);
    localStorage.removeItem(CHECKPOINT_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}
