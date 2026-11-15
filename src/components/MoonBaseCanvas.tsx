import React, { useEffect, useRef } from 'react';
import {
  BASE_GRID_COLS,
  BASE_GRID_ROWS,
  BaseBuilding,
  BaseState,
  BUILDING_BLUEPRINTS,
  BuildingType,
  computeRaidVictoryRewards,
  computeRaidWavePlan,
  RaiderKind,
} from '../game/baseEngine';
import { CREW_MEMBERS } from '../game/gameData';
import { CrewId, StormLevel } from '../game/types';

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface Raider {
  id: number;
  kind: RaiderKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  speed: number;
  targetId: string;
  attackCooldown: number;
  windup: number;
  flashTimer: number;
  orbitAngle: number;
  koTimer: number;
}

interface Projectile {
  active: boolean;
  fromEnemy: boolean;
  x: number;
  y: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  damage: number;
}

interface CatWalker {
  crewId: CrewId;
  x: number;
  y: number;
  tx: number;
  ty: number;
  pauseTimer: number;
  bobPhase: number;
  accentColor: string;
}

export interface RaidCompleteSummary {
  won: boolean;
  waveNumber: number;
  moonRocks: number;
  science: number;
  moodBoost: number;
  damagedBuildings: Record<string, number>;
}

interface MoonBaseCanvasProps {
  day: number;
  stormLevel: StormLevel;
  baseState: BaseState;
  selectedBuildingId: string | null;
  buildModeType: BuildingType | null;
  raidTriggerNonce: number;
  isMuted: boolean;
  paused?: boolean;
  onSelectBuilding: (buildingId: string | null) => void;
  onHarvestBuilding: (buildingId: string) => void;
  onPlaceBuildingAtPad: (type: BuildingType, col: number, row: number) => void;
  onSelectCrew: (crewId: CrewId) => void;
  onRaidStateChange: (active: boolean, remainingCount: number) => void;
  onRaidComplete: (summary: RaidCompleteSummary) => void;
  onSoundEffect: (kind: 'laser' | 'harvest' | 'tap' | 'warning' | 'success') => void;
}

const PARTICLE_POOL_SIZE = 120;
const PROJECTILE_POOL_SIZE = 48;

export const MoonBaseCanvas: React.FC<MoonBaseCanvasProps> = ({
  day,
  stormLevel,
  baseState,
  selectedBuildingId,
  buildModeType,
  raidTriggerNonce,
  paused = false,
  onSelectBuilding,
  onHarvestBuilding,
  onPlaceBuildingAtPad,
  onSelectCrew,
  onRaidStateChange,
  onRaidComplete,
  onSoundEffect,
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Latest props stored in refs so RAF never restarts on React state changes
  const propsRef = useRef({
    day,
    stormLevel,
    baseState,
    selectedBuildingId,
    buildModeType,
    onSelectBuilding,
    onHarvestBuilding,
    onPlaceBuildingAtPad,
    onSelectCrew,
    onRaidStateChange,
    onRaidComplete,
    onSoundEffect,
  });
  propsRef.current = {
    day,
    stormLevel,
    baseState,
    selectedBuildingId,
    buildModeType,
    onSelectBuilding,
    onHarvestBuilding,
    onPlaceBuildingAtPad,
    onSelectCrew,
    onRaidStateChange,
    onRaidComplete,
    onSoundEffect,
  };

  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  // Preloaded cat images
  const imagesRef = useRef<Record<string, HTMLImageElement>>({});

  // Decoupled simulation state
  const simRef = useRef({
    width: 420,
    height: 460,
    time: 0,
    hitstop: 0,
    shakeTrauma: 0,
    raidActive: false,
    raidWaveNumber: 0,
    lastReportedRemaining: -1,
    raiders: [] as Raider[],
    buildingHpLocal: new Map<string, number>(),
    turretCooldowns: new Map<string, number>(),
    turretAngles: new Map<string, number>(),
    buildingFlash: new Map<string, number>(),
    roverX: 0,
    roverY: 0,
    roverAngle: 0,
    pulseCooldown: 0,
    gradCacheKey: '',
    bgCanvas: null as HTMLCanvasElement | null,
    skyGrad: null as CanvasGradient | null,
    groundGrad: null as CanvasGradient | null,
    cats: CREW_MEMBERS.map((c, idx) => ({
      crewId: c.id,
      x: 0.28 + idx * 0.14,
      y: 0.42 + (idx % 2) * 0.16,
      tx: 0.5,
      ty: 0.5,
      pauseTimer: 0.6 + idx * 0.5,
      bobPhase: idx * 1.4,
      accentColor: c.accentColor,
    })) as CatWalker[],
    particles: Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      size: 3,
      color: '#FDE047',
    })) as Particle[],
    particleCursor: 0,
    projectiles: Array.from({ length: PROJECTILE_POOL_SIZE }, () => ({
      active: false,
      fromEnemy: false,
      x: 0,
      y: 0,
      tx: 0,
      ty: 0,
      vx: 0,
      vy: 0,
      life: 0,
      color: '#34D399',
      damage: 15,
    })) as Projectile[],
    projectileCursor: 0,
  });

  // Preload crew portraits once
  useEffect(() => {
    for (const member of CREW_MEMBERS) {
      if (!imagesRef.current[member.id]) {
        const img = new Image();
        img.src = member.avatar;
        imagesRef.current[member.id] = img;
      }
    }
  }, []);

  // Spawn raid wave whenever raidTriggerNonce increments
  useEffect(() => {
    if (raidTriggerNonce <= 0) return;
    const sim = simRef.current;
    const { day: curDay, stormLevel: curStorm, baseState: curBase } = propsRef.current;
    if (sim.raidActive) return;

    const plan = computeRaidWavePlan(curDay, curBase.wavesCleared, curStorm);
    sim.raidActive = true;
    sim.raidWaveNumber = plan.waveNumber;
    sim.raiders = [];
    sim.buildingHpLocal.clear();
    for (const b of curBase.buildings) {
      sim.buildingHpLocal.set(b.id, b.hp);
    }

    const pickTarget = (preferOuter: boolean): BaseBuilding => {
      const list = curBase.buildings;
      if (preferOuter) {
        const outer = list.filter((b) => b.type !== 'command_dome');
        if (outer.length > 0) return outer[Math.floor(Math.random() * outer.length)];
      }
      const hq = list.find((b) => b.type === 'command_dome');
      return hq || list[0];
    };

    let nextId = 1;
    const spawnOnEdge = () => {
      const edge = Math.floor(Math.random() * 4);
      if (edge === 0) return { x: Math.random(), y: 0.06 };
      if (edge === 1) return { x: 0.94, y: 0.12 + Math.random() * 0.78 };
      if (edge === 2) return { x: Math.random(), y: 0.94 };
      return { x: 0.06, y: 0.12 + Math.random() * 0.78 };
    };

    for (let i = 0; i < plan.meteorCount; i++) {
      const pos = spawnOnEdge();
      const target = pickTarget(true);
      sim.raiders.push({
        id: nextId++,
        kind: 'meteor_swarm',
        x: pos.x,
        y: pos.y,
        vx: 0,
        vy: 0,
        hp: Math.round(42 * plan.enemyHpMultiplier),
        maxHp: Math.round(42 * plan.enemyHpMultiplier),
        speed: 0.095 * plan.enemySpeedMultiplier,
        targetId: target.id,
        attackCooldown: 1.0,
        windup: 0,
        flashTimer: 0,
        orbitAngle: Math.random() * Math.PI * 2,
        koTimer: 0,
      });
    }

    for (let i = 0; i < plan.orbiterCount; i++) {
      const pos = spawnOnEdge();
      const target = pickTarget(true);
      sim.raiders.push({
        id: nextId++,
        kind: 'plasma_orbiter',
        x: pos.x,
        y: pos.y,
        vx: 0,
        vy: 0,
        hp: Math.round(62 * plan.enemyHpMultiplier),
        maxHp: Math.round(62 * plan.enemyHpMultiplier),
        speed: 0.065 * plan.enemySpeedMultiplier,
        targetId: target.id,
        attackCooldown: 1.8 + i * 0.6,
        windup: 0,
        flashTimer: 0,
        orbitAngle: i * 1.9,
        koTimer: 0,
      });
    }

    for (let i = 0; i < plan.golemCount; i++) {
      const pos = spawnOnEdge();
      const target = pickTarget(false);
      sim.raiders.push({
        id: nextId++,
        kind: 'dust_golem',
        x: pos.x,
        y: pos.y,
        vx: 0,
        vy: 0,
        hp: Math.round(115 * plan.enemyHpMultiplier),
        maxHp: Math.round(115 * plan.enemyHpMultiplier),
        speed: 0.042 * plan.enemySpeedMultiplier,
        targetId: target.id,
        attackCooldown: 1.4,
        windup: 0,
        flashTimer: 0,
        orbitAngle: 0,
        koTimer: 0,
      });
    }

    sim.lastReportedRemaining = sim.raiders.length;
    propsRef.current.onRaidStateChange(true, sim.raiders.length);
  }, [raidTriggerNonce]);

  // Grid normalized coordinate helper
  const getPadCenterNorm = (col: number, row: number) => {
    const padLeft = 0.12;
    const padRight = 0.88;
    const padTop = 0.25;
    const padBottom = 0.85;
    const cellW = (padRight - padLeft) / BASE_GRID_COLS;
    const cellH = (padBottom - padTop) / BASE_GRID_ROWS;
    return {
      x: padLeft + (col + 0.5) * cellW,
      y: padTop + (row + 0.5) * cellH,
      cellW,
      cellH,
    };
  };

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;

    const resize = () => {
      const rect = wrapper.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(280, Math.round(rect.width));
      const h = Math.max(260, Math.round(rect.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      simRef.current.width = w;
      simRef.current.height = h;
      simRef.current.gradCacheKey = '';
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrapper);

    const spawnParticles = (
      nx: number,
      ny: number,
      count: number,
      color: string,
      speedScale = 0.18
    ) => {
      const sim = simRef.current;
      for (let i = 0; i < count; i++) {
        const p = sim.particles[sim.particleCursor];
        sim.particleCursor = (sim.particleCursor + 1) % PARTICLE_POOL_SIZE;
        const ang = Math.random() * Math.PI * 2;
        const spd = (0.3 + Math.random() * 0.9) * speedScale;
        p.active = true;
        p.x = nx;
        p.y = ny;
        p.vx = Math.cos(ang) * spd;
        p.vy = Math.sin(ang) * spd;
        p.life = 0.4 + Math.random() * 0.35;
        p.maxLife = p.life;
        p.size = 2 + Math.random() * 3;
        p.color = color;
      }
    };

    const spawnProjectile = (
      fromEnemy: boolean,
      x: number,
      y: number,
      tx: number,
      ty: number,
      color: string,
      damage: number
    ) => {
      const sim = simRef.current;
      const proj = sim.projectiles[sim.projectileCursor];
      sim.projectileCursor = (sim.projectileCursor + 1) % PROJECTILE_POOL_SIZE;
      const dx = tx - x;
      const dy = ty - y;
      const len = Math.max(0.001, Math.hypot(dx, dy));
      const spd = fromEnemy ? 0.32 : 0.72;
      proj.active = true;
      proj.fromEnemy = fromEnemy;
      proj.x = x;
      proj.y = y;
      proj.tx = tx;
      proj.ty = ty;
      proj.vx = (dx / len) * spd;
      proj.vy = (dy / len) * spd;
      proj.life = 1.4;
      proj.color = color;
      proj.damage = damage;
    };

    let lastNow = performance.now();
    let rafId = 0;

    const frame = (now: number) => {
      const rawDt = (now - lastNow) / 1000;
      lastNow = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
      const sim = simRef.current;
      const { day: curDay, baseState: curBase, selectedBuildingId: selId, buildModeType: buildMode } =
        propsRef.current;

      sim.time += dt;
      sim.pulseCooldown = Math.max(0, sim.pulseCooldown - dt);
      sim.shakeTrauma = Math.max(0, sim.shakeTrauma - dt * 2.2);

      // Update particles in real dt even during hitstop
      for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
        const p = sim.particles[i];
        if (!p.active) continue;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) p.active = false;
      }

      if (sim.hitstop > 0) {
        sim.hitstop = Math.max(0, sim.hitstop - dt);
      } else {
        // Patrol cats smoothly between structures
        for (const cat of sim.cats) {
          cat.bobPhase += dt * 4.5;
          if (cat.pauseTimer > 0) {
            cat.pauseTimer -= dt;
            if (cat.pauseTimer <= 0 && curBase.buildings.length > 0) {
              const targetB =
                curBase.buildings[
                  Math.floor(Math.random() * curBase.buildings.length)
                ];
              const pt = getPadCenterNorm(targetB.col, targetB.row);
              cat.tx = pt.x + (Math.random() - 0.5) * 0.07;
              cat.ty = pt.y + 0.045 + (Math.random() - 0.5) * 0.03;
            }
          } else {
            const dx = cat.tx - cat.x;
            const dy = cat.ty - cat.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 0.012) {
              cat.pauseTimer = 1.6 + Math.random() * 2.4;
            } else {
              const step = Math.min(dist, 0.075 * dt);
              cat.x += (dx / dist) * step;
              cat.y += (dy / dist) * step;
            }
          }
        }

        // Mini Rover patrol if Rover Garage exists
        const hasRover = curBase.buildings.some((b) => b.type === 'rover_garage');
        if (hasRover) {
          sim.roverAngle += dt * 0.55;
          sim.roverX = 0.5 + Math.cos(sim.roverAngle) * 0.34;
          sim.roverY = 0.56 + Math.sin(sim.roverAngle * 1.2) * 0.25;
        }

        // Building flash decay
        sim.buildingFlash.forEach((v, k) => {
          if (v > 0) sim.buildingFlash.set(k, Math.max(0, v - dt * 5));
        });

        // Raid wave simulation
        if (sim.raidActive) {
          // 1. Turrets acquire and shoot closest live raider
          for (const b of curBase.buildings) {
            if (b.type !== 'laser_turret') continue;
            const curHp = sim.buildingHpLocal.get(b.id) ?? b.hp;
            if (curHp <= 0) continue;

            const cd = (sim.turretCooldowns.get(b.id) ?? 0) - dt;
            sim.turretCooldowns.set(b.id, Math.max(0, cd));

            let closest: Raider | null = null;
            let bestDist = 0.42 + b.level * 0.04;
            const bPos = getPadCenterNorm(b.col, b.row);

            for (const r of sim.raiders) {
              if (r.hp <= 0) continue;
              const d = Math.hypot(r.x - bPos.x, r.y - bPos.y);
              if (d < bestDist) {
                bestDist = d;
                closest = r;
              }
            }

            if (closest) {
              sim.turretAngles.set(
                b.id,
                Math.atan2(closest.y - bPos.y, closest.x - bPos.x)
              );
              if (cd <= 0) {
                sim.turretCooldowns.set(b.id, Math.max(0.32, 0.72 - b.level * 0.07));
                spawnProjectile(
                  false,
                  bPos.x,
                  bPos.y - 0.015,
                  closest.x,
                  closest.y,
                  '#34D399',
                  22 + b.level * 9
                );
                propsRef.current.onSoundEffect('laser');
              }
            }
          }

          // 2. Move & attack raiders across 3 distinct behavior policies
          for (const r of sim.raiders) {
            if (r.flashTimer > 0) r.flashTimer = Math.max(0, r.flashTimer - dt);
            if (r.hp <= 0) {
              r.koTimer += dt;
              continue;
            }

            const targetB =
              curBase.buildings.find(
                (b) => b.id === r.targetId && (sim.buildingHpLocal.get(b.id) ?? b.hp) > 0
              ) ||
              curBase.buildings.find((b) => (sim.buildingHpLocal.get(b.id) ?? b.hp) > 0);

            if (!targetB) continue;
            r.targetId = targetB.id;
            const tPos = getPadCenterNorm(targetB.col, targetB.row);
            const dx = tPos.x - r.x;
            const dy = tPos.y - r.y;
            const dist = Math.hypot(dx, dy);

            if (r.kind === 'plasma_orbiter') {
              // Policy 2: Orbits at ~0.18 radius and winds up telegraphed flare shot
              r.orbitAngle += dt * 1.4;
              const desiredX = tPos.x + Math.cos(r.orbitAngle) * 0.17;
              const desiredY = tPos.y + Math.sin(r.orbitAngle) * 0.14;
              const odx = desiredX - r.x;
              const ody = desiredY - r.y;
              const oDist = Math.max(0.001, Math.hypot(odx, ody));
              const step = Math.min(oDist, r.speed * dt);
              r.x += (odx / oDist) * step;
              r.y += (ody / oDist) * step;

              if (r.windup > 0) {
                r.windup -= dt;
                if (r.windup <= 0) {
                  spawnProjectile(true, r.x, r.y, tPos.x, tPos.y, '#C084FC', 11);
                  r.attackCooldown = 2.4;
                }
              } else {
                r.attackCooldown -= dt;
                if (r.attackCooldown <= 0 && dist < 0.34) {
                  r.windup = 0.55; // Visible telegraph ring before shot!
                }
              }
            } else {
              // Policy 1 (meteor_swarm: curved chase) & Policy 3 (dust_golem: heavy direct march)
              if (dist > 0.045) {
                const sway =
                  r.kind === 'meteor_swarm'
                    ? Math.sin(sim.time * 5 + r.id) * 0.03
                    : 0;
                const nx = dx / dist;
                const ny = dy / dist;
                r.x += (nx - ny * sway) * r.speed * dt;
                r.y += (ny + nx * sway) * r.speed * dt;
              } else {
                r.attackCooldown -= dt;
                if (r.attackCooldown <= 0) {
                  r.attackCooldown = r.kind === 'dust_golem' ? 1.35 : 0.95;
                  const dmg = r.kind === 'dust_golem' ? 16 : 9;
                  const prevHp = sim.buildingHpLocal.get(targetB.id) ?? targetB.hp;
                  sim.buildingHpLocal.set(targetB.id, Math.max(10, prevHp - dmg));
                  sim.buildingFlash.set(targetB.id, 1);
                  sim.shakeTrauma = Math.min(1, sim.shakeTrauma + 0.18);
                  spawnParticles(tPos.x, tPos.y, 6, '#FB7185', 0.14);
                }
              }
            }
          }

          // 3. Projectiles
          for (let i = 0; i < PROJECTILE_POOL_SIZE; i++) {
            const pr = sim.projectiles[i];
            if (!pr.active) continue;
            pr.x += pr.vx * dt;
            pr.y += pr.vy * dt;
            pr.life -= dt;
            if (pr.life <= 0) {
              pr.active = false;
              continue;
            }

            if (!pr.fromEnemy) {
              for (const r of sim.raiders) {
                if (r.hp <= 0) continue;
                if (Math.hypot(r.x - pr.x, r.y - pr.y) < 0.042) {
                  pr.active = false;
                  r.hp -= pr.damage;
                  r.flashTimer = 0.08;
                  spawnParticles(pr.x, pr.y, 7, '#6EE7B7', 0.2);
                  if (r.hp <= 0) {
                    sim.hitstop = 0.035;
                    sim.shakeTrauma = Math.min(1, sim.shakeTrauma + 0.25);
                    spawnParticles(r.x, r.y, 16, '#FDE047', 0.28);
                  }
                  break;
                }
              }
            } else {
              for (const b of curBase.buildings) {
                const bPos = getPadCenterNorm(b.col, b.row);
                if (Math.hypot(bPos.x - pr.x, bPos.y - pr.y) < 0.048) {
                  pr.active = false;
                  const prevHp = sim.buildingHpLocal.get(b.id) ?? b.hp;
                  sim.buildingHpLocal.set(b.id, Math.max(10, prevHp - pr.damage));
                  sim.buildingFlash.set(b.id, 1);
                  spawnParticles(pr.x, pr.y, 6, '#C084FC', 0.16);
                  break;
                }
              }
            }
          }

          // 4. Filter out raiders whose KO dissolve finished & check victory
          sim.raiders = sim.raiders.filter((r) => r.hp > 0 || r.koTimer < 0.35);
          const aliveCount = sim.raiders.filter((r) => r.hp > 0).length;
          if (aliveCount !== sim.lastReportedRemaining) {
            sim.lastReportedRemaining = aliveCount;
            propsRef.current.onRaidStateChange(true, aliveCount);
          }

          if (sim.raiders.length === 0) {
            sim.raidActive = false;
            propsRef.current.onRaidStateChange(false, 0);
            let curSum = 0;
            let maxSum = 0;
            const damagedBuildings: Record<string, number> = {};
            for (const b of curBase.buildings) {
              const hpVal = sim.buildingHpLocal.get(b.id) ?? b.hp;
              damagedBuildings[b.id] = Math.round(hpVal);
              curSum += hpVal;
              maxSum += b.maxHp;
            }
            const rewards = computeRaidVictoryRewards(
              sim.raidWaveNumber,
              maxSum > 0 ? curSum / maxSum : 1
            );
            propsRef.current.onSoundEffect('success');
            propsRef.current.onRaidComplete({
              won: true,
              waveNumber: sim.raidWaveNumber,
              ...rewards,
              damagedBuildings,
            });
          }
        }
      }

      // ======================================================================
      // RENDERING (Lunar Sky, Isometric Base Pads, Buildings, Cats, Raiders)
      // ======================================================================
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const dpr = canvas.width / sim.width;
        ctx.save();
        ctx.scale(dpr, dpr);

        const shakeMag = sim.shakeTrauma * sim.shakeTrauma * 7;
        const sx = (Math.random() - 0.5) * shakeMag * 2;
        const sy = (Math.random() - 0.5) * shakeMag * 2;
        ctx.translate(sx, sy);

        const w = sim.width;
        const h = sim.height;

        // 1-3. Cached Static Sky, Terrain, Craters, and 6x4 Building Pads
        const occupiedKey = curBase.buildings
          .map((b) => `${b.col},${b.row}`)
          .sort()
          .join(';');
        const bgKey = `${w}x${h}x${dpr.toFixed(2)}x${curDay < 6 ? 'day' : 'night'}x${buildMode ? '1' : '0'}x${occupiedKey}`;

        if (!sim.bgCanvas) {
          sim.bgCanvas = document.createElement('canvas');
        }

        if (sim.gradCacheKey !== bgKey) {
          sim.bgCanvas.width = canvas.width;
          sim.bgCanvas.height = canvas.height;
          const bctx = sim.bgCanvas.getContext('2d');
          if (bctx) {
            bctx.save();
            bctx.scale(dpr, dpr);

            const skyGrad = bctx.createLinearGradient(0, 0, 0, h * 0.35);
            if (curDay < 6) {
              skyGrad.addColorStop(0, '#070F2B');
              skyGrad.addColorStop(1, '#1A2D64');
            } else {
              skyGrad.addColorStop(0, '#040818');
              skyGrad.addColorStop(1, '#0F1A3F');
            }
            bctx.fillStyle = skyGrad;
            bctx.fillRect(0, 0, w, h);

            // Earth & Sun in upper sky
            const earthX = w * 0.16;
            const earthY = h * 0.11;
            bctx.fillStyle = '#38BDF8';
            bctx.beginPath();
            bctx.arc(earthX, earthY, Math.min(w, h) * 0.042, 0, Math.PI * 2);
            bctx.fill();
            bctx.fillStyle = '#4ADE80';
            bctx.beginPath();
            bctx.arc(earthX - 5, earthY - 3, 5, 0, Math.PI * 2);
            bctx.arc(earthX + 4, earthY + 4, 4, 0, Math.PI * 2);
            bctx.fill();

            if (curDay < 6) {
              bctx.fillStyle = '#FDE047';
              bctx.beginPath();
              bctx.arc(w * 0.85, h * 0.1, Math.min(w, h) * 0.036, 0, Math.PI * 2);
              bctx.fill();
            }

            // Lunar Crater Terrain
            const groundTop = h * 0.19;
            const groundGrad = bctx.createLinearGradient(0, groundTop, 0, h);
            groundGrad.addColorStop(0, '#2F3D5E');
            groundGrad.addColorStop(0.5, '#25314E');
            groundGrad.addColorStop(1, '#19223B');
            bctx.fillStyle = groundGrad;
            bctx.beginPath();
            bctx.moveTo(0, groundTop + 12);
            bctx.quadraticCurveTo(w * 0.5, groundTop - 16, w, groundTop + 10);
            bctx.lineTo(w, h);
            bctx.lineTo(0, h);
            bctx.closePath();
            bctx.fill();

            const craters = [
              [0.09, 0.34, 20],
              [0.9, 0.31, 24],
              [0.11, 0.86, 26],
              [0.88, 0.88, 22],
            ];
            for (const [cxn, cyn, rad] of craters) {
              bctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
              bctx.beginPath();
              bctx.ellipse(cxn * w, cyn * h, rad, rad * 0.42, 0, 0, Math.PI * 2);
              bctx.fill();
              bctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
              bctx.lineWidth = 1.5;
              bctx.stroke();
            }

            const occupiedMap = new Map<string, BaseBuilding>();
            for (const b of curBase.buildings) {
              occupiedMap.set(`${b.col},${b.row}`, b);
            }
            for (let r = 0; r < BASE_GRID_ROWS; r++) {
              for (let c = 0; c < BASE_GRID_COLS; c++) {
                const center = getPadCenterNorm(c, r);
                const px = center.x * w;
                const py = center.y * h;
                const padW = center.cellW * w * 0.84;
                const padH = center.cellH * h * 0.72;
                const hasBuilding = occupiedMap.has(`${c},${r}`);

                bctx.fillStyle =
                  buildMode && !hasBuilding
                    ? 'rgba(56, 189, 248, 0.25)'
                    : 'rgba(15, 23, 42, 0.35)';
                bctx.strokeStyle =
                  buildMode && !hasBuilding
                    ? '#38BDF8'
                    : 'rgba(148, 163, 184, 0.22)';
                bctx.lineWidth = buildMode && !hasBuilding ? 2 : 1;
                bctx.beginPath();
                bctx.roundRect(px - padW / 2, py - padH / 2, padW, padH, 10);
                bctx.fill();
                bctx.stroke();

                if (buildMode && !hasBuilding) {
                  bctx.fillStyle = '#BAE6FD';
                  bctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
                  bctx.textAlign = 'center';
                  bctx.textBaseline = 'middle';
                  bctx.fillText('+', px, py);
                }
              }
            }
            bctx.restore();
          }
          sim.gradCacheKey = bgKey;
        }

        ctx.drawImage(sim.bgCanvas, 0, 0, w, h);

        // Twinkling Stars (lightweight overlay)
        for (let i = 0; i < 20; i++) {
          const stx = ((i * 73 + 19) % 100) * 0.01 * w;
          const sty = ((i * 41 + 7) % 24) * 0.01 * h;
          const twinkle = 0.45 + 0.55 * Math.sin(sim.time * 2 + i);
          ctx.fillStyle = `rgba(248, 250, 252, ${twinkle.toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(stx, sty, i % 3 === 0 ? 1.6 : 1.0, 0, Math.PI * 2);
          ctx.fill();
        }

        // 4. Structures (Sorted top-to-bottom for clean depth overlap)
        const sortedBuildings = [...curBase.buildings].sort((a, b) => a.row - b.row);
        const radiusBase = Math.min(w / BASE_GRID_COLS, h / BASE_GRID_ROWS) * 0.34;

        for (const b of sortedBuildings) {
          const center = getPadCenterNorm(b.col, b.row);
          const bx = center.x * w;
          const by = center.y * h;
          const bp = BUILDING_BLUEPRINTS[b.type];
          const isSelected = b.id === selId;
          const flash = sim.buildingFlash.get(b.id) ?? 0;

          if (isSelected) {
            ctx.strokeStyle = '#FACC15';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.ellipse(bx, by + radiusBase * 0.25, radiusBase * 1.25, radiusBase * 0.65, 0, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Ground shadow
          ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
          ctx.beginPath();
          ctx.ellipse(bx, by + radiusBase * 0.36, radiusBase * 0.95, radiusBase * 0.42, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.save();

          if (b.type === 'command_dome') {
            // Iconic central Command Dome
            ctx.fillStyle = '#E2E8F0';
            ctx.strokeStyle = '#0F172A';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(bx, by + 4, radiusBase * 1.1, Math.PI, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Glowing base band & windows
            ctx.fillStyle = '#F59E0B';
            ctx.fillRect(bx - radiusBase * 0.95, by + 2, radiusBase * 1.9, 7);
            ctx.fillStyle = '#38BDF8';
            ctx.beginPath();
            ctx.arc(bx, by - radiusBase * 0.32, radiusBase * 0.32, 0, Math.PI * 2);
            ctx.fill();

            // Rotating Dish
            const dishOff = Math.sin(sim.time * 2.2) * 5;
            ctx.strokeStyle = '#FDE047';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(bx, by - radiusBase * 1.0);
            ctx.lineTo(bx + dishOff, by - radiusBase * 1.38);
            ctx.stroke();
          } else if (b.type === 'solar_array') {
            ctx.fillStyle = '#1E3A8A';
            ctx.strokeStyle = '#93C5FD';
            ctx.lineWidth = 1.8;
            ctx.save();
            ctx.translate(bx, by - 2);
            ctx.rotate(-0.18);
            ctx.fillRect(-radiusBase * 0.95, -radiusBase * 0.55, radiusBase * 1.9, radiusBase * 0.95);
            ctx.strokeRect(-radiusBase * 0.95, -radiusBase * 0.55, radiusBase * 1.9, radiusBase * 0.95);
            ctx.strokeStyle = 'rgba(253, 224, 71, 0.65)';
            ctx.beginPath();
            ctx.moveTo(0, -radiusBase * 0.55);
            ctx.lineTo(0, radiusBase * 0.4);
            ctx.moveTo(-radiusBase * 0.95, -radiusBase * 0.08);
            ctx.lineTo(radiusBase * 0.95, -radiusBase * 0.08);
            ctx.stroke();
            ctx.restore();
          } else if (b.type === 'oxygen_scrubber') {
            ctx.fillStyle = '#0284C7';
            ctx.strokeStyle = '#BAE6FD';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(bx - radiusBase * 0.8, by - radiusBase * 0.72, radiusBase * 1.6, radiusBase * 1.05, 10);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#7DD3FC';
            const bob = Math.sin(sim.time * 3.5 + b.col) * 3;
            ctx.beginPath();
            ctx.arc(bx - 5, by - 4 + bob, 4, 0, Math.PI * 2);
            ctx.arc(bx + 6, by - 9 - bob, 3, 0, Math.PI * 2);
            ctx.fill();
          } else if (b.type === 'laser_turret') {
            ctx.fillStyle = '#065F46';
            ctx.strokeStyle = '#6EE7B7';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(bx, by, radiusBase * 0.72, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            const ang = sim.turretAngles.get(b.id) ?? -Math.PI / 2;
            ctx.save();
            ctx.translate(bx, by);
            ctx.rotate(ang);
            ctx.fillStyle = '#34D399';
            ctx.fillRect(0, -4, radiusBase * 0.98, 8);
            ctx.restore();
          } else if (b.type === 'ice_extractor') {
            ctx.fillStyle = '#5B21B6';
            ctx.strokeStyle = '#DDD6FE';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(bx, by - radiusBase * 0.95);
            ctx.lineTo(bx + radiusBase * 0.85, by + radiusBase * 0.25);
            ctx.lineTo(bx - radiusBase * 0.85, by + radiusBase * 0.25);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } else {
            // rover_garage
            ctx.fillStyle = '#9F1239';
            ctx.strokeStyle = '#FDA4AF';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(bx - radiusBase * 0.9, by - radiusBase * 0.6, radiusBase * 1.8, radiusBase * 0.95, 6);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#1E293B';
            ctx.fillRect(bx - radiusBase * 0.48, by - radiusBase * 0.2, radiusBase * 0.96, radiusBase * 0.54);
          }
          if (flash > 0.2) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.beginPath();
            ctx.arc(bx, by - radiusBase * 0.15, radiusBase * 1.05, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();

          // Level badge
          ctx.fillStyle = '#0F172A';
          ctx.beginPath();
          ctx.roundRect(bx - 16, by + radiusBase * 0.42, 32, 14, 5);
          ctx.fill();
          ctx.strokeStyle = bp.accentColor;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = '#F8FAFC';
          ctx.font = '700 9px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`Lv${b.level}`, bx, by + radiusBase * 0.42 + 7.5);

          // Raid HP bar
          const curHp = sim.raidActive ? (sim.buildingHpLocal.get(b.id) ?? b.hp) : b.hp;
          if (sim.raidActive || curHp < b.maxHp) {
            const pct = Math.max(0, Math.min(1, curHp / b.maxHp));
            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.fillRect(bx - 18, by - radiusBase * 1.25, 36, 5);
            ctx.fillStyle = pct > 0.5 ? '#34D399' : pct > 0.25 ? '#FACC15' : '#FB7185';
            ctx.fillRect(bx - 18, by - radiusBase * 1.25, 36 * pct, 5);
          }

          // Floating Clash-style Resource Collector Bubble
          if (!sim.raidActive && b.type !== 'laser_turret' && b.storedYield >= 8) {
            const floatY = by - radiusBase * 1.15 + Math.sin(sim.time * 3.4 + b.col) * 3.5;
            ctx.fillStyle = bp.accentColor;
            ctx.beginPath();
            ctx.arc(bx, floatY, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#0F172A';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#0F172A';
            ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const iconText =
              b.type === 'solar_array'
                ? '⚡'
                : b.type === 'oxygen_scrubber'
                  ? 'O₂'
                  : b.type === 'ice_extractor'
                    ? '💎'
                    : b.type === 'rover_garage'
                      ? '🔬'
                      : '★';
            ctx.fillText(iconText, bx, floatY + 0.5);
          }
        }

        // 5. Mini Moon Rover Patrol
        if (curBase.buildings.some((b) => b.type === 'rover_garage')) {
          const rx = sim.roverX * w;
          const ry = sim.roverY * h;
          ctx.fillStyle = '#F8FAFC';
          ctx.strokeStyle = '#FB7185';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.roundRect(rx - 9, ry - 6, 18, 11, 4);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#0F172A';
          ctx.beginPath();
          ctx.arc(rx - 5, ry + 6, 3, 0, Math.PI * 2);
          ctx.arc(rx + 5, ry + 6, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // 6. Autonomous Cat Astronauts + Live AI Thought Bubbles
        for (const cat of sim.cats) {
          const cx = cat.x * w;
          const cy = cat.y * h + Math.sin(cat.bobPhase) * 2.5;
          const avatarR = Math.max(13, Math.min(18, w * 0.036));

          // Shadow
          ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
          ctx.beginPath();
          ctx.ellipse(cx, cat.y * h + avatarR + 2, avatarR * 0.75, 4, 0, 0, Math.PI * 2);
          ctx.fill();

          const img = imagesRef.current[cat.crewId];
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, avatarR, 0, Math.PI * 2);
          ctx.clip();
          ctx.fillStyle = '#79e3fe';
          ctx.fillRect(cx - avatarR, cy - avatarR, avatarR * 2, avatarR * 2);
          if (img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, cx - avatarR, cy - avatarR, avatarR * 2, avatarR * 2);
          }
          ctx.restore();

          ctx.strokeStyle = cat.accentColor;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(cx, cy, avatarR, 0, Math.PI * 2);
          ctx.stroke();

          // Live AI Consciousness Thought Bubble (show 1 rotating cat thought clearly or when hovered/paused)
          const thought = curBase.thoughts[cat.crewId]?.innerThought;
          const activeSpotlightIdx = Math.floor(sim.time / 4.5) % 4;
          const isSpotlight = CREW_MEMBERS[activeSpotlightIdx]?.id === cat.crewId;
          if (thought && isSpotlight && !sim.raidActive) {
            const label = thought.length > 34 ? `${thought.slice(0, 32)}…` : thought;
            ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
            const maxBubbleW = Math.min(204, w - 24);
            const tw = Math.min(maxBubbleW, ctx.measureText(label).width + 18);
            const bx = Math.max(tw / 2 + 8, Math.min(w - tw / 2 - 8, cx));
            const by = Math.max(24, cy - avatarR - 22);

            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.strokeStyle = cat.accentColor;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.roundRect(bx - tw / 2, by - 11, tw, 22, 10);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#F8FAFC';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, bx, by, tw - 14);
          }
        }

        // 7. Raiders + Telegraphs
        for (const r of sim.raiders) {
          const rx = r.x * w;
          const ry = r.y * h;
          const scale = r.hp <= 0 ? Math.max(0.1, 1 - r.koTimer / 0.35) : 1;
          ctx.save();
          ctx.translate(rx, ry);
          ctx.scale(scale, scale);
          if (r.kind === 'plasma_orbiter' && r.windup > 0) {
            // Telegraphed windup ring before firing
            ctx.strokeStyle = 'rgba(250, 204, 21, 0.85)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 14 + r.windup * 18, 0, Math.PI * 2);
            ctx.stroke();
          }

          if (r.kind === 'meteor_swarm') {
            ctx.fillStyle = r.flashTimer > 0 ? '#FFFFFF' : '#FB923C';
            ctx.strokeStyle = '#FDE047';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.arc(0, 0, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          } else if (r.kind === 'plasma_orbiter') {
            ctx.fillStyle = r.flashTimer > 0 ? '#FFFFFF' : '#A855F7';
            ctx.strokeStyle = '#F5D0FE';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, -11);
            ctx.lineTo(11, 0);
            ctx.lineTo(0, 11);
            ctx.lineTo(-11, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } else {
            ctx.fillStyle = r.flashTimer > 0 ? '#FFFFFF' : '#78716C';
            ctx.strokeStyle = '#F87171';
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.roundRect(-13, -13, 26, 26, 7);
            ctx.fill();
            ctx.stroke();
          }

          if (r.hp > 0) {
            const pct = Math.max(0, r.hp / r.maxHp);
            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.fillRect(-13, -19, 26, 4);
            ctx.fillStyle = '#FB7185';
            ctx.fillRect(-13, -19, 26 * pct, 4);
          }
          ctx.restore();
        }

        // 8. Projectiles
        for (let i = 0; i < PROJECTILE_POOL_SIZE; i++) {
          const pr = sim.projectiles[i];
          if (!pr.active) continue;
          ctx.fillStyle = pr.color;
          ctx.beginPath();
          ctx.arc(pr.x * w, pr.y * h, pr.fromEnemy ? 4.2 : 3.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // 9. Pooled Particles
        for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
          const p = sim.particles[i];
          if (!p.active) continue;
          ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x * w, p.y * h, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        ctx.restore();
      }

      if (!pausedRef.current) {
        rafId = requestAnimationFrame(frame);
      } else {
        rafId = 0;
      }
    };

    const resumeCheck = () => {
      if (!pausedRef.current && rafId === 0) {
        lastNow = performance.now();
        rafId = requestAnimationFrame(frame);
      }
    };
    (simRef.current as any).resumeLoop = resumeCheck;

    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!paused) {
      (simRef.current as any).resumeLoop?.();
    }
  }, [paused]);

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / Math.max(1, rect.width);
    const ny = (e.clientY - rect.top) / Math.max(1, rect.height);
    const sim = simRef.current;
    const {
      baseState: curBase,
      buildModeType: buildMode,
      onHarvestBuilding: harvest,
      onSelectBuilding: selectB,
      onPlaceBuildingAtPad: placeB,
      onSelectCrew: selectCrew,
      onSoundEffect: sfx,
    } = propsRef.current;

    // 1. During active Raid Wave, tapping fires Commander Pulse Zap at tap spot!
    if (sim.raidActive) {
      if (sim.pulseCooldown <= 0) {
        sim.pulseCooldown = 0.25;
        let hitAny = false;
        for (const r of sim.raiders) {
          if (r.hp <= 0) continue;
          if (Math.hypot(r.x - nx, r.y - ny) < 0.14) {
            r.hp -= 28;
            r.flashTimer = 0.09;
            hitAny = true;
            if (r.hp <= 0) {
              sim.hitstop = 0.035;
              sim.shakeTrauma = Math.min(1, sim.shakeTrauma + 0.28);
            }
          }
        }
        // Visual burst at tap spot
        for (let i = 0; i < 10; i++) {
          const p = sim.particles[sim.particleCursor];
          sim.particleCursor = (sim.particleCursor + 1) % PARTICLE_POOL_SIZE;
          const ang = (Math.PI * 2 * i) / 10;
          p.active = true;
          p.x = nx;
          p.y = ny;
          p.vx = Math.cos(ang) * 0.22;
          p.vy = Math.sin(ang) * 0.22;
          p.life = 0.32;
          p.maxLife = 0.32;
          p.size = 3.2;
          p.color = hitAny ? '#FDE047' : '#38BDF8';
        }
        sfx('laser');
      }
      return;
    }

    // 2. If in Build Placement mode, check open pad tap
    if (buildMode) {
      for (let r = 0; r < BASE_GRID_ROWS; r++) {
        for (let c = 0; c < BASE_GRID_COLS; c++) {
          const pt = getPadCenterNorm(c, r);
          if (
            Math.abs(nx - pt.x) <= pt.cellW * 0.45 &&
            Math.abs(ny - pt.y) <= pt.cellH * 0.45
          ) {
            const occupied = curBase.buildings.some((b) => b.col === c && b.row === r);
            if (!occupied) {
              placeB(buildMode, c, r);
              return;
            }
          }
        }
      }
    }

    // 3. Check if user tapped a Cat Astronaut
    for (const cat of sim.cats) {
      if (Math.hypot(nx - cat.x, ny - cat.y) < 0.075) {
        sfx('tap');
        selectCrew(cat.crewId);
        return;
      }
    }

    // 4. Check if user tapped a Building (harvest floating bubble if ready, or select building)
    for (const b of curBase.buildings) {
      const pt = getPadCenterNorm(b.col, b.row);
      if (
        Math.abs(nx - pt.x) <= pt.cellW * 0.48 &&
        Math.abs(ny - pt.y) <= pt.cellH * 0.55
      ) {
        if (b.type !== 'laser_turret' && b.storedYield >= 8) {
          harvest(b.id);
          sfx('harvest');
          // Burst sparkle
          for (let i = 0; i < 12; i++) {
            const p = sim.particles[sim.particleCursor];
            sim.particleCursor = (sim.particleCursor + 1) % PARTICLE_POOL_SIZE;
            const ang = (Math.PI * 2 * i) / 12;
            p.active = true;
            p.x = pt.x;
            p.y = pt.y - 0.03;
            p.vx = Math.cos(ang) * 0.16;
            p.vy = Math.sin(ang) * 0.16 - 0.05;
            p.life = 0.45;
            p.maxLife = 0.45;
            p.size = 3.2;
            p.color = BUILDING_BLUEPRINTS[b.type].accentColor;
          }
        } else {
          sfx('tap');
          selectB(b.id);
        }
        return;
      }
    }

    selectB(null);
  };

  return (
    <div
      ref={wrapperRef}
      data-testid="moon-base-canvas-wrap"
      className="relative w-full h-full overflow-hidden select-none touch-none"
    >
      <canvas
        ref={canvasRef}
        data-testid="moon-base-canvas"
        onPointerDown={handleCanvasPointerDown}
        className="block w-full h-full cursor-pointer"
      />
    </div>
  );
};
