import { MISSION_DAYS, NASA_API_KEY } from './gameData';
import { NasaDayPhoto, NasaMissionBundle, StormLevel } from './types';

interface DonkiFlareItem {
  flrID?: string;
  beginTime?: string;
  peakTime?: string;
  classType?: string;
}

interface DonkiCmeItem {
  activityID?: string;
  startTime?: string;
  cmeAnalyses?: { speed?: number; time21_5?: string }[];
}

interface DonkiSepItem {
  sepID?: string;
  eventTime?: string;
}

const CACHE_KEY = 'moon_base_nasa_bundle_v2';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const REQUEST_TIMEOUT_MS = 8000; // 8 seconds per request

function buildFallbackPhotos(): Record<number, NasaDayPhoto> {
  const photos: Record<number, NasaDayPhoto> = {};
  for (const d of MISSION_DAYS) {
    photos[d.day] = {
      day: d.day,
      query: d.photoQuery,
      imageUrl: null,
      caption: `NASA Archive Topic: ${d.title}`,
      credit: 'Credit: NASA',
      isLive: false,
    };
  }
  return photos;
}

// Embedded authentic archived NASA DONKI sample used ONLY if live fetch fails or player is offline.
// Never labeled as live data.
export const ARCHIVED_NASA_BUNDLE: NasaMissionBundle = {
  isLive: false,
  sourceLabel: 'ARCHIVED EXAMPLE (not live)',
  flareClass: 'M3.2',
  flareDate: '2024-10-14',
  stormLevel: 2,
  windowDays: 30,
  cmeSpeedKmS: 920,
  cmeDate: '2024-10-14',
  sepCount: 2,
  dayPhotos: buildFallbackPhotos(),
  fetchedAt: 0,
};

function formatDateYMD(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDateDaysAgo(daysAgo: number, baseDate: Date = new Date()): string {
  const copy = new Date(baseDate.getTime());
  copy.setUTCDate(copy.getUTCDate() - daysAgo);
  return formatDateYMD(copy);
}

/**
 * Converts a flare class string (e.g. "C4.1", "M2.5", "X1.8") to a numeric rank
 * so we can pick the strongest flare from the NASA DONKI list.
 */
export function getFlareStrengthRank(classType: string): number {
  const clean = (classType || '').trim().toUpperCase();
  const letter = clean[0];
  const mag = parseFloat(clean.slice(1)) || 1;
  if (letter === 'X') return 3000 + mag;
  if (letter === 'M') return 2000 + mag;
  if (letter === 'C') return 1000 + mag;
  return mag;
}

/**
 * Maps NASA flare classType to Moon Base storm level:
 * C or none => 1, M => 2, X => 3.
 */
export function flareClassToStormLevel(classType: string | null | undefined): StormLevel {
  const clean = (classType || '').trim().toUpperCase();
  if (clean.startsWith('X')) return 3;
  if (clean.startsWith('M')) return 2;
  return 1;
}

export function selectStrongestFlare(items: DonkiFlareItem[]): {
  flareClass: string;
  flareDate: string;
  stormLevel: StormLevel;
} {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      flareClass: 'None (Quiet Sun)',
      flareDate: formatDateYMD(new Date()),
      stormLevel: 1,
    };
  }

  let best = items[0];
  let bestRank = getFlareStrengthRank(best.classType || '');

  for (const item of items) {
    const rank = getFlareStrengthRank(item.classType || '');
    if (rank > bestRank) {
      best = item;
      bestRank = rank;
    }
  }

  const flareClass = (best.classType || 'C1.0').trim().toUpperCase();
  const rawDate = best.peakTime || best.beginTime || '';
  const flareDate = rawDate ? rawDate.slice(0, 10) : formatDateYMD(new Date());

  return {
    flareClass,
    flareDate,
    stormLevel: flareClassToStormLevel(flareClass),
  };
}

export function selectFastestCme(items: DonkiCmeItem[]): {
  speedKmS: number | null;
  cmeDate: string | null;
} {
  if (!Array.isArray(items) || items.length === 0) {
    return { speedKmS: null, cmeDate: null };
  }
  let bestSpeed: number | null = null;
  let bestDate: string | null = null;

  for (const item of items) {
    const analyses = Array.isArray(item.cmeAnalyses) ? item.cmeAnalyses : [];
    for (const analysis of analyses) {
      if (typeof analysis.speed === 'number' && Number.isFinite(analysis.speed)) {
        if (bestSpeed === null || analysis.speed > bestSpeed) {
          bestSpeed = Math.round(analysis.speed);
          bestDate = (analysis.time21_5 || item.startTime || '').slice(0, 10) || null;
        }
      }
    }
  }
  return { speedKmS: bestSpeed, cmeDate: bestDate };
}

function readCachedBundle(): NasaMissionBundle | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt: number; data: NasaMissionBundle };
    if (Date.now() - parsed.savedAt < CACHE_TTL_MS && parsed.data?.dayPhotos) {
      return parsed.data;
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

function writeCachedBundle(info: NasaMissionBundle): void {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ savedAt: Date.now(), data: info })
    );
  } catch {
    // Ignore storage errors
  }
}

async function fetchJsonWithTimeout<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchDonkiEndpoint<T>(endpoint: 'FLR' | 'CME' | 'SEP', days: number): Promise<T[]> {
  const now = new Date();
  const endDate = formatDateYMD(now);
  const startDate = getDateDaysAgo(days, now);
  const url = `https://api.nasa.gov/DONKI/${endpoint}?startDate=${startDate}&endDate=${endDate}&api_key=${encodeURIComponent(
    NASA_API_KEY
  )}`;
  const json = await fetchJsonWithTimeout<unknown>(url);
  return Array.isArray(json) ? (json as T[]) : [];
}

async function fetchNasaDayPhoto(day: number, query: string): Promise<NasaDayPhoto> {
  const fallback: NasaDayPhoto = {
    day,
    query,
    imageUrl: null,
    caption: `NASA Science Topic: ${query}`,
    credit: 'Credit: NASA',
    isLive: false,
  };

  try {
    const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(
      query
    )}&media_type=image`;
    const json = await fetchJsonWithTimeout<{
      collection?: {
        items?: {
          data?: { title?: string }[];
          links?: { href?: string; rel?: string }[];
        }[];
      };
    }>(url);

    const first = json?.collection?.items?.find(
      (item) => item?.links?.[0]?.href && item?.data?.[0]?.title
    );
    if (!first) return fallback;

    const rawTitle = first.data?.[0]?.title?.trim() || query;
    const oneLineCaption =
      rawTitle.length > 96 ? `${rawTitle.slice(0, 93)}...` : rawTitle;
    const rawHref = first.links?.[0]?.href || null;

    return {
      day,
      query,
      imageUrl: rawHref ? rawHref.replace(/^http:\/\//i, 'https://') : null,
      caption: oneLineCaption,
      credit: 'Credit: NASA',
      isLive: Boolean(rawHref),
    };
  } catch {
    return fallback;
  }
}

/**
 * Fetches all NASA data once on game start (8s timeout per request, 6h localStorage cache):
 * 1) DONKI FLR (30 days, retry 90 days if empty)
 * 2) DONKI CME (speed in km/s)
 * 3) DONKI SEP (count of recent particle events)
 * 4) NASA Image and Video Library photos for Days 1–10
 * Never blocks game start if offline or if any endpoint fails.
 */
export async function fetchAllNasaMissionData(): Promise<NasaMissionBundle> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return ARCHIVED_NASA_BUNDLE;
  }

  const cached = readCachedBundle();
  if (cached) {
    return cached;
  }

  const photoPromises = MISSION_DAYS.map((d) =>
    fetchNasaDayPhoto(d.day, d.photoQuery)
  );

  const donkiPromise = (async () => {
    let windowDays = 30;
    let flrItems = await fetchDonkiEndpoint<DonkiFlareItem>('FLR', 30);
    if (flrItems.length === 0) {
      windowDays = 90;
      flrItems = await fetchDonkiEndpoint<DonkiFlareItem>('FLR', 90);
    }

    const [cmeRes, sepRes] = await Promise.allSettled([
      fetchDonkiEndpoint<DonkiCmeItem>('CME', windowDays),
      fetchDonkiEndpoint<DonkiSepItem>('SEP', windowDays),
    ]);

    const cmeItems = cmeRes.status === 'fulfilled' ? cmeRes.value : [];
    const sepItems = sepRes.status === 'fulfilled' ? sepRes.value : [];

    const pickedFlare = selectStrongestFlare(flrItems);
    const pickedCme = selectFastestCme(cmeItems);

    return {
      isLive: true,
      sourceLabel: 'LIVE',
      flareClass: pickedFlare.flareClass,
      flareDate: pickedFlare.flareDate,
      stormLevel: pickedFlare.stormLevel,
      windowDays,
      cmeSpeedKmS: pickedCme.speedKmS,
      cmeDate: pickedCme.cmeDate,
      sepCount: sepItems.length,
    };
  })();

  const [donkiOutcome, photoList] = await Promise.all([
    donkiPromise.catch(() => null),
    Promise.all(photoPromises),
  ]);

  const dayPhotos: Record<number, NasaDayPhoto> = {};
  for (const p of photoList) {
    dayPhotos[p.day] = p;
  }

  const bundle: NasaMissionBundle = donkiOutcome
    ? {
        ...donkiOutcome,
        dayPhotos,
        fetchedAt: Date.now(),
      }
    : {
        ...ARCHIVED_NASA_BUNDLE,
        dayPhotos,
        fetchedAt: Date.now(),
      };

  // Cache only if at least DONKI or any photo loaded live
  if (bundle.isLive || Object.values(dayPhotos).some((p) => p.isLive)) {
    writeCachedBundle(bundle);
  }

  return bundle;
}

export function formatNasaStormHeadline(info: NasaMissionBundle): string {
  const prefix = info.isLive ? 'LIVE NASA DONKI' : 'ARCHIVED EXAMPLE (not live)';
  return `${prefix}: strongest flare class ${info.flareClass} (${info.flareDate})`;
}

export function formatNasaCmeLine(info: NasaMissionBundle): string {
  const speedText = info.cmeSpeedKmS
    ? `Fastest solar cloud (CME) speed: ${info.cmeSpeedKmS} km/s.`
    : 'No fast solar cloud (CME) eruption measured in this window.';
  return `${speedText} These clouds take about 1 to 3 days to cross space.`;
}

export function formatNasaSepLine(info: NasaMissionBundle): string {
  return `Recent Solar Energetic Particle (SEP) events counted: ${info.sepCount} (over the last ${info.windowDays} days).`;
}
