# Moon Base Mission

**Team CHUGALKHOR CHULBULE - NASA Space Apps Challenge 2026 (Amaravati)**

Four cat astronauts must keep a Moon base alive for 10 days and launch before the 14-day lunar night. Kids aged 7 to 12 make every decision. There are no free choices: each option helps one thing and hurts another.

**Play the game:** https://moon-base-mission.ai.studio

## Team
- Shatakshi Verma (Group Leader)
- Bibhuprasad Mohapatra
- Arpana Dubey
- Nancy Dubey

## Features
- 4 equal systems: Power, Air and Water, Radiation Protection, Food (plus Crew Mood and Science)
- Real NASA data (DONKI solar flares, CME, SEP and the NASA Image and Video Library), labelled LIVE or ARCHIVED
- Kind failure: a Mission Control debrief explains the science and kids try again
- 10 touch mini-games, stars, 10 badges, read-aloud, Easy Mode, calm music
- Installable offline app (PWA), auto-save, no account needed

## NASA data used
- NASA DONKI: solar flares (FLR), coronal mass ejections (CME), solar energetic particles (SEP)
- NASA Image and Video Library
- Flare class sets the in-game storm level. If NASA does not respond, the game shows ARCHIVED data and never claims it is live.

## AI tools used
- Google AI Studio (prompt-driven build) wrote most of the code from our prompts
- Google Gemini made the intro and ending video clips
- The design, rules, science, story, art direction and testing are ours

## Tech
React, TypeScript, Vite, Tailwind CSS, Motion, PWA

## Project structure
- Game rules: src/game/engine.ts and src/game/gameData.ts
- NASA data: src/game/nasaService.ts
- Screens: src/App.tsx and src/components/

## How we built it
We read the challenge brief, designed the game on paper first, then built it in rounds with Google AI Studio: core game, real NASA data, realism, kid-friendly fun, calm sound and offline play, testing.

## Credits
NASA DONKI and NASA Image and Video Library, Google Fonts, AI-generated video clips, team-made artwork.
