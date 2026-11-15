import { CrewId, StormLevel } from './types';

export type BuildingType =
  | 'command_dome'
  | 'solar_array'
  | 'oxygen_scrubber'
  | 'laser_turret'
  | 'ice_extractor'
  | 'rover_garage';

export interface BuildingBlueprint {
  type: BuildingType;
  name: string;
  shortName: string;
  description: string;
  baseCost: number;
  maxCount: number;
  accentColor: string;
  produces: string;
}

export interface BaseBuilding {
  id: string;
  type: BuildingType;
  col: number;
  row: number;
  level: number;
  hp: number;
  maxHp: number;
  storedYield: number;
}

export interface CrewConsciousnessState {
  crewId: CrewId;
  innerThought: string;
  moodState: 'excited' | 'focused' | 'worried' | 'playful' | 'heroic';
  lastUpdatedAt: number;
}

export interface BaseState {
  moonRocks: number;
  wavesCleared: number;
  totalCollected: number;
  buildings: BaseBuilding[];
  thoughts: Record<CrewId, CrewConsciousnessState>;
}

export type RaiderKind = 'meteor_swarm' | 'plasma_orbiter' | 'dust_golem';

export interface RaidWavePlan {
  waveNumber: number;
  meteorCount: number;
  orbiterCount: number;
  golemCount: number;
  enemyHpMultiplier: number;
  enemySpeedMultiplier: number;
}

export const BASE_GRID_COLS = 6;
export const BASE_GRID_ROWS = 4;

export const BUILDING_BLUEPRINTS: Record<BuildingType, BuildingBlueprint> = {
  command_dome: {
    type: 'command_dome',
    name: 'Command Dome',
    shortName: 'HQ Dome',
    description: 'Heart of your Moon Base. Upgrading unlocks stronger defenses!',
    baseCost: 85,
    maxCount: 1,
    accentColor: '#F59E0B',
    produces: '+Max Base Level & Mood Aura',
  },
  solar_array: {
    type: 'solar_array',
    name: 'Solar Array',
    shortName: 'Solar',
    description: 'Harvests sunlight into Power and Moon Rocks.',
    baseCost: 45,
    maxCount: 4,
    accentColor: '#FACC15',
    produces: '+Power & +Moon Rocks',
  },
  oxygen_scrubber: {
    type: 'oxygen_scrubber',
    name: 'Oxygen Dome',
    shortName: 'O2 Dome',
    description: 'Recycles crisp breathable air and restores Oxygen.',
    baseCost: 50,
    maxCount: 3,
    accentColor: '#38BDF8',
    produces: '+Oxygen & +Moon Rocks',
  },
  laser_turret: {
    type: 'laser_turret',
    name: 'Laser Shield Turret',
    shortName: 'Turret',
    description: 'Zaps incoming micrometeorites & solar flares during raids!',
    baseCost: 60,
    maxCount: 5,
    accentColor: '#34D399',
    produces: 'Auto-Defends Base Raids',
  },
  ice_extractor: {
    type: 'ice_extractor',
    name: 'Ice Extractor',
    shortName: 'Ice Drill',
    description: 'Mines shiny crater ice for Moon Rocks and Science points.',
    baseCost: 55,
    maxCount: 3,
    accentColor: '#A78BFA',
    produces: '+Moon Rocks & +Science',
  },
  rover_garage: {
    type: 'rover_garage',
    name: 'Rover Garage',
    shortName: 'Rover',
    description: 'Deploys a Moon rover that gathers Science crystals!',
    baseCost: 70,
    maxCount: 2,
    accentColor: '#FB7185',
    produces: '+Science & +Shields',
  },
};

export const INITIAL_CREW_THOUGHTS: Record<CrewId, CrewConsciousnessState> = {
  capt: {
    crewId: 'capt',
    innerThought: 'Ready to command our lunar outpost!',
    moodState: 'heroic',
    lastUpdatedAt: 0,
  },
  amy: {
    crewId: 'amy',
    innerThought: 'Let us upgrade those Solar Arrays!',
    moodState: 'excited',
    lastUpdatedAt: 0,
  },
  berry: {
    crewId: 'berry',
    innerThought: 'Checking craters for frozen water ice...',
    moodState: 'focused',
    lastUpdatedAt: 0,
  },
  nikita: {
    crewId: 'nikita',
    innerThought: 'Spacesuits sealed and med-kit packed!',
    moodState: 'playful',
    lastUpdatedAt: 0,
  },
};

export function getBuildingMaxHp(type: BuildingType, level: number): number {
  const baseHp = type === 'command_dome' ? 280 : type === 'laser_turret' ? 160 : 130;
  return baseHp + (level - 1) * 55;
}

export function getUpgradeCost(type: BuildingType, currentLevel: number): number {
  const bp = BUILDING_BLUEPRINTS[type];
  return Math.round(bp.baseCost * Math.pow(1.45, currentLevel));
}

export function getBuildCost(type: BuildingType): number {
  return BUILDING_BLUEPRINTS[type].baseCost;
}

export function createInitialBaseState(): BaseState {
  const starter: Array<{ id: string; type: BuildingType; col: number; row: number; yieldStart: number }> = [
    { id: 'b_hq', type: 'command_dome', col: 2, row: 1, yieldStart: 12 },
    { id: 'b_solar_1', type: 'solar_array', col: 1, row: 1, yieldStart: 18 },
    { id: 'b_o2_1', type: 'oxygen_scrubber', col: 3, row: 1, yieldStart: 16 },
    { id: 'b_turret_1', type: 'laser_turret', col: 2, row: 2, yieldStart: 0 },
    { id: 'b_ice_1', type: 'ice_extractor', col: 4, row: 2, yieldStart: 20 },
  ];

  return {
    moonRocks: 150,
    wavesCleared: 0,
    totalCollected: 0,
    buildings: starter.map((item) => {
      const maxHp = getBuildingMaxHp(item.type, 1);
      return {
        id: item.id,
        type: item.type,
        col: item.col,
        row: item.row,
        level: 1,
        hp: maxHp,
        maxHp,
        storedYield: item.yieldStart,
      };
    }),
    thoughts: { ...INITIAL_CREW_THOUGHTS },
  };
}

export function getCommandDomeLevel(base: BaseState): number {
  const hq = base.buildings.find((b) => b.type === 'command_dome');
  return hq ? hq.level : 1;
}

export function findOpenPad(base: BaseState): { col: number; row: number } | null {
  const occupied = new Set(base.buildings.map((b) => `${b.col},${b.row}`));
  // Prefer inner-ring tiles first so new structures sit neatly near Command Dome
  const preferred: Array<[number, number]> = [
    [1, 2],
    [3, 2],
    [4, 1],
    [0, 1],
    [2, 0],
    [1, 0],
    [3, 0],
    [0, 2],
    [5, 1],
    [5, 2],
    [2, 3],
    [1, 3],
    [3, 3],
    [4, 0],
    [0, 0],
    [4, 3],
    [0, 3],
    [5, 0],
    [5, 3],
  ];
  for (const [col, row] of preferred) {
    if (!occupied.has(`${col},${row}`)) return { col, row };
  }
  return null;
}

export function buildStructure(
  base: BaseState,
  type: BuildingType,
  targetPad?: { col: number; row: number }
): { nextBase: BaseState; ok: boolean; message: string; scienceGain: number } {
  const bp = BUILDING_BLUEPRINTS[type];
  const existingCount = base.buildings.filter((b) => b.type === type).length;
  if (existingCount >= bp.maxCount) {
    return {
      nextBase: base,
      ok: false,
      message: `Max ${bp.maxCount} ${bp.name}(s) built! Tap one to upgrade it.`,
      scienceGain: 0,
    };
  }

  const cost = getBuildCost(type);
  if (base.moonRocks < cost) {
    return {
      nextBase: base,
      ok: false,
      message: `Need ${cost} Moon Rocks to build ${bp.name}! Collect bubbles or defend a raid.`,
      scienceGain: 0,
    };
  }

  const occupied = new Set(base.buildings.map((b) => `${b.col},${b.row}`));
  const pad =
    targetPad && !occupied.has(`${targetPad.col},${targetPad.row}`)
      ? targetPad
      : findOpenPad(base);

  if (!pad) {
    return {
      nextBase: base,
      ok: false,
      message: 'All lunar crater pads are full!',
      scienceGain: 0,
    };
  }

  const maxHp = getBuildingMaxHp(type, 1);
  const newBuilding: BaseBuilding = {
    id: `b_${type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type,
    col: pad.col,
    row: pad.row,
    level: 1,
    hp: maxHp,
    maxHp,
    storedYield: type === 'laser_turret' ? 0 : 10,
  };

  return {
    nextBase: {
      ...base,
      moonRocks: base.moonRocks - cost,
      buildings: [...base.buildings, newBuilding],
    },
    ok: true,
    message: `Built ${bp.name} Lv.1!`,
    scienceGain: type === 'rover_garage' || type === 'ice_extractor' ? 5 : 2,
  };
}

export function upgradeBuilding(
  base: BaseState,
  buildingId: string
): { nextBase: BaseState; ok: boolean; message: string; scienceGain: number } {
  const target = base.buildings.find((b) => b.id === buildingId);
  if (!target) {
    return { nextBase: base, ok: false, message: 'Structure not found.', scienceGain: 0 };
  }
  if (target.level >= 5) {
    return { nextBase: base, ok: false, message: 'Already at Max Level 5!', scienceGain: 0 };
  }

  const hqLevel = getCommandDomeLevel(base);
  if (target.type !== 'command_dome' && target.level >= hqLevel + 1) {
    return {
      nextBase: base,
      ok: false,
      message: `Upgrade Command Dome to Lv.${hqLevel + 1} first!`,
      scienceGain: 0,
    };
  }

  const cost = getUpgradeCost(target.type, target.level);
  if (base.moonRocks < cost) {
    return {
      nextBase: base,
      ok: false,
      message: `Need ${cost} Moon Rocks to upgrade!`,
      scienceGain: 0,
    };
  }

  const nextLevel = target.level + 1;
  const nextMaxHp = getBuildingMaxHp(target.type, nextLevel);

  return {
    nextBase: {
      ...base,
      moonRocks: base.moonRocks - cost,
      buildings: base.buildings.map((b) =>
        b.id === buildingId
          ? { ...b, level: nextLevel, maxHp: nextMaxHp, hp: nextMaxHp }
          : b
      ),
    },
    ok: true,
    message: `${BUILDING_BLUEPRINTS[target.type].name} upgraded to Lv.${nextLevel}!`,
    scienceGain: 4 * nextLevel,
  };
}

export function harvestBuildingYield(
  base: BaseState,
  buildingId: string
): {
  nextBase: BaseState;
  rocksGained: number;
  powerGain: number;
  oxygenGain: number;
  shieldsGain: number;
  scienceGain: number;
} {
  const b = base.buildings.find((item) => item.id === buildingId);
  if (!b || b.storedYield <= 0) {
    return {
      nextBase: base,
      rocksGained: 0,
      powerGain: 0,
      oxygenGain: 0,
      shieldsGain: 0,
      scienceGain: 0,
    };
  }

  const amount = Math.round(b.storedYield);
  let rocksGained = amount;
  let powerGain = 0;
  let oxygenGain = 0;
  let shieldsGain = 0;
  let scienceGain = 0;

  if (b.type === 'solar_array') powerGain = Math.max(2, Math.round(amount * 0.25));
  if (b.type === 'oxygen_scrubber') oxygenGain = Math.max(2, Math.round(amount * 0.25));
  if (b.type === 'ice_extractor') {
    rocksGained = Math.round(amount * 1.3);
    scienceGain = Math.max(2, Math.round(amount * 0.2));
  }
  if (b.type === 'rover_garage') {
    scienceGain = Math.max(3, Math.round(amount * 0.35));
    shieldsGain = 2;
  }
  if (b.type === 'command_dome') {
    rocksGained = amount;
    shieldsGain = 2;
  }

  return {
    nextBase: {
      ...base,
      moonRocks: base.moonRocks + rocksGained,
      totalCollected: base.totalCollected + rocksGained,
      buildings: base.buildings.map((item) =>
        item.id === buildingId ? { ...item, storedYield: 0 } : item
      ),
    },
    rocksGained,
    powerGain,
    oxygenGain,
    shieldsGain,
    scienceGain,
  };
}

export function tickBaseProduction(base: BaseState, elapsedSeconds: number): BaseState {
  if (elapsedSeconds <= 0) return base;
  return {
    ...base,
    buildings: base.buildings.map((b) => {
      if (b.type === 'laser_turret') return b;
      const ratePerSec = 0.8 + b.level * 0.45;
      const cap = 25 + b.level * 12;
      return {
        ...b,
        storedYield: Math.min(cap, b.storedYield + ratePerSec * elapsedSeconds),
      };
    }),
  };
}

export function repairAllStructures(base: BaseState): {
  nextBase: BaseState;
  ok: boolean;
  message: string;
} {
  const damaged = base.buildings.filter((b) => b.hp < b.maxHp);
  if (damaged.length === 0) {
    return { nextBase: base, ok: false, message: 'All Moon Base structures are already at 100% HP!' };
  }
  const cost = Math.min(35, damaged.length * 10);
  if (base.moonRocks < cost) {
    return { nextBase: base, ok: false, message: `Need ${cost} Moon Rocks to repair damaged walls.` };
  }
  return {
    nextBase: {
      ...base,
      moonRocks: base.moonRocks - cost,
      buildings: base.buildings.map((b) => ({ ...b, hp: b.maxHp })),
    },
    ok: true,
    message: `Amy welded every dome & turret back to 100% HP (-${cost} Moon Rocks)!`,
  };
}

export function computeRaidWavePlan(
  day: number,
  wavesCleared: number,
  stormLevel: StormLevel
): RaidWavePlan {
  const waveNumber = wavesCleared + 1;
  // Opening wave is approachable so kids learn defense quickly, then scales across 3 knobs
  const meteorCount = 3 + Math.min(7, waveNumber + Math.floor(day / 3));
  const orbiterCount = waveNumber >= 1 ? Math.min(4, 1 + Math.floor(waveNumber / 2)) : 0;
  const golemCount = waveNumber >= 2 || stormLevel >= 2 ? Math.min(3, Math.ceil(waveNumber / 2)) : 1;

  return {
    waveNumber,
    meteorCount,
    orbiterCount,
    golemCount,
    enemyHpMultiplier: 1 + (waveNumber - 1) * 0.16 + (stormLevel - 1) * 0.12,
    enemySpeedMultiplier: 1 + Math.min(0.45, (waveNumber - 1) * 0.06),
  };
}

export function computeRaidVictoryRewards(waveNumber: number, remainingHpRatio: number) {
  const clampedRatio = Math.max(0.25, Math.min(1, remainingHpRatio));
  const moonRocks = Math.round((45 + waveNumber * 18) * (0.7 + 0.3 * clampedRatio));
  const science = Math.round(6 + waveNumber * 2 + clampedRatio * 4);
  const moodBoost = clampedRatio >= 0.7 ? 5 : 2;
  return { moonRocks, science, moodBoost };
}
