import {
  BonusEvent,
  CrewId,
  CrewMember,
  DayDefinition,
  FailDebriefInfo,
  FailReason,
  GameState,
  MeterKey,
  MiniGameConfig,
  MissionControlCardInfo,
  MissionPatchBadge,
  StormLevel,
} from './types';

// ============================================================================
// TOP-LEVEL CONFIGURATION (Keep key and video URLs intact!)
// ============================================================================

export const NASA_API_KEY = 'jtQp8gcRttGjd9rcN7fNF8p96fMjMwDr9FFLMTgt';

// Replace placeholder strings with real MP4/WebM URLs whenever you are ready.
// The game automatically plays an animated story card if a clip is still a placeholder or fails to load.
export const VIDEO_CONFIG = {
  intro: '/assets/aistudio/gemini_generated_video_bddf33a6_825ec56d.mp4',
  crisis: '[PASTE_CRISIS_CLIP]',
  fail: '[PASTE_FAIL_VIDEO]',
  gold: '[PASTE_GOLD_VIDEO]',
};

// ============================================================================
// CREW ROSTER (Uses /capt.png, /amy.png, /berry.png, /nikita.png)
// ============================================================================

export const CREW_MEMBERS: CrewMember[] = [
  {
    id: 'capt',
    name: 'Capt. Space',
    role: 'Mission Captain',
    avatar: '/capt.png',
    abilityName: 'Rally',
    abilityShort: 'Mood +15',
    abilityDescription:
      'Gives an inspiring pep talk! Crew Mood +15, costs 5 Power. Ready again in 3 days.',
    cooldownDays: 3,
    accentColor: '#F97316',
  },
  {
    id: 'amy',
    name: 'Amy',
    role: 'Chief Engineer',
    avatar: '/amy.png',
    abilityName: 'Overclock',
    abilityShort: '+15 Now / -25 Next',
    abilityDescription:
      'Pushes one base system super hard! Pick a meter to get +15 today, then -25 tomorrow. Ready in 3 days.',
    cooldownDays: 3,
    accentColor: '#FACC15',
  },
  {
    id: 'berry',
    name: 'Berry',
    role: 'Lead Scientist',
    avatar: '/berry.png',
    abilityName: 'Deep Scan',
    abilityShort: 'See Tomorrow',
    abilityDescription:
      "Peeks ahead at tomorrow's crisis and its hidden risk! Uses the whole day (no other choice today).",
    cooldownDays: 0,
    accentColor: '#A78BFA',
  },
  {
    id: 'nikita',
    name: 'Nikita',
    role: 'Medic & Spacewalker',
    avatar: '/nikita.png',
    abilityName: 'Triage',
    abilityShort: '1x Rescue',
    abilityDescription:
      'Cures radiation sickness or saves a hurt crewmate. Can only be used ONCE all mission!',
    cooldownDays: 99,
    accentColor: '#38BDF8',
  },
];

// ============================================================================
// FOUR EQUAL BASE SYSTEMS + CREW MOOD (Mission Control Cards)
// ============================================================================

export const MISSION_CONTROL_CARDS: Record<MeterKey, MissionControlCardInfo> = {
  power: {
    key: 'power',
    title: 'Power',
    colorName: 'Yellow',
    whatIsIt:
      'Electricity made by solar panels in sunlight and stored inside Moon base batteries.',
    whyCrewNeedsIt:
      'Power runs heaters, air filters, plant grow lights, radios to Earth, and launch checks.',
    realFact:
      'Near the Moon’s south pole, sunlight stays low before sunset, and the dark Moon night lasts about 14 Earth days!',
    sourceName: 'NASA Artemis Program',
  },
  airWater: {
    key: 'airWater',
    title: 'Air & Water',
    colorName: 'Blue',
    whatIsIt:
      'Clean oxygen to breathe, filters that remove carbon dioxide, and recycled drinking water.',
    whyCrewNeedsIt:
      'The Moon has no breathable air or rivers, so life support cleans and reuses air and water every hour.',
    realFact:
      'On the International Space Station, crews recycle about 98% of their water and split water with electricity to make oxygen!',
    sourceName: 'NASA Life Support (ECLSS)',
  },
  radiation: {
    key: 'radiation',
    title: 'Radiation Protection',
    colorName: 'Purple',
    whatIsIt:
      'Thick base walls, storm shelters, and water shields that block invisible space energy rays.',
    whyCrewNeedsIt:
      'Strong space radiation from solar storms or spacewalks can hurt astronauts if they are not shielded.',
    realFact:
      'Unlike Earth, the Moon has almost no air and no global magnetic field to block space radiation.',
    sourceName: 'NASA DONKI Space Weather',
  },
  food: {
    key: 'food',
    title: 'Food',
    colorName: 'Green',
    whatIsIt:
      'Packed space meals brought from Earth plus fresh leafy plants grown under grow lights.',
    whyCrewNeedsIt:
      'Astronauts burn lots of energy staying warm, exercising in low gravity, and running base science.',
    realFact:
      'NASA astronauts on the space station have grown red romaine lettuce, radishes, and chile peppers in space!',
    sourceName: 'NASA Veggie Plant Habitat',
  },
  mood: {
    key: 'mood',
    title: 'Crew Mood',
    colorName: 'Pink',
    whatIsIt:
      'How cheerful, rested, and friendly our four cat astronauts feel inside the dome.',
    whyCrewNeedsIt:
      'Happy crews solve hard problems cleanly. If Mood hits 0, stress causes a big mistake (-30 to a system)!',
    realFact:
      'Real NASA crews schedule group meals, exercise, and chats with family on Earth to keep morale strong.',
    sourceName: 'NASA Behavioral Health (OSDR)',
  },
};

export const BASE_SYSTEM_ORDER: ('power' | 'airWater' | 'radiation' | 'food')[] = [
  'power',
  'airWater',
  'radiation',
  'food',
];

// ============================================================================
// DAY 10 LAUNCH CHECKLIST MINI-GAME CONFIG
// ============================================================================

export const DAY10_LAUNCH_MINIGAME: MiniGameConfig = {
  id: 'launch_checklist',
  title: 'Launch checklist',
  howToPlay: 'Tap all 4 system lights to turn ready ones green before liftoff!',
  durationSec: 12,
  astronautFactLine:
    'Real astronauts run a go/no-go check on every life-support system before launch!',
};

// ============================================================================
// MISSION PATCH BADGES (Days 1-10, earned via right Quick Question answers)
// ============================================================================

export const MISSION_PATCH_BADGES: MissionPatchBadge[] = [
  { day: 1, title: 'Dust Buster', icon: 'brush' },
  { day: 2, title: 'Air Hero', icon: 'bubble' },
  { day: 3, title: 'Storm Shield', icon: 'shield' },
  { day: 4, title: 'Space Gardener', icon: 'plant' },
  { day: 5, title: 'Sun Catcher', icon: 'sun' },
  { day: 6, title: 'Ice Finder', icon: 'ice' },
  { day: 7, title: 'Space Athlete', icon: 'dumbbell' },
  { day: 8, title: 'EVA Pro', icon: 'helmet' },
  { day: 9, title: 'Earth Link', icon: 'antenna' },
  { day: 10, title: 'Artemis Pilot', icon: 'rocket' },
];

// ============================================================================
// THE 10 MISSION DAYS
// ============================================================================

export const MISSION_DAYS: DayDefinition[] = [
  {
    day: 1,
    title: 'Moon Dust Landing',
    focusSystem: 'power',
    photoQuery: 'lunar dust Apollo',
    story:
      'Touchdown near the Moon’s south pole, 10 days before sunset! Landing blasted gray Moon dust onto our solar panels.',
    didYouKnow:
      'Moon dust is tiny and sharp because there is no wind or rain on the Moon to smooth it down, and it clings tightly to spacesuits and gear.',
    realScienceBox:
      'Apollo astronauts saw sharp lunar dust stick to solar panels, suit zippers, and helmets.',
    inGameRuleBox:
      'Brushing panels gives +15 Power (+7 if mini-game missed), at a Mood (-5) and Radiation (-3) cost.',
    hiddenRiskSummary:
      'Skipping the solar panel clean drops Power (-10) right away before sunset gets closer.',
    quickQuestion: {
      prompt: 'Why is Moon dust a problem?',
      options: [
        'It is sharp and sticks to things',
        'It is wet and slippery like mud',
        'It blows away in Moon wind',
      ],
      correctIndex: 0,
      rightCheer: 'Purr-fect! No wind or rain ever smoothed Moon dust, so it stays jagged and sticky!',
      wrongHint: 'Good try! Moon dust is actually sharp and clings to suits like static.',
    },
    choices: [
      {
        id: 'd1_a',
        label: 'Brush solar panels on a spacewalk',
        hint: 'Power +15 · Mood -5 · Radiation -3',
        miniGame: {
          id: 'wipe_dust',
          title: 'Wipe the dust',
          howToPlay: 'Swipe across the dusty solar panel spots until at least 80% is clean!',
          durationSec: 10,
          astronautFactLine:
            'Real astronauts use special brushes to sweep sticky lunar dust off panels and lenses!',
        },
        effect: { power: 15, mood: -5, radiation: -3 },
      },
      {
        id: 'd1_b',
        label: 'Start science tests first',
        hint: 'Science +10 · Power -10',
        effect: { science: 10, power: -10 },
      },
      {
        id: 'd1_c',
        label: 'Quick wipe of one solar panel',
        hint: 'Power +5 · Science +5',
        effect: { power: 5, science: 5 },
      },
    ],
  },
  {
    day: 2,
    title: 'Clean Air & Water',
    focusSystem: 'airWater',
    photoQuery: 'space station water recovery',
    story:
      'Beep-boop! The air scrubber hums loudly and a filter light blinks amber.',
    didYouKnow:
      'Astronauts breathe out carbon dioxide, which filters must remove. The International Space Station recycles about 98% of its water and splits water with electricity for oxygen!',
    realScienceBox:
      'Real spacecraft scrub out carbon dioxide gas and recycle almost every drop of moisture for fresh air and water.',
    inGameRuleBox:
      'Swapping the filter gives +25 Air & Water (+12 if mini-game missed) for Power (-5).',
    hiddenRiskSummary:
      'Running the scrubber at maximum speed gives +20 Air & Water today, then wears down for -10 Air & Water tomorrow.',
    quickQuestion: {
      prompt: 'What gas do astronauts breathe out that must be removed?',
      options: ['Carbon dioxide', 'Helium', 'Liquid nitrogen'],
      correctIndex: 0,
      rightCheer: 'Spot on! Scrubbers catch carbon dioxide so cabin air stays safe to breathe!',
      wrongHint: 'Almost! People breathe in oxygen and breathe out carbon dioxide.',
    },
    choices: [
      {
        id: 'd2_a',
        label: 'Swap the CO2 filter properly',
        hint: 'Air & Water +25 · Power -5',
        miniGame: {
          id: 'pop_co2',
          title: 'Pop the carbon dioxide',
          howToPlay: 'Tap 8 floating CO2 bubbles before the timer runs out!',
          durationSec: 10,
          astronautFactLine:
            'Real astronauts swap carbon dioxide filter canisters on schedule to keep air fresh!',
        },
        effect: { airWater: 25, power: -5 },
      },
      {
        id: 'd2_b',
        label: 'Run the scrubber at maximum speed',
        hint: 'Air & Water +20 · Power -10 (wears tomorrow)',
        hiddenHint: 'Tomorrow: Air & Water -10!',
        effect: {
          airWater: 20,
          power: -10,
          tomorrowDelta: {
            meter: 'airWater',
            delta: -10,
            source: 'Overworked CO2 scrubber slowed down',
          },
        },
      },
      {
        id: 'd2_c',
        label: 'Ignore the warning and do science',
        hint: 'Science +10 · Air & Water -15',
        effect: { science: 10, airWater: -15 },
      },
    ],
  },
  {
    day: 3,
    title: 'Solar Storm Alert!',
    focusSystem: 'radiation',
    photoQuery: 'solar flare',
    story:
      'Space weather alarm! A bright flash erupted on the Sun, sending solar storm particles our way.',
    didYouKnow:
      'The Moon has almost no air and no global magnetic field to block space radiation. Flare light reaches the Moon in about 8 minutes!',
    newWord: {
      term: 'Solar flare & radiation',
      definition:
        'A solar flare is a sudden bright burst on the Sun. Space radiation is invisible energy rays that thick walls or water can block.',
    },
    realScienceBox:
      'Earth’s magnetic field shields us, so on the Moon crews shelter behind thick walls or water bags.',
    inGameRuleBox:
      'Stacking water tanks adds +15 Radiation (+7 if mini-game missed) using Water (-10) and Power (-5).',
    isStormDay: true,
    hiddenRiskSummary:
      'Working outside during a Level 3 storm drops Radiation Protection by 45 points (15 x Storm Level)!',
    quickQuestion: {
      prompt: 'Why can solar storms be riskier on the Moon than at home on Earth?',
      options: [
        'The Moon has no thick air or magnetic field to block radiation',
        'The Moon is closer to the Sun than Mercury',
        'Rainclouds on the Moon trap extra lightning',
      ],
      correctIndex: 0,
      rightCheer: 'Smart thinking! Earth’s magnetic bubble and air shield us like a cozy umbrella!',
      wrongHint: 'Nice try! Unlike Earth, the Moon has no thick air or magnetic field to block radiation.',
    },
    choices: [
      {
        id: 'd3_a',
        label: 'Hide inside the storm shelter',
        hint: 'Power -10 · Mood -5 · Crew stays safe',
        effect: { power: -10, mood: -5 },
      },
      {
        id: 'd3_b',
        label: 'Keep working outside in suits',
        hint: 'Science +10 · Radiation drops 15 × Storm Level!',
        hiddenHint: 'Drops Radiation Protection by 15 × NASA Storm Level!',
        effect: {
          science: 10,
          stormRadiationMultiplier: -15,
        },
      },
      {
        id: 'd3_c',
        label: 'Stack water tanks around shelter walls',
        hint: 'Radiation +15 · Air & Water -10 · Power -5',
        miniGame: {
          id: 'stack_tanks',
          title: 'Stack the water tanks',
          howToPlay: 'Drag the 3 blue water tanks onto the glowing outlines around the shelter!',
          durationSec: 12,
          astronautFactLine:
            'Real spacecraft line storm shelters with water bags to absorb space radiation!',
        },
        effect: { radiation: 15, airWater: -10, power: -5 },
      },
    ],
  },
  {
    day: 4,
    title: 'Growing Space Food',
    focusSystem: 'food',
    photoQuery: 'Veggie lettuce space station',
    story:
      'Lunchtime check! Berry inspects our plant trays while the cats count packed snack pouches.',
    didYouKnow:
      'Astronauts on the space station have grown red romaine lettuce, radishes, and chile peppers! Fresh plants add vitamins and cheer, though they need light and water.',
    realScienceBox:
      'NASA’s Veggie plant boxes grow real salads under colorful LED lights—feeding crews and lifting spirits.',
    inGameRuleBox:
      'Running grow lights gives +15 Food & +5 Mood (halved if mini-game missed), costing Power (-10) and Water (-5).',
    hiddenRiskSummary:
      'Running grow lights needs 10 Power and 5 Water, so watch low meters before choosing!',
    quickQuestion: {
      prompt: 'What have astronauts grown on the space station?',
      options: [
        'Lettuce and peppers',
        'Tall coconut palm trees',
        'Watermelons and pumpkins',
      ],
      correctIndex: 0,
      rightCheer: 'Yum! Space station crews really harvested crunchy lettuce and spicy chile peppers!',
      wrongHint: 'Close! Astronauts grew small leafy veggies like lettuce and peppers inside plant boxes.',
    },
    choices: [
      {
        id: 'd4_a',
        label: 'Run grow lights all day for a big harvest',
        hint: 'Food +15 · Mood +5 · Power -10 · Air & Water -5',
        miniGame: {
          id: 'water_plants',
          title: 'Water the plants',
          howToPlay: 'Tap each of the 5 plants once, then tap the Light button!',
          durationSec: 10,
          astronautFactLine:
            'Real astronauts carefully water plant pillows and flip on LED lights each day!',
        },
        effect: { food: 15, mood: 5, power: -10, airWater: -5 },
      },
      {
        id: 'd4_b',
        label: 'Eat packed meals only today',
        hint: 'Food -5 · Mood -5',
        effect: { food: -5, mood: -5 },
      },
      {
        id: 'd4_c',
        label: 'Tend a small plant shelf',
        hint: 'Food +8 · Science +5 · Power -4',
        effect: { food: 8, science: 5, power: -4 },
      },
    ],
  },
  {
    day: 5,
    title: 'The Sun Gets Lower',
    focusSystem: 'power',
    photoQuery: 'Moon south pole',
    story:
      'Halfway to launch day! Near the Moon’s south pole, the Sun skims lower along crater hills.',
    didYouKnow:
      'Near the Moon’s poles the Sun stays low on the horizon, and soon sunset will start a freezing lunar night lasting about 14 Earth days with no sunlight.',
    realScienceBox:
      'The Moon spins much slower than Earth, so one lunar night lasts about 14 dark Earth days.',
    inGameRuleBox:
      'Tilting panels toward the low Sun adds +12 Power (+6 if mini-game missed) for Mood (-5) and Radiation (-4).',
    hiddenRiskSummary:
      'No hidden trap today—protect Power so our batteries stay strong through launch!',
    quickQuestion: {
      prompt: 'How long is the Moon’s night?',
      options: ['About 14 Earth days', 'About 8 hours', 'Only 20 minutes'],
      correctIndex: 0,
      rightCheer: 'Gold star! One Moon night lasts about 14 Earth days without any sunshine!',
      wrongHint: 'Good guess! Because the Moon turns slowly, its night lasts about 14 Earth days.',
    },
    choices: [
      {
        id: 'd5_a',
        label: 'Tilt and move solar panels on a spacewalk',
        hint: 'Power +12 · Mood -5 · Radiation -4',
        miniGame: {
          id: 'face_sun',
          title: 'Face the Sun',
          howToPlay: 'Slide the tilt bar until the power meter hits its glowing green peak!',
          durationSec: 10,
          astronautFactLine:
            'Real engineers tilt solar arrays to follow the low Sun along lunar crater rims!',
        },
        effect: { power: 12, mood: -5, radiation: -4 },
      },
      {
        id: 'd5_b',
        label: 'Switch off non-essential machines',
        hint: 'Power +15 · Science -5 · Mood -3',
        effect: { power: 15, science: -5, mood: -3 },
      },
      {
        id: 'd5_c',
        label: 'Keep every machine and lab running',
        hint: 'Science +10 · Power -10',
        effect: { science: 10, power: -10 },
      },
    ],
  },
  {
    day: 6,
    title: 'Hidden Water Ice',
    focusSystem: 'airWater',
    photoQuery: 'Moon shadowed crater',
    story:
      'Look at the radar map! Ancient frozen water ice hides inside a dark crater nearby.',
    didYouKnow:
      'NASA discovered water ice inside permanently shadowed craters near the Moon’s poles, where temperatures stay colder than minus 200°C!',
    realScienceBox:
      'Dark polar craters never get sunlight, keeping ice frozen so crews could melt it for water and oxygen.',
    inGameRuleBox:
      'Sending the rover earns +20 Science (+10 if mini-game missed) while spending Power (-10) and Radiation (-5).',
    hiddenRiskSummary:
      'Sampling the shadowed crater costs 10 Power and 5 Radiation Protection.',
    quickQuestion: {
      prompt: 'Where might water ice hide near the Moon’s poles?',
      options: [
        'In craters that never get sunlight',
        'In warm tropical Moon oceans',
        'Under grassy Moon meadows',
      ],
      correctIndex: 0,
      rightCheer: 'Brilliant! Sunlight never reaches deep polar crater floors, keeping ice frozen!',
      wrongHint: 'Not quite! Ice survives in deep craters near the poles that never get sunlight.',
    },
    choices: [
      {
        id: 'd6_a',
        label: 'Send the rover into the shadowed crater',
        hint: 'Science +20 · Power -10 · Radiation -5',
        miniGame: {
          id: 'find_ice',
          title: 'Find the ice',
          howToPlay: 'Tap the crater that glows blue-white—your rover gets 3 tries!',
          durationSec: 10,
          astronautFactLine:
            'Real NASA rovers like VIPER use headlights to hunt for hidden ice inside dark craters!',
        },
        effect: { science: 20, power: -10, radiation: -5 },
      },
      {
        id: 'd6_b',
        label: 'Melt an ice sample for clean water',
        hint: 'Air & Water +15 · Science +5 · Power -8',
        effect: { airWater: 15, science: 5, power: -8 },
      },
      {
        id: 'd6_c',
        label: 'Stay cozy inside the base today',
        hint: 'Mood +5 · Science -5',
        effect: { mood: 5, science: -5 },
      },
    ],
  },
  {
    day: 7,
    title: 'Staying Strong',
    focusSystem: 'food',
    photoQuery: 'astronaut exercise space station',
    story:
      'Seven days in low gravity! After a whole week inside, our four cats need exercise and teamwork.',
    didYouKnow:
      'Moon gravity is only about one-sixth of Earth’s! Real astronauts exercise about two hours every day so their muscles and bones stay strong.',
    realScienceBox:
      'In low gravity, muscles and bones get weaker fast—so astronauts pedal bikes and lift weights daily.',
    inGameRuleBox:
      'Exercise earns +5 Mood & +5 Science (halved if mini-game missed), burning Food (-8) and Power (-4).',
    hiddenRiskSummary:
      'If Mood ever hits 0, the crew loses 30 points in a random base system and refuses one ability next day.',
    quickQuestion: {
      prompt: 'Why do astronauts exercise in space?',
      options: [
        'Low gravity makes muscles and bones weaker',
        'To make their helmets grow bigger',
        'Because running powers the whole rocket',
      ],
      correctIndex: 0,
      rightCheer: 'Way to go! Daily exercise keeps astronauts’ muscles and bones healthy in weak gravity!',
      wrongHint: 'Nice try! In low gravity, muscles and bones get weaker without daily exercise.',
    },
    choices: [
      {
        id: 'd7_a',
        label: 'Run a bouncy crew exercise session',
        hint: 'Mood +5 · Science +5 · Food -8 · Power -4',
        miniGame: {
          id: 'pedal_power',
          title: 'Pedal power',
          howToPlay: 'Tap the Pedal button 20 times in 8 seconds!',
          durationSec: 8,
          astronautFactLine:
            'Real astronauts pedal space bikes for fitness checks and to keep bones strong!',
        },
        effect: { mood: 5, science: 5, food: -8, power: -4 },
      },
      {
        id: 'd7_b',
        label: 'Share a warm team dinner together',
        hint: 'Mood +15 · Food -10',
        effect: { mood: 15, food: -10 },
      },
      {
        id: 'd7_c',
        label: 'Take a quiet rest day',
        hint: 'Mood +10 · Science -5',
        effect: { mood: 10, science: -5 },
      },
    ],
  },
  {
    day: 8,
    title: 'Rover Spacewalk (EVA)',
    focusSystem: 'radiation',
    photoQuery: 'astronaut spacewalk',
    story:
      'Our rover wedged a wheel in powdery Moon soil! Nikita checks space weather before stepping out.',
    didYouKnow:
      'Spacewalking astronauts have thinner shielding outside the base, so Mission Control watches solar storm and energetic particle forecasts carefully.',
    newWord: {
      term: 'EVA (Spacewalk)',
      definition:
        'Extra-Vehicular Activity: stepping outside the Moon base in a pressurized spacesuit.',
    },
    realScienceBox:
      'Spacesuits hold air, yet dome walls block way more radiation—so NASA keeps spacewalks short.',
    inGameRuleBox:
      'Nikita’s EVA earns +15 Science (+7 if mini-game missed), costs 5 × Storm Level Radiation, and risks sickness if Triage is used.',
    isEvaDay: true,
    hiddenRiskSummary:
      'Stepping outside costs 5 x Storm Level Radiation Protection and risks radiation sickness unless Nikita’s Triage is still ready!',
    quickQuestion: {
      prompt: 'What helps protect astronauts outside the base?',
      options: [
        'Spending less time outside and watching space weather forecasts',
        'Taking off their spacesuit gloves to move faster',
        'Bringing umbrellas to stop space rays',
      ],
      correctIndex: 0,
      rightCheer: 'Awesome! Checking space weather and keeping EVAs short keeps spacewalkers safer!',
      wrongHint: 'Good effort! Astronauts stay safer by limiting time outside and watching space weather.',
    },
    choices: [
      {
        id: 'd8_a',
        label: 'Nikita spacewalks (EVA) to free the rover',
        hint: 'Science +15 · Radiation -5 × Storm Level (EVA risk!)',
        hiddenHint: 'Risk of radiation sickness unless Triage is ready!',
        miniGame: {
          id: 'spacewalk_dash',
          title: 'Spacewalk dash',
          howToPlay: 'Tap handrails 1 to 8 in order before the radiation bar fills up!',
          durationSec: 10,
          astronautFactLine:
            'Real spacewalkers move fast along numbered handrails to limit time outside!',
        },
        effect: {
          science: 15,
          stormRadiationMultiplier: -5,
          riskRadiationIfNoTriage: true,
        },
      },
      {
        id: 'd8_b',
        label: 'Pull the rover free with the robot arm',
        hint: 'Power -15 · Science +5',
        effect: { power: -15, science: 5 },
      },
      {
        id: 'd8_c',
        label: 'Leave the rover stuck outside',
        hint: 'Science -10 · Mood -5',
        effect: { science: -10, mood: -5 },
      },
    ],
  },
  {
    day: 9,
    title: 'Calling Earth',
    focusSystem: 'power',
    photoQuery: 'Earth from the Moon',
    story:
      'One day left before sunset! Tall south-pole crater walls weaken our radio link to Earth.',
    didYouKnow:
      'A radio signal takes about 1.3 seconds from Earth to the Moon (about 2.6 seconds round trip!), and crews behind Moon hills need a relay satellite.',
    newWord: {
      term: 'Radio delay',
      definition:
        'Radio waves zip at the speed of light, taking ~1.3 seconds each way between Earth and the Moon.',
    },
    realScienceBox:
      'Even at light speed, radio signals take ~1.3 seconds each way—so Earth answers after a 2.6-second pause!',
    inGameRuleBox:
      'Powering the antenna (-15 Power) reveals exact Day 10 launch needs. Backup radio adds +10 extra launch Power.',
    hiddenRiskSummary:
      'Using the low-power backup radio adds +10 extra Power required on Launch Day (60 instead of 50)!',
    quickQuestion: {
      prompt: 'How long does a radio message take from Earth to the Moon?',
      options: [
        'About 1.3 seconds',
        'About 5 full days',
        'Exactly 10 hours',
      ],
      correctIndex: 0,
      rightCheer: 'Bullseye! Light and radio travel from Earth to the Moon in about 1.3 seconds!',
      wrongHint: 'Close! Radio moves at the speed of light, taking about 1.3 seconds one way.',
    },
    choices: [
      {
        id: 'd9_a',
        label: 'Power the big antenna to talk clearly with Earth',
        hint: 'Power -15 · Reveals Day 10 launch numbers',
        miniGame: {
          id: 'point_antenna',
          title: 'Point the antenna',
          howToPlay: 'Slide the dish until all 5 signal bars fill and Earth lights up!',
          durationSec: 10,
          astronautFactLine:
            'Real lunar bases aim dish antennas straight at Earth to send clear mission data!',
        },
        effect: { power: -15, revealsLaunchReq: true },
      },
      {
        id: 'd9_b',
        label: 'Use low-power backup radio',
        hint: 'Power -5 · Mood -5 (may need extra launch prep)',
        hiddenHint: 'Hidden cost: Day 10 launch needs +10 extra Power!',
        effect: { power: -5, mood: -5, hiddenExtraLaunchPower: 10 },
      },
      {
        id: 'd9_c',
        label: 'Wait patiently for a clearer bounce',
        hint: 'Mood +5 · Air & Water -5',
        effect: { mood: 5, airWater: -5 },
      },
    ],
  },
  {
    day: 10,
    title: 'Launch Day Before Sunset!',
    focusSystem: 'launch',
    photoQuery: 'Artemis',
    story:
      'The ascent rocket gleams at the launch pad! Check all four systems and launch before the 14-day night.',
    didYouKnow:
      'NASA’s Artemis program plans to return astronauts to the Moon near the south pole to explore water ice and test living on another world.',
    realScienceBox:
      'Real Artemis missions target sunlit south-pole ridges and launch home before the 14-day lunar freeze.',
    inGameRuleBox:
      'Launch needs Power 50 (60 with backup radio), Air & Water 30, Radiation 30, Food 20. Gold needs Science > 100 and all 4 > 40!',
    hiddenRiskSummary:
      'You can run a pre-launch Safety Check: spend 10 Power to add +10 Radiation Protection before liftoff!',
    quickQuestion: {
      prompt: 'Which NASA program plans to return astronauts to the Moon?',
      options: ['Artemis', 'Voyager', 'Pioneer'],
      correctIndex: 0,
      rightCheer: 'Hooray! NASA’s Artemis program is returning explorers to the Moon!',
      wrongHint: 'Good try! Apollo visited first, and today NASA’s Artemis program is returning to the Moon.',
    },
    choices: [],
  },
];

// ============================================================================
// 6 RANDOM BONUS EVENTS (2 different days per playthrough get 1 bonus event)
// ============================================================================

export const BONUS_EVENTS: BonusEvent[] = [
  {
    id: 'lucky_sunny_spot',
    title: 'Lucky Sunny Spot',
    description: 'Bright sunlight bounced off a shiny crater straight onto your solar panels!',
    deltas: { power: 5 },
  },
  {
    id: 'small_dust_leak',
    title: 'Small Dust Leak',
    description: 'A dusty door seal hissed softly before snapping tight again.',
    deltas: { airWater: -5 },
  },
  {
    id: 'crew_birthday',
    title: 'Crew Birthday!',
    description: 'Berry found a hidden tin of birthday space-tuna biscuits!',
    deltas: { mood: 10 },
  },
  {
    id: 'moon_crystal',
    title: 'Shiny Moon Rock',
    description: 'Amy spotted a glittering basalt pebble right beside the rover ramp.',
    deltas: { science: 8 },
  },
  {
    id: 'extra_water_shield',
    title: 'Spare Foil Patch',
    description: 'Capt. Space tucked extra reflective foil onto the dome roof.',
    deltas: { radiation: 6 },
  },
  {
    id: 'greenhouse_sprout',
    title: 'Fast Sprout Harvest',
    description: 'A lucky batch of space radishes sprouted early in the tray!',
    deltas: { food: 6 },
  },
];

// ============================================================================
// FAIL DEBRIEFS (Kind crew line + Plain-language real science explanations)
// ============================================================================

export const FAIL_DEBRIEFS: Record<FailReason, FailDebriefInfo> = {
  POWER_EMPTY: {
    reason: 'POWER_EMPTY',
    title: 'Lights Out!',
    subtitle: 'Base Power hit 0%, so emergency pods lifted the four cats safely to orbit.',
    crewEncouragement:
      'Amy: "Great try, Commander! Let’s brush dust and guard our batteries next run!"',
    scienceReason:
      'A Moon base needs constant electricity for heaters, air scrubbers, water pumps, and radios—especially before the 14-day lunar night.',
    tip: 'Brush dust on Day 1 and protect Power before Day 9 so you reach Launch Day with plenty of charge.',
  },
  AIR_WATER_EMPTY: {
    reason: 'AIR_WATER_EMPTY',
    title: 'Not Enough Air!',
    subtitle: 'Air & Water hit 0%. Emergency return pods carried everyone safely to orbit.',
    crewEncouragement:
      'Nikita: "Every astronaut learns from a test flight! Ready for another try?"',
    scienceReason:
      'There is no breathable air or liquid water on the Moon. Astronauts depend on carbon dioxide filters and water recyclers every hour.',
    tip: 'Swap the CO2 filter on Day 2 and melt polar Moon ice on Day 6 if Air & Water runs low.',
  },
  FOOD_EMPTY: {
    reason: 'FOOD_EMPTY',
    title: 'Hungry Crew, Return Early!',
    subtitle: 'Food supplies hit 0%, so Mission Control brought the cats home early.',
    crewEncouragement:
      'Berry: "Next time our space lettuce garden will keep everyone well fed!"',
    scienceReason:
      'Space explorers burn lots of calories working, exercising in low gravity, and staying healthy—so bases need packed food and space plants.',
    tip: 'Grow fresh greens on Day 4 and watch your Food bar before Day 7 exercise or meals.',
  },
  RADIATION_EMERGENCY: {
    reason: 'RADIATION_EMERGENCY',
    title: 'Radiation Emergency!',
    subtitle: 'Radiation Protection hit 0% during a storm or spacewalk and Triage was already used.',
    crewEncouragement:
      'Capt. Space: "Everyone is safe in orbit! Let’s watch space weather together next try."',
    scienceReason:
      'Unlike Earth, the Moon has no thick atmosphere or magnetic shield to deflect solar storms. Thick shelter walls and water shields keep astronauts safe.',
    tip: 'Check NASA’s storm level on Day 3 and shelter inside or stack water tanks if Protection is low.',
  },
  MISSED_LAUNCH: {
    reason: 'MISSED_LAUNCH',
    title: 'Missed the Window!',
    subtitle: 'One or more base systems did not meet Launch Day minimums before sunset.',
    crewEncouragement:
      'Capt. Space: "Almost had liftoff! Let’s check our four launch lights earlier next try!"',
    scienceReason:
      'Lunar ascent rockets must launch on schedule before the 14-day freezing Moon night begins, with enough Power, Air & Water, Radiation Protection, and Food.',
    tip: 'Check Day 10 minimums (50 Power, 30 Air & Water, 30 Radiation Protection, 20 Food) and use Safety Check (+10 Radiation) if needed.',
  },
};

// ============================================================================
// ABOUT NASA DATA SOURCES
// ============================================================================

export const NASA_DATA_SOURCES = [
  {
    name: 'NASA DONKI Space Weather Database (FLR, CME, SEP)',
    description:
      'Real-time space weather feed tracking Solar Flares (FLR), Coronal Mass Ejections (CME speeds in km/s), and Solar Energetic Particles (SEP). Powers Day 3 & Day 8 conditions!',
    url: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
    badge: 'Live Feed (or Archived Sample offline)',
  },
  {
    name: 'NASA Image and Video Library',
    description:
      'Official public NASA photography search used to display real Moon, Apollo, solar flare, space station, and Artemis photos on each mission day.',
    url: 'https://images.nasa.gov/',
    badge: 'Real NASA Photos',
  },
  {
    name: 'NASA Artemis Program & Open Science Data Repository (OSDR)',
    description:
      'Real mission facts & biology research on Moon south-pole water ice, 14-day lunar nights, astronaut exercise, and plant growth in space.',
    url: 'https://www.nasa.gov/humans-in-space/artemis/',
    secondaryUrl: 'https://osdr.nasa.gov/',
    badge: 'Curated NASA Mission Facts',
  },
];

// ============================================================================
// LIVELY 1-LINE CREW SPEECH BUBBLES (STRICTLY MAX 8 WORDS EACH)
// ============================================================================

export function getCrewSpeechBubble(
  crewId: CrewId,
  state: GameState,
  stormLevel: StormLevel
): string {
  if (state.refusedAbilityToday === crewId) {
    return 'Hmph! Need a snack and nap!';
  }
  if (state.meters.power < 30 && crewId === 'amy') {
    return 'Power is low—save our battery!';
  }
  if (state.meters.airWater < 30 && crewId === 'nikita') {
    return 'Air & Water is getting very low!';
  }
  if (state.meters.radiation < 30 && crewId === 'nikita') {
    return 'Shields are thin—stay safe inside!';
  }
  if (state.meters.food < 30 && crewId === 'berry') {
    return 'Pantry is low! Grow space greens!';
  }
  if (state.meters.mood < 35 && crewId === 'capt') {
    return 'Tap me for a team Rally!';
  }

  const byDay: Record<number, Record<CrewId, string>> = {
    1: {
      capt: '10 sunny days before Moon sunset!',
      amy: 'Moon dust covered our solar panels!',
      berry: 'Sharp Moon dust clings to everything!',
      nikita: 'Suits are sealed and ready!',
    },
    2: {
      capt: 'Clean air keeps our crew sharp.',
      amy: 'The filter looks clogged!',
      berry: 'Space stations recycle 98% of water!',
      nikita: 'Checking our clean water tanks now.',
    },
    3: {
      capt: `Solar storm Level ${stormLevel}! Stay safe!`,
      amy: 'Water tanks help block space radiation!',
      berry: 'NASA DONKI spotted a solar flare!',
      nikita: 'Stay sheltered if shields run low!',
    },
    4: {
      capt: 'Fresh space greens sound yummy!',
      amy: 'Grow lights need steady base Power.',
      berry: 'My little lettuce sprouts look bright!',
      nikita: 'Fresh plants keep astronauts healthy!',
    },
    5: {
      capt: 'The Sun dips lower on craters.',
      amy: 'Tilt panels to catch low light!',
      berry: 'Moon nights last 14 Earth days!',
      nikita: 'Dome heaters keep us warm inside.',
    },
    6: {
      capt: 'Dark craters hold frozen water ice!',
      amy: 'Our rover battery is charged up!',
      berry: 'Shadowed craters stay colder than -200°C!',
      nikita: 'Melted Moon ice makes clean water!',
    },
    7: {
      capt: 'One full week on the Moon!',
      amy: 'My paws bounce in low gravity!',
      berry: 'Time for snacks after our workout!',
      nikita: 'Daily exercise keeps bones super strong!',
    },
    8: {
      capt: 'Check space weather before stepping outside!',
      amy: 'Our robot arm can tug safely.',
      berry: 'Counting solar particles on the screen!',
      nikita: 'My Triage kit is ready anytime!',
    },
    9: {
      capt: '1.3 seconds to radio home!',
      amy: 'Big antenna needs 15 Power today.',
      berry: 'Relay satellites beam past tall craters.',
      nikita: 'Almost launch day—check every meter!',
    },
    10: {
      capt: 'Launch window open! Check all systems!',
      amy: 'Rocket engines warmed up before sunset!',
      berry: `${state.meters.science} Science Stars earned so far!`,
      nikita: 'All four cats buckled for liftoff!',
    },
  };

  return byDay[state.day]?.[crewId] ?? 'Ready for Moon Mission Control!';
}
