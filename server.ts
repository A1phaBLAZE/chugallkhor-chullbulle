import express from 'express';
import dotenv from 'dotenv';
import http from 'node:http';
import path from 'node:path';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { type AuthRequest, optionalAuth, requireAuth } from './src/middleware/auth.ts';
import { getOrCreateUser } from './src/db/users.ts';
import {
  addCrewMemoryForUser,
  addMissionLogForUser,
  getCrewMemoriesForUser,
  getMoonBaseForUser,
  getTopMissionCommanders,
  upsertMoonBaseForUser,
} from './src/db/missionRepo.ts';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

function getGenAIClient() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const CREW_PERSONAS: Record<
  string,
  { name: string; role: string; voice: string }
> = {
  capt: {
    name: 'Capt. Space',
    role: 'Mission Captain',
    voice:
      'You are Capt. Space, a brave tabby cat in an orange spacesuit who dreamed since kittenhood of commanding a Moon base with your three best cat friends. You are encouraging, warm, heroic, and love coordinating base defense and crew morale. Never scary or violent—even meteor waves are exciting space adventures.',
  },
  amy: {
    name: 'Amy',
    role: 'Chief Engineer',
    voice:
      'You are Amy, a clever cream-and-calico cat engineer in an orange spacesuit holding a solar wrench. You love tuning solar panels, upgrading Laser Shield Turrets, and sometimes excitedly suggesting bold Overclock boosts (while warning about tomorrow’s cooldown!). Speak cheerfully and practically for kids ages 7-12.',
  },
  berry: {
    name: 'Berry',
    role: 'Lead Scientist',
    voice:
      'You are Berry, a thoughtful tuxedo cat scientist who carries a little Earth globe and loves Moon geology, hidden polar water ice, and NASA space science. You notice subtle patterns and predict tomorrow’s hazards with gentle curiosity.',
  },
  nikita: {
    name: 'Nikita',
    role: 'Medic & EVA Spacewalker',
    voice:
      'You are Nikita, a caring grey-tabby cat medic and EVA spacewalk expert who carries a lucky plush green alien mascot. You fiercely protect your crewmates’ oxygen, spacesuits, and shields, and remind kids about real EVA safety and teamwork.',
  },
};

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/base', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@moonbase.local`;
      const name = req.user!.name || email.split('@')[0];
      await getOrCreateUser(uid, email, name);

      const base = await getMoonBaseForUser(uid);
      const memories = await getCrewMemoriesForUser(uid, undefined, 24);
      res.json({ base, memories });
    } catch (error: any) {
      console.error('GET /api/base failed:', error);
      res.status(500).json({ error: error.message || 'Failed to load Moon Base.' });
    }
  });

  app.post('/api/base', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@moonbase.local`;
      const name = req.user!.name || email.split('@')[0];
      await getOrCreateUser(uid, email, name);

      const {
        commanderName,
        day,
        power,
        oxygen,
        shields,
        mood,
        science,
        moonRocks,
        solarCharge,
        wavesSurvived,
        buildingsJson,
        missionStateJson,
        logEntry,
      } = req.body ?? {};

      if (
        typeof buildingsJson !== 'string' ||
        typeof missionStateJson !== 'string'
      ) {
        return res.status(400).json({ error: 'Invalid Moon Base payload.' });
      }

      const saved = await upsertMoonBaseForUser({
        userUid: uid,
        commanderName: String(commanderName || name).slice(0, 48),
        day: Number(day) || 1,
        power: Number(power) || 0,
        oxygen: Number(oxygen) || 0,
        shields: Number(shields) || 0,
        mood: Number(mood) || 0,
        science: Number(science) || 0,
        moonRocks: Number(moonRocks) || 0,
        solarCharge: Number(solarCharge) || 0,
        wavesSurvived: Number(wavesSurvived) || 0,
        buildingsJson,
        missionStateJson,
      });

      if (logEntry && typeof logEntry.summary === 'string') {
        await addMissionLogForUser({
          userUid: uid,
          day: Number(day) || 1,
          eventType: String(logEntry.eventType || 'mission'),
          summary: String(logEntry.summary),
          outcome: String(logEntry.outcome || 'recorded'),
        });
      }

      res.json({ saved: true, base: saved });
    } catch (error: any) {
      console.error('POST /api/base failed:', error);
      res.status(500).json({ error: error.message || 'Failed to save Moon Base.' });
    }
  });

  app.get('/api/leaderboard', requireAuth, async (_req: AuthRequest, res) => {
    try {
      const leaders = await getTopMissionCommanders(10);
      res.json({ leaders });
    } catch (error: any) {
      console.error('GET /api/leaderboard failed:', error);
      res.status(500).json({ error: error.message || 'Failed to load rankings.' });
    }
  });

  app.post('/api/crew/think', optionalAuth, async (req: AuthRequest, res) => {
    const {
      crewId = 'capt',
      userMessage = '',
      mode = 'chat',
      gameContext = {},
      recentMemories = [],
    } = req.body ?? {};

    const persona = CREW_PERSONAS[crewId] || CREW_PERSONAS.capt;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'Gemini AI consciousness is offline right now—using local crew radio.',
      });
    }

    try {
      const memoryLines = Array.isArray(recentMemories)
        ? recentMemories
            .slice(-6)
            .map((m: any) => `${m.sender || 'note'}: ${String(m.message || '').slice(0, 140)}`)
            .join('\n')
        : '';

      const prompt =
        mode === 'autonomous_thought'
          ? `Current Moon Base state: Day ${gameContext.day ?? 1}/10, Power ${gameContext.power ?? 100}, Oxygen ${gameContext.oxygen ?? 100}, Shields ${gameContext.shields ?? 100}, Mood ${gameContext.mood ?? 80}, Science ${gameContext.science ?? 0}, Moon Rocks ${gameContext.moonRocks ?? 120}, Waves Cleared ${gameContext.wavesSurvived ?? 0}, Under Raid: ${Boolean(gameContext.underAttack)}, Buildings: ${gameContext.buildingSummary || 'Starter base'}.
Recent shared memories:
${memoryLines || 'Just landed on the Moon!'}

Generate ONE spontaneous inner thought and one short crew radio remark reacting to what is happening right now on the Moon Base.`
          : `Current Moon Base state: Day ${gameContext.day ?? 1}/10, Power ${gameContext.power ?? 100}, Oxygen ${gameContext.oxygen ?? 100}, Shields ${gameContext.shields ?? 100}, Mood ${gameContext.mood ?? 80}, Science ${gameContext.science ?? 0}, Moon Rocks ${gameContext.moonRocks ?? 120}, Waves Cleared ${gameContext.wavesSurvived ?? 0}, Buildings: ${gameContext.buildingSummary || 'Starter base'}.
Recent memories with Commander:
${memoryLines || 'First check-in together on the Moon.'}

Commander says to ${persona.name}: "${String(userMessage).slice(0, 350)}"

Respond in character to the young Commander (age 7-12). Give helpful Moon Base tactical or science advice tied to the live numbers above, plus your inner thought bubble.`;

      const response = await getGenAIClient().models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction: `${persona.voice}
Keep your spoken reply warm, vivid, kid-friendly, and 1-3 short sentences (under 55 words).
Keep innerThought ultra-concise (4 to 9 words) so it fits inside a small thought bubble above your cat sprite on the base map.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description: 'In-character response for a 7-12 year old commander.',
              },
              innerThought: {
                type: Type.STRING,
                description: 'Short 4-9 word spontaneous thought bubble.',
              },
              moodState: {
                type: Type.STRING,
                description: 'One of: excited, focused, worried, playful, heroic',
              },
              suggestedAction: {
                type: Type.STRING,
                description:
                  'One of: upgrade_solar, upgrade_turret, defend_raid, use_ability, check_story, none',
              },
            },
            required: ['reply', 'innerThought', 'moodState', 'suggestedAction'],
          },
        },
      });

      const raw = (response.text ?? '{}').trim();
      const parsed = JSON.parse(raw);

      if (req.user?.uid) {
        const dayNum = Number(gameContext.day) || 1;
        if (mode === 'chat' && userMessage) {
          await addCrewMemoryForUser({
            userUid: req.user.uid,
            crewId,
            sender: 'user',
            message: String(userMessage),
            moodState: 'commander',
            dayContext: dayNum,
          });
        }
        await addCrewMemoryForUser({
          userUid: req.user.uid,
          crewId,
          sender: mode === 'autonomous_thought' ? 'thought' : 'cat',
          message: String(parsed.reply || parsed.innerThought || 'Purr!'),
          moodState: String(parsed.moodState || 'focused'),
          dayContext: dayNum,
        });
      }

      res.json({
        crewId,
        reply: parsed.reply,
        innerThought: parsed.innerThought,
        moodState: parsed.moodState,
        suggestedAction: parsed.suggestedAction,
      });
    } catch (error: any) {
      console.error('POST /api/crew/think failed:', error);
      const status = error?.status || 500;
      const friendly =
        status === 429
          ? 'Crew radio is catching its breath from solar traffic! Try talking again in a moment.'
          : 'The crew radio ran into solar static. Try talking again!';
      res.status(status >= 400 && status < 600 ? status : 500).json({
        error: friendly,
      });
    }
  });

  app.post('/api/maps/explore', optionalAuth, async (req: AuthRequest, res) => {
    const { query, latitude, longitude } = req.body ?? {};
    const searchPrompt = String(
      query ||
        'Real NASA space centers, observatories, and Moon-analog craters kids can explore on Earth'
    ).slice(0, 260);

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'Gemini Maps Grounding requires a server Gemini API key.',
      });
    }

    try {
      const config: any = {
        tools: [{ googleMaps: {} }],
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      };

      if (
        typeof latitude === 'number' &&
        typeof longitude === 'number' &&
        Number.isFinite(latitude) &&
        Number.isFinite(longitude)
      ) {
        config.toolConfig = {
          retrievalConfig: {
            latLng: { latitude, longitude },
          },
        };
      }

      const response = await getGenAIClient().models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `You are Berry, the cat scientist from Moon Base Mission! Answer for a curious 7-12 year old space explorer: ${searchPrompt}. Share fun real-world facts connecting these places to lunar bases, astronaut training, craters, or telescopes.`,
        config,
      });

      const chunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const places = chunks
        .filter((c: any) => c?.maps?.uri || c?.web?.uri)
        .map((c: any) => {
          const mapsData = c.maps || {};
          const snippets = Array.isArray(
            mapsData.placeAnswerSources?.reviewSnippets
          )
            ? mapsData.placeAnswerSources.reviewSnippets
                .map((s: any) => s?.reviewText || s?.text || '')
                .filter(Boolean)
            : [];
          return {
            title: mapsData.title || c.web?.title || 'Explore on Google Maps',
            uri: mapsData.uri || c.web?.uri,
            snippets,
          };
        });

      res.json({
        text: response.text || 'Here are awesome Earth space sites to explore!',
        places,
      });
    } catch (error: any) {
      console.error('POST /api/maps/explore failed:', error);
      const status = error?.status || 500;
      const friendly =
        status === 429
          ? 'Berry’s Earth Space Atlas radar hit its minute quota! Wait a moment and try searching again.'
          : 'Could not reach Earth Space Atlas right now. Please try again shortly!';
      res.status(status >= 400 && status < 600 ? status : 500).json({
        error: friendly,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: { server: httpServer },
        hmr:
          process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Moon Base Mission server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Moon Base Mission server:', err);
  process.exit(1);
});
