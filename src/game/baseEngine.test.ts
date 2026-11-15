import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStructure,
  computeRaidVictoryRewards,
  computeRaidWavePlan,
  createInitialBaseState,
  harvestBuildingYield,
  repairAllStructures,
  tickBaseProduction,
  upgradeBuilding,
} from './baseEngine';

test('initial base starts with 5 iconic Moon Base buildings and starter Moon Rocks', () => {
  const base = createInitialBaseState();
  assert.equal(base.buildings.length, 5);
  assert.equal(base.moonRocks, 150);
  assert.ok(base.buildings.some((b) => b.type === 'command_dome'));
  assert.ok(base.buildings.some((b) => b.type === 'laser_turret'));
});

test('building a Rover Garage deducts Moon Rocks and adds structure + Science', () => {
  const base = createInitialBaseState();
  const res = buildStructure(base, 'rover_garage');
  assert.equal(res.ok, true);
  assert.equal(res.nextBase.buildings.length, 6);
  assert.equal(res.nextBase.moonRocks, 80);
  assert.equal(res.scienceGain, 5);
});

test('upgrading Command Dome increases HP and gates higher building upgrades', () => {
  const base = createInitialBaseState();
  // Upgrade HQ Lv1 -> Lv2 (cost: 85 * 1.45 = 123)
  const up = upgradeBuilding(base, 'b_hq');
  assert.equal(up.ok, true);
  const hq = up.nextBase.buildings.find((b) => b.id === 'b_hq')!;
  assert.equal(hq.level, 2);
  assert.ok(hq.maxHp > 280);
});

test('production tick and harvest yield Moon Rocks and survival resource bonuses', () => {
  const base = createInitialBaseState();
  const ticked = tickBaseProduction(base, 5);
  const solar = ticked.buildings.find((b) => b.id === 'b_solar_1')!;
  assert.ok(solar.storedYield > 18);

  const harvested = harvestBuildingYield(ticked, 'b_solar_1');
  assert.ok(harvested.rocksGained >= 20);
  assert.ok(harvested.powerGain >= 2);
  assert.equal(
    harvested.nextBase.buildings.find((b) => b.id === 'b_solar_1')!.storedYield,
    0
  );
});

test('repairAllStructures heals damaged structures and spends Moon Rocks', () => {
  const base = createInitialBaseState();
  const damagedBase = {
    ...base,
    buildings: base.buildings.map((b, i) => (i === 0 ? { ...b, hp: 50 } : b)),
  };
  const repaired = repairAllStructures(damagedBase);
  assert.equal(repaired.ok, true);
  assert.equal(
    repaired.nextBase.buildings[0].hp,
    repaired.nextBase.buildings[0].maxHp
  );
  assert.ok(repaired.nextBase.moonRocks < base.moonRocks);
});

test('raid wave planner scales across 3 enemy archetypes and computes rewards', () => {
  const w1 = computeRaidWavePlan(1, 0, 1);
  const w4 = computeRaidWavePlan(7, 3, 3);
  assert.ok(w1.meteorCount >= 3);
  assert.ok(w1.orbiterCount >= 1);
  assert.ok(w1.golemCount >= 1);
  assert.ok(w4.meteorCount > w1.meteorCount);
  assert.ok(w4.enemyHpMultiplier > w1.enemyHpMultiplier);

  const rewards = computeRaidVictoryRewards(2, 0.9);
  assert.ok(rewards.moonRocks > 40);
  assert.ok(rewards.science >= 8);
});
