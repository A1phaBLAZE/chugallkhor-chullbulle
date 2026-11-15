export type BaseSystemKey = 'power' | 'airWater' | 'radiation' | 'food';
export type MeterKey = BaseSystemKey | 'mood';

export interface Meters {
  power: number;
  airWater: number;
  radiation: number;
  food: number;
  mood: number;
  science: number;
}

export type CrewId = 'capt' | 'amy' | 'berry' | 'nikita';

export interface CrewMember {
  id: CrewId;
  name: string;
  role: string;
  avatar: string;
  abilityName: string;
  abilityShort: string;
  abilityDescription: string;
  cooldownDays: number;
  accentColor: string;
}

export interface MissionControlCardInfo {
  key: MeterKey;
  title: string;
  colorName: string;
  whatIsIt: string;
  whyCrewNeedsIt: string;
  realFact: string;
  sourceName: string;
}

export interface DelayedEffect {
  meter: MeterKey;
  delta: number;
  source: string;
}

export interface ChoiceEffect {
  power?: number;
  airWater?: number;
  radiation?: number;
  food?: number;
  mood?: number;
  science?: number;
  tomorrowDelta?: DelayedEffect;
  stormRadiationMultiplier?: number;
  riskRadiationIfNoTriage?: boolean;
  revealsLaunchReq?: boolean;
  hiddenExtraLaunchPower?: number;
}

export type MiniGameId =
  | 'wipe_dust'
  | 'pop_co2'
  | 'stack_tanks'
  | 'water_plants'
  | 'face_sun'
  | 'find_ice'
  | 'pedal_power'
  | 'spacewalk_dash'
  | 'point_antenna'
  | 'launch_checklist';

export interface MiniGameConfig {
  id: MiniGameId;
  title: string;
  howToPlay: string;
  durationSec: number;
  astronautFactLine: string;
}

export interface DayChoice {
  id: string;
  label: string;
  hint: string;
  hiddenHint?: string;
  miniGame?: MiniGameConfig;
  effect: ChoiceEffect;
}

export interface ScienceWord {
  term: string;
  definition: string;
}

export interface QuickQuestion {
  prompt: string;
  options: [string, string, string];
  correctIndex: 0 | 1 | 2;
  rightCheer: string;
  wrongHint: string;
}

export interface DayDefinition {
  day: number;
  title: string;
  focusSystem: BaseSystemKey | 'launch';
  photoQuery: string;
  story: string;
  didYouKnow: string;
  newWord?: ScienceWord;
  realScienceBox: string;
  inGameRuleBox: string;
  isStormDay?: boolean;
  isEvaDay?: boolean;
  hiddenRiskSummary: string;
  quickQuestion: QuickQuestion;
  choices: DayChoice[];
}

export interface BonusEvent {
  id: string;
  title: string;
  description: string;
  deltas: Partial<Record<MeterKey | 'science', number>>;
}

export type StormLevel = 1 | 2 | 3;

export interface NasaDayPhoto {
  day: number;
  query: string;
  imageUrl: string | null;
  caption: string;
  credit: string;
  isLive: boolean;
}

export interface NasaMissionBundle {
  isLive: boolean;
  sourceLabel: string;
  flareClass: string;
  flareDate: string;
  stormLevel: StormLevel;
  windowDays: number;
  cmeSpeedKmS: number | null;
  cmeDate: string | null;
  sepCount: number;
  dayPhotos: Record<number, NasaDayPhoto>;
  fetchedAt: number;
}

export type FailReason =
  | 'POWER_EMPTY'
  | 'AIR_WATER_EMPTY'
  | 'FOOD_EMPTY'
  | 'RADIATION_EMERGENCY'
  | 'MISSED_LAUNCH';

export interface FailDebriefInfo {
  reason: FailReason;
  title: string;
  subtitle: string;
  crewEncouragement: string;
  scienceReason: string;
  tip: string;
}

export type EndingTier = 'GOLD' | 'SILVER';

export type ScreenName =
  | 'SPLASH'
  | 'MENU'
  | 'CONTACTING_NASA'
  | 'ABOUT_SYSTEMS'
  | 'HOW_TO_PLAY'
  | 'CREW'
  | 'NASA_DATA'
  | 'INTRO_VIDEO'
  | 'CRISIS_CLIP'
  | 'DAY_TITLE'
  | 'PLAYING'
  | 'RESULT'
  | 'FAIL_VIDEO'
  | 'DEBRIEF'
  | 'ENDING';

export type MissionPatchIconKey =
  | 'brush'
  | 'bubble'
  | 'shield'
  | 'plant'
  | 'sun'
  | 'ice'
  | 'dumbbell'
  | 'helmet'
  | 'antenna'
  | 'rocket';

export interface MissionPatchBadge {
  day: number;
  title: string;
  icon: MissionPatchIconKey;
}

export interface DayResultSummary {
  day: number;
  headline: string;
  summaryLines: string[];
  deltas: Partial<Record<MeterKey | 'science', number>>;
  realScienceBox: string;
  inGameRuleBox: string;
  nasaDataBox?: {
    statusLabel: 'LIVE' | 'ARCHIVED EXAMPLE (not live)';
    headline: string;
    detail: string;
  };
  quickQuestion: QuickQuestion;
  quickQuestionAnswered: boolean;
  quickQuestionCorrect?: boolean;
  miniGamePlayed?: boolean;
  miniGameSucceeded?: boolean;
  miniGameFactLine?: string;
  actionStarEarned: boolean;
  noSystemBelow30: boolean;
  dayStars: 1 | 2 | 3;
  triageAutoSaved: boolean;
  moodZeroTriggered: boolean;
  moodPenaltyMeter?: BaseSystemKey;
  refusedCrewNextDay?: CrewId;
  revealedLaunchReq?: boolean;
  deepScanPreview?: {
    nextDay: number;
    title: string;
    story: string;
    hiddenRisk: string;
  };
  bonusEventApplied?: BonusEvent;
  failReason?: FailReason;
  endingTier?: EndingTier;
}

export interface GameState {
  day: number;
  meters: Meters;
  cooldowns: Record<CrewId, number>;
  triageUsed: boolean;
  abilityUsedToday: boolean;
  crewHurt: boolean;
  extraLaunchPowerRequired: number;
  launchReqRevealed: boolean;
  pendingTomorrowEffects: DelayedEffect[];
  refusedAbilityToday: CrewId | null;
  deepScanRevealedForDay: number | null;
  bonusEventsByDay: Record<number, string>;
  shuffledChoiceOrder: Record<number, string[]>;
  patchEarnedDays: number[];
  dayStarsByDay: Record<number, number>;
  seenWords: string[];
  lastResult: DayResultSummary | null;
  failReason: FailReason | null;
  endingTier: EndingTier | null;
}

export interface CheckpointSnapshot {
  savedAtDay: number;
  state: GameState;
}
