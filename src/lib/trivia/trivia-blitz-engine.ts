/**
 * HearthCast TV — Multi-Player Family Trivia Blitz Engine
 *
 * Pure, deterministic living-room trivia engine with multi-generational
 * question packs, speed-bonus math, family streak multipliers, and synchronized
 * couch-party scoring.
 */

export interface TriviaQuestion {
  id: string;
  category: string;
  difficulty: 'Kids & Family' | 'All Ages' | 'Brain Teaser';
  prompt: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  funFact: string;
  timeLimitMs: number;
}

export interface TriviaPack {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  accentColor: string;
  questions: TriviaQuestion[];
}

export interface PlayerAnswerSubmission {
  playerId: string;
  playerName: string;
  optionIndex: 0 | 1 | 2 | 3;
  elapsedMs: number;
}

export interface PlayerScoreRecord {
  playerId: string;
  playerName: string;
  avatarEmoji: string;
  score: number;
  streak: number;
  correctCount: number;
  fastestAnswerMs: number | null;
  lastDeltaPoints: number;
}

export interface TriviaRoundState {
  packId: string;
  questionIndex: number;
  phase: 'QUESTION' | 'REVEAL' | 'PODIUM';
  roundDurationMs: number;
  submissions: Record<string, PlayerAnswerSubmission>;
  scoreboard: Record<string, PlayerScoreRecord>;
}

export const CURATED_TRIVIA_PACKS: TriviaPack[] = [
  {
    id: 'cosmic-explorers',
    title: 'Cosmic Explorers & Starlight Science',
    subtitle: 'Planets, moons, astronauts & backyard astronomy for the whole couch',
    badge: '🚀 Space & Science',
    accentColor: '#38BDF8',
    questions: [
      {
        id: 'ce-1',
        category: 'Solar System',
        difficulty: 'Kids & Family',
        prompt: 'Which planet in our solar system has the largest ring system visible from telescopes?',
        options: ['Mars', 'Saturn', 'Mercury', 'Venus'],
        correctIndex: 1,
        funFact: 'Saturn’s main rings stretch over 282,000 kilometers across, yet are often only about 10 meters thick!',
        timeLimitMs: 15000,
      },
      {
        id: 'ce-2',
        category: 'Space Exploration',
        difficulty: 'All Ages',
        prompt: 'What is the name of the giant space telescope launched in December 2021 with a golden honeycomb mirror?',
        options: [
          'Kepler Solar Probe',
          'James Webb Space Telescope',
          'Voyager Deep Lens',
          'Galileo Orbiter',
        ],
        correctIndex: 1,
        funFact: 'The James Webb Space Telescope uses 18 hexagonal gold-coated beryllium mirror segments that unfolded in space like origami.',
        timeLimitMs: 15000,
      },
      {
        id: 'ce-3',
        category: 'Planetary Weather',
        difficulty: 'All Ages',
        prompt: 'What is Jupiter’s famous “Great Red Spot”?',
        options: [
          'A giant lava volcano',
          'A centuries-old anticyclonic storm larger than Earth',
          'A frozen iron crater',
          'A cloud of glowing comet dust',
        ],
        correctIndex: 1,
        funFact: 'Winds around the edges of Jupiter’s Great Red Spot reach speeds over 430 km/h (268 mph)!',
        timeLimitMs: 15000,
      },
      {
        id: 'ce-4',
        category: 'Moon & Tides',
        difficulty: 'Kids & Family',
        prompt: 'Approximately how long does it take Earth’s Moon to complete one full orbit around Earth?',
        options: ['24 hours', 'About 27.3 days', '365 days', '7 days'],
        correctIndex: 1,
        funFact: 'Because the Moon rotates at the same rate it orbits Earth, we always see the same familiar face from our backyard.',
        timeLimitMs: 15000,
      },
    ],
  },
  {
    id: 'ocean-and-wildlife',
    title: 'Ocean Wonders & Wild Kingdom',
    subtitle: 'Deep-sea creatures, clever forest animals & record-breaking nature facts',
    badge: '🐋 Nature & Wildlife',
    accentColor: '#34D399',
    questions: [
      {
        id: 'ow-1',
        category: 'Marine Life',
        difficulty: 'Kids & Family',
        prompt: 'How many hearts does a giant Pacific octopus have?',
        options: ['One', 'Two', 'Three', 'Eight'],
        correctIndex: 2,
        funFact: 'Two branchial hearts pump blood through the gills, while the third systemic heart circulates blood to the rest of the body.',
        timeLimitMs: 15000,
      },
      {
        id: 'ow-2',
        category: 'Bird Champions',
        difficulty: 'All Ages',
        prompt: 'Which bird is the only known species capable of flying backward for sustained periods?',
        options: ['Peregrine Falcon', 'Hummingbird', 'Kingfisher', 'Arctic Tern'],
        correctIndex: 1,
        funFact: 'A hummingbird rotates its wings in a figure-eight pattern, generating lift on both forward and backward strokes.',
        timeLimitMs: 15000,
      },
      {
        id: 'ow-3',
        category: 'Mammal Sleep',
        difficulty: 'Kids & Family',
        prompt: 'Why do sea otters hold paws or wrap themselves in giant kelp while sleeping on the ocean surface?',
        options: [
          'To stay warm in snowstorms',
          'So they don’t drift apart with the ocean current',
          'To hide from seagulls',
          'To catch flying fish',
        ],
        correctIndex: 1,
        funFact: 'A group of resting sea otters floating together is called a “raft”!',
        timeLimitMs: 15000,
      },
    ],
  },
  {
    id: 'inventions-and-cinema',
    title: 'Family Movie Night & Everyday Inventions',
    subtitle: 'Animation trivia, kitchen science & accidental discoveries that changed the world',
    badge: '🎬 Movies & Eureka!',
    accentColor: '#F59E0B',
    questions: [
      {
        id: 'ic-1',
        category: 'Accidental Inventions',
        difficulty: 'All Ages',
        prompt: 'Which frozen summertime treat was accidentally invented in 1905 by 11-year-old Frank Epperson when he left soda water and a stirring stick on his porch overnight?',
        options: ['Ice Cream Cone', 'The Popsicle', 'Slushie Machine', 'Waffle Sundae'],
        correctIndex: 1,
        funFact: 'Frank originally called his invention the “Epsicle” before his kids started calling it “Pop’s ’sicle.”',
        timeLimitMs: 15000,
      },
      {
        id: 'ic-2',
        category: 'Animation History',
        difficulty: 'Kids & Family',
        prompt: 'What was the very first feature-length computer-animated movie released in theaters in 1995?',
        options: ['A Bug’s Life', 'Toy Story', 'Shrek', 'Finding Nemo'],
        correctIndex: 1,
        funFact: 'Each frame of Toy Story took between 45 minutes and 30 hours to render on 117 workstations!',
        timeLimitMs: 15000,
      },
      {
        id: 'ic-3',
        category: 'Everyday Tech',
        difficulty: 'All Ages',
        prompt: 'What inspired Swiss engineer George de Mestral to invent Velcro in 1941?',
        options: [
          'Spider webs in the rain',
          'Burdock plant burrs sticking to his dog’s fur after a mountain walk',
          'Tree frog toe pads',
          'Honeycomb wax cells',
        ],
        correctIndex: 1,
        funFact: 'Under a microscope, he saw hundreds of tiny hooks on the plant burrs catching onto the tiny loops in fabric and fur.',
        timeLimitMs: 15000,
      },
    ],
  },
];

export function getTriviaPackById(packId: string): TriviaPack {
  return CURATED_TRIVIA_PACKS.find((p) => p.id === packId) ?? CURATED_TRIVIA_PACKS[0];
}

/**
 * Pure score calculator for a single player's answer submission:
 * - Incorrect answer -> 0 points, streak resets to 0
 * - Correct answer ->
 *     basePoints = 1000
 *     speedBonus = round(clamp(1 - elapsedMs / timeLimitMs, 0, 1) * 500)
 *     streakBonus = min(nextStreak - 1, 4) * 150
 */
export function calculateTriviaAnswerScore(params: {
  isCorrect: boolean;
  elapsedMs: number;
  timeLimitMs: number;
  previousStreak: number;
}): {
  pointsEarned: number;
  basePoints: number;
  speedBonus: number;
  streakBonus: number;
  nextStreak: number;
} {
  if (!params.isCorrect) {
    return {
      pointsEarned: 0,
      basePoints: 0,
      speedBonus: 0,
      streakBonus: 0,
      nextStreak: 0,
    };
  }

  const safeLimit = Math.max(1000, params.timeLimitMs);
  const clampedElapsed = Math.max(0, Math.min(safeLimit, params.elapsedMs));
  const timeRemainingRatio = (safeLimit - clampedElapsed) / safeLimit;

  const basePoints = 1000;
  const speedBonus = Math.round(timeRemainingRatio * 500);
  const nextStreak = params.previousStreak + 1;
  const streakBonus = Math.min(nextStreak - 1, 4) * 150;
  const pointsEarned = basePoints + speedBonus + streakBonus;

  return {
    pointsEarned,
    basePoints,
    speedBonus,
    streakBonus,
    nextStreak,
  };
}

/**
 * Creates a fresh TriviaRoundState for a pack and initial family roster.
 */
export function createTriviaRoundState(
  packId: string,
  players: Array<{ playerId: string; playerName: string; avatarEmoji: string }>
): TriviaRoundState {
  const pack = getTriviaPackById(packId);
  const scoreboard: Record<string, PlayerScoreRecord> = {};

  for (const p of players) {
    scoreboard[p.playerId] = {
      playerId: p.playerId,
      playerName: p.playerName,
      avatarEmoji: p.avatarEmoji,
      score: 0,
      streak: 0,
      correctCount: 0,
      fastestAnswerMs: null,
      lastDeltaPoints: 0,
    };
  }

  return {
    packId: pack.id,
    questionIndex: 0,
    phase: 'QUESTION',
    roundDurationMs: pack.questions[0]?.timeLimitMs ?? 15000,
    submissions: {},
    scoreboard,
  };
}

/**
 * Records a player's answer during the `QUESTION` phase.
 * First submission per player per question is locked in (idempotent against button mashing).
 */
export function submitPlayerAnswer(
  state: TriviaRoundState,
  submission: PlayerAnswerSubmission
): TriviaRoundState {
  if (state.phase !== 'QUESTION') {
    return state;
  }

  // Lock in first answer per player for fairness
  if (state.submissions[submission.playerId]) {
    return state;
  }

  const nextSubmissions = {
    ...state.submissions,
    [submission.playerId]: {
      ...submission,
      elapsedMs: Math.max(0, Math.round(submission.elapsedMs)),
    },
  };

  // Ensure the player exists on the scoreboard if they joined mid-round via QR
  const nextScoreboard = { ...state.scoreboard };
  if (!nextScoreboard[submission.playerId]) {
    nextScoreboard[submission.playerId] = {
      playerId: submission.playerId,
      playerName: submission.playerName,
      avatarEmoji: '🎮',
      score: 0,
      streak: 0,
      correctCount: 0,
      fastestAnswerMs: null,
      lastDeltaPoints: 0,
    };
  }

  return {
    ...state,
    submissions: nextSubmissions,
    scoreboard: nextScoreboard,
  };
}

/**
 * Resolves the current question (`QUESTION` -> `REVEAL`), awarding points, speed bonuses,
 * and streak multipliers to all players on the scoreboard.
 */
export function revealTriviaQuestion(state: TriviaRoundState): TriviaRoundState {
  if (state.phase !== 'QUESTION') {
    return state;
  }

  const pack = getTriviaPackById(state.packId);
  const question = pack.questions[state.questionIndex];
  if (!question) {
    return { ...state, phase: 'PODIUM' };
  }

  const nextScoreboard: Record<string, PlayerScoreRecord> = {};

  for (const [playerId, record] of Object.entries(state.scoreboard)) {
    const sub = state.submissions[playerId];
    if (!sub) {
      // Did not answer before timer expired -> streak resets
      nextScoreboard[playerId] = {
        ...record,
        streak: 0,
        lastDeltaPoints: 0,
      };
      continue;
    }

    const isCorrect = sub.optionIndex === question.correctIndex;
    const calc = calculateTriviaAnswerScore({
      isCorrect,
      elapsedMs: sub.elapsedMs,
      timeLimitMs: question.timeLimitMs,
      previousStreak: record.streak,
    });

    const nextFastest =
      isCorrect && (record.fastestAnswerMs === null || sub.elapsedMs < record.fastestAnswerMs)
        ? sub.elapsedMs
        : record.fastestAnswerMs;

    nextScoreboard[playerId] = {
      ...record,
      score: record.score + calc.pointsEarned,
      streak: calc.nextStreak,
      correctCount: record.correctCount + (isCorrect ? 1 : 0),
      fastestAnswerMs: nextFastest,
      lastDeltaPoints: calc.pointsEarned,
    };
  }

  return {
    ...state,
    phase: 'REVEAL',
    scoreboard: nextScoreboard,
  };
}

/**
 * Advances from `REVEAL` to the next question (`QUESTION`), or `PODIUM` if all questions are complete.
 */
export function advanceTriviaQuestion(state: TriviaRoundState): TriviaRoundState {
  const pack = getTriviaPackById(state.packId);
  const nextIndex = state.questionIndex + 1;

  if (nextIndex >= pack.questions.length) {
    return {
      ...state,
      phase: 'PODIUM',
    };
  }

  return {
    ...state,
    questionIndex: nextIndex,
    phase: 'QUESTION',
    roundDurationMs: pack.questions[nextIndex].timeLimitMs,
    submissions: {},
  };
}

/**
 * Returns the sorted leaderboard (highest score first; tie-broken by correctCount, then fastestAnswerMs).
 */
export function getSortedLeaderboard(state: TriviaRoundState): PlayerScoreRecord[] {
  return Object.values(state.scoreboard).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    const fastA = a.fastestAnswerMs ?? Number.MAX_SAFE_INTEGER;
    const fastB = b.fastestAnswerMs ?? Number.MAX_SAFE_INTEGER;
    if (fastA !== fastB) return fastA - fastB;
    return a.playerId.localeCompare(b.playerId);
  });
}
