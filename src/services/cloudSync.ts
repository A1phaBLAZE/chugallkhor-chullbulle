import {
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { BaseState, getCommandDomeLevel } from '../game/baseEngine';
import { CrewId, GameState } from '../game/types';
import {
  auth,
  db,
  googleAuthProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';

export interface CloudCommanderLeader {
  commanderName: string;
  scienceScore: number;
  baseLevel: number;
  wavesCleared: number;
  medal: 'GOLD' | 'SILVER' | 'ACTIVE';
}

export interface CrewMemoryItem {
  id?: string | number;
  crewId: CrewId;
  sender: 'user' | 'cat' | 'thought';
  message: string;
  moodState: string;
  dayContext: number;
}

export async function signInCommander(): Promise<User> {
  const cred = await signInWithPopup(auth, googleAuthProvider);
  const user = cred.user;
  const commanderName = (
    user.displayName ||
    user.email?.split('@')[0] ||
    'Lunar Commander'
  ).slice(0, 48);

  const publicPath = `users/${user.uid}/public/profile`;
  try {
    const ref = doc(db, 'users', user.uid, 'public', 'profile');
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      await setDoc(ref, {
        ownerId: user.uid,
        commanderName,
        avatarCrewId: 'capt',
        bestScience: 0,
        baseLevel: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        commanderName,
        avatarCrewId: 'capt',
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, publicPath);
  }

  if (user.email) {
    const privatePath = `users/${user.uid}/private/info`;
    try {
      const privRef = doc(db, 'users', user.uid, 'private', 'info');
      const existingPriv = await getDoc(privRef);
      if (!existingPriv.exists()) {
        await setDoc(privRef, {
          ownerId: user.uid,
          email: user.email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(privRef, {
          email: user.email,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, privatePath);
    }
  }

  return user;
}

export async function signOutCommander(): Promise<void> {
  await signOut(auth);
}

export async function syncStateToCloud(
  user: User,
  gameState: GameState,
  baseState: BaseState,
  logEntry?: { eventType: string; summary: string; outcome: string }
): Promise<void> {
  const token = await user.getIdToken();
  const commanderName = (
    user.displayName ||
    user.email?.split('@')[0] ||
    'Lunar Commander'
  ).slice(0, 48);

  // 1. Sync rich relational state to Cloud SQL via authenticated Express endpoint
  const res = await fetch('/api/base', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      commanderName,
      day: gameState.day,
      power: gameState.meters.power,
      oxygen: gameState.meters.airWater,
      shields: gameState.meters.radiation,
      mood: gameState.meters.mood,
      science: gameState.meters.science,
      moonRocks: baseState.moonRocks,
      solarCharge: gameState.meters.power,
      wavesSurvived: baseState.wavesCleared,
      buildingsJson: JSON.stringify(baseState.buildings),
      missionStateJson: JSON.stringify(gameState),
      logEntry,
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || 'Failed to save Moon Base to Cloud SQL.');
  }

  // 2. Sync mission snapshot & leaderboard entry to Firestore
  const status = gameState.endingTier
    ? 'completed'
    : gameState.failReason
      ? 'failed'
      : 'active';
  const missionPath = `users/${user.uid}/missions/current`;
  try {
    const mRef = doc(db, 'users', user.uid, 'missions', 'current');
    const existing = await getDoc(mRef);
    const baseLevel = getCommandDomeLevel(baseState);
    if (!existing.exists() || existing.data()?.status !== 'active') {
      await setDoc(mRef, {
        ownerId: user.uid,
        day: gameState.day,
        power: gameState.meters.power,
        oxygen: gameState.meters.airWater,
        shields: gameState.meters.radiation,
        mood: gameState.meters.mood,
        science: gameState.meters.science,
        moonRocks: Math.round(baseState.moonRocks),
        wavesCleared: baseState.wavesCleared,
        status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else if (status === 'active') {
      await updateDoc(mRef, {
        day: gameState.day,
        power: gameState.meters.power,
        oxygen: gameState.meters.airWater,
        shields: gameState.meters.radiation,
        mood: gameState.meters.mood,
        science: gameState.meters.science,
        moonRocks: Math.round(baseState.moonRocks),
        wavesCleared: baseState.wavesCleared,
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(mRef, {
        status,
        day: gameState.day,
        science: gameState.meters.science,
        wavesCleared: baseState.wavesCleared,
        updatedAt: serverTimestamp(),
      });
    }

    const lbRef = doc(db, 'leaderboard', user.uid);
    const lbExisting = await getDoc(lbRef);
    const medal = gameState.endingTier || 'ACTIVE';
    if (!lbExisting.exists()) {
      await setDoc(lbRef, {
        ownerId: user.uid,
        commanderName,
        scienceScore: Math.round(gameState.meters.science),
        baseLevel,
        wavesCleared: baseState.wavesCleared,
        medal,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(lbRef, {
        commanderName,
        scienceScore: Math.max(
          lbExisting.data()?.scienceScore ?? 0,
          Math.round(gameState.meters.science)
        ),
        baseLevel: Math.max(lbExisting.data()?.baseLevel ?? 1, baseLevel),
        wavesCleared: Math.max(
          lbExisting.data()?.wavesCleared ?? 0,
          baseState.wavesCleared
        ),
        medal,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, missionPath);
  }
}

export async function loadCloudBaseAndMemories(user: User): Promise<{
  gameState: GameState | null;
  baseState: Partial<BaseState> | null;
  memories: CrewMemoryItem[];
}> {
  const token = await user.getIdToken();
  const res = await fetch('/api/base', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || 'Failed to load Moon Base.');
  }
  const data = await res.json();
  let parsedGame: GameState | null = null;
  let parsedBuildings = null;
  if (data.base) {
    try {
      parsedGame = JSON.parse(data.base.missionStateJson);
      parsedBuildings = JSON.parse(data.base.buildingsJson);
    } catch {
      parsedGame = null;
    }
  }
  return {
    gameState: parsedGame,
    baseState: data.base
      ? {
          moonRocks: data.base.moonRocks,
          wavesCleared: data.base.wavesSurvived,
          buildings: parsedBuildings || undefined,
        }
      : null,
    memories: Array.isArray(data.memories) ? data.memories : [],
  };
}

export async function recordThoughtToFirestore(
  user: User,
  thought: { crewId: CrewId; sender: 'user' | 'cat' | 'thought'; message: string; day: number }
) {
  const path = `users/${user.uid}/crewThoughts`;
  try {
    await addDoc(collection(db, 'users', user.uid, 'crewThoughts'), {
      ownerId: user.uid,
      crewId: thought.crewId,
      sender: thought.sender,
      message: thought.message.slice(0, 600),
      day: thought.day,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fetchCloudLeaderboard(): Promise<CloudCommanderLeader[]> {
  const path = 'leaderboard';
  try {
    const q = query(
      collection(db, 'leaderboard'),
      orderBy('scienceScore', 'desc'),
      limit(10)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        commanderName: data.commanderName || 'Commander',
        scienceScore: data.scienceScore ?? 0,
        baseLevel: data.baseLevel ?? 1,
        wavesCleared: data.wavesCleared ?? 0,
        medal: data.medal || 'ACTIVE',
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
