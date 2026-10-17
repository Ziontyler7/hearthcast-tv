/**
 * HearthCast TV — Amazon Vega OS Content Launcher & Voice Directive Engine
 *
 * Implements:
 * 1. Amazon Vega (`com.amazon.kepler.media.content_launcher.1`) deep-link URI
 *    parsing (`hearthcast://launch?mode=trivia&pack=cosmic-explorers`).
 * 2. Fire TV Home Screen Content Row catalog generation for direct row tiles.
 * 3. Natural-language Alexa / Voice Remote directive parsing into deterministic
 *    10-foot actions (`"Select A"`, `"Launch Cosmic Explorers"`, `"Read Lantern Story"`,
 *    `"Next question"`, `"Pause"`).
 */

export type HearthCastScreenMode = 'HOME' | 'TRIVIA' | 'STORY' | 'VEGA_INSPECTOR';

export interface DeepLinkTarget {
  mode: HearthCastScreenMode;
  contentId?: string;
  roomCode?: string;
  role: 'tv' | 'controller';
}

export interface FireTvLauncherTile {
  id: string;
  title: string;
  subtitle: string;
  category: 'Trivia Blitz' | 'Bedtime Story Theater';
  badge: string;
  deepLinkUri: string;
  accentColor: string;
  mode: 'TRIVIA' | 'STORY';
  targetId: string;
}

export type VoiceDirectiveResult =
  | { type: 'LAUNCH_MODE'; mode: HearthCastScreenMode; targetId?: string; transcript: string }
  | { type: 'SELECT_OPTION'; optionIndex: 0 | 1 | 2 | 3; transcript: string }
  | { type: 'STORY_CHOICE'; choiceIndex: 0 | 1; transcript: string }
  | { type: 'REMOTE_ACTION'; action: 'SELECT' | 'BACK' | 'PLAY_PAUSE' | 'NEXT'; transcript: string }
  | { type: 'UNRECOGNIZED'; transcript: string };

export const FIRE_TV_CONTENT_ROW: FireTvLauncherTile[] = [
  {
    id: 'tile-cosmic-explorers',
    title: 'Cosmic Explorers Trivia Blitz',
    subtitle: '4-Player Solar System & James Webb Telescope Couch Quiz',
    category: 'Trivia Blitz',
    badge: '🚀 4 Players · 5 Min',
    deepLinkUri: 'hearthcast://launch?mode=trivia&pack=cosmic-explorers',
    accentColor: '#38BDF8',
    mode: 'TRIVIA',
    targetId: 'cosmic-explorers',
  },
  {
    id: 'tile-lantern-pines',
    title: 'The Lantern of Whispering Pines',
    subtitle: 'Interactive Branching Bedtime Story with Family Voting',
    category: 'Bedtime Story Theater',
    badge: '🏮 Bedtime Story · Ages 5+',
    deepLinkUri: 'hearthcast://launch?mode=story&book=lantern-whispering-pines',
    accentColor: '#F59E0B',
    mode: 'STORY',
    targetId: 'lantern-whispering-pines',
  },
  {
    id: 'tile-ocean-wildlife',
    title: 'Ocean Wonders & Wild Kingdom',
    subtitle: 'Deep-Sea Creatures & Record-Breaking Animal Trivia',
    category: 'Trivia Blitz',
    badge: '🐋 All Ages · Speed Bonus',
    deepLinkUri: 'hearthcast://launch?mode=trivia&pack=ocean-and-wildlife',
    accentColor: '#34D399',
    mode: 'TRIVIA',
    targetId: 'ocean-and-wildlife',
  },
  {
    id: 'tile-starship-cozy',
    title: 'Starship Cozy & The Clockwork Comet',
    subtitle: 'Gentle Orbital Pajama Cruise Past Saturn & Titan',
    category: 'Bedtime Story Theater',
    badge: '🛸 Sci-Fi Lullaby · 5 Min',
    deepLinkUri: 'hearthcast://launch?mode=story&book=starship-cozy-comet',
    accentColor: '#818CF8',
    mode: 'STORY',
    targetId: 'starship-cozy-comet',
  },
  {
    id: 'tile-inventions-cinema',
    title: 'Movie Night & Accidental Inventions',
    subtitle: 'Animation History, Popsicles & Everyday Eureka Moments',
    category: 'Trivia Blitz',
    badge: '🎬 Family Favorites',
    deepLinkUri: 'hearthcast://launch?mode=trivia&pack=inventions-and-cinema',
    accentColor: '#F472B6',
    mode: 'TRIVIA',
    targetId: 'inventions-and-cinema',
  },
];

/**
 * Parses either a Vega OS URI (`hearthcast://launch?mode=trivia&pack=cosmic-explorers`)
 * or a browser query string (`?role=controller&room=FIRE-4&mode=story&book=starship-cozy-comet`)
 * into a validated `DeepLinkTarget`.
 */
export function parseVegaDeepLink(uriOrQuery: string): DeepLinkTarget {
  const raw = (uriOrQuery ?? '').trim();
  let queryPart = raw;

  if (raw.includes('?')) {
    queryPart = raw.slice(raw.indexOf('?') + 1);
  } else if (raw.startsWith('hearthcast://')) {
    const pathOnly = raw.replace('hearthcast://', '');
    if (pathOnly.startsWith('trivia')) {
      return { mode: 'TRIVIA', contentId: 'cosmic-explorers', role: 'tv' };
    }
    if (pathOnly.startsWith('story')) {
      return { mode: 'STORY', contentId: 'lantern-whispering-pines', role: 'tv' };
    }
    queryPart = '';
  }

  const params = new URLSearchParams(queryPart);
  const rawMode = (params.get('mode') ?? '').toLowerCase();
  const roleParam = (params.get('role') ?? '').toLowerCase();
  const role: 'tv' | 'controller' = roleParam === 'controller' ? 'controller' : 'tv';
  const roomCode = params.get('room') ? params.get('room')!.toUpperCase() : undefined;

  if (rawMode === 'trivia') {
    return {
      mode: 'TRIVIA',
      contentId: params.get('pack') ?? 'cosmic-explorers',
      roomCode,
      role,
    };
  }

  if (rawMode === 'story') {
    return {
      mode: 'STORY',
      contentId: params.get('book') ?? 'lantern-whispering-pines',
      roomCode,
      role,
    };
  }

  if (rawMode === 'vega' || rawMode === 'inspector') {
    return {
      mode: 'VEGA_INSPECTOR',
      roomCode,
      role,
    };
  }

  return {
    mode: 'HOME',
    roomCode,
    role,
  };
}

/**
 * Parses natural-language voice commands from Alexa / Fire TV Voice Remote
 * into deterministic in-app actions.
 */
export function parseVoiceDirective(utterance: string): VoiceDirectiveResult {
  const clean = (utterance ?? '').trim();
  const lower = clean.toLowerCase();

  if (!lower) {
    return { type: 'UNRECOGNIZED', transcript: clean };
  }

  // Option selection for Trivia ("Option A", "Select B", "Answer C", "Choice D", "Option 1..4")
  if (/\b(option|select|answer|pick)\s+(a|one|1)\b/.test(lower) || lower === 'a') {
    return { type: 'SELECT_OPTION', optionIndex: 0, transcript: clean };
  }
  if (/\b(option|select|answer|pick)\s+(b|two|2)\b/.test(lower) || lower === 'b') {
    return { type: 'SELECT_OPTION', optionIndex: 1, transcript: clean };
  }
  if (/\b(option|select|answer|pick)\s+(c|three|3)\b/.test(lower) || lower === 'c') {
    return { type: 'SELECT_OPTION', optionIndex: 2, transcript: clean };
  }
  if (/\b(option|select|answer|pick)\s+(d|four|4)\b/.test(lower) || lower === 'd') {
    return { type: 'SELECT_OPTION', optionIndex: 3, transcript: clean };
  }

  // Story branch voice voting ("first path", "left path", "second path", "right path")
  if (/\b(first|left)\s+(path|choice|branch|bridge)\b/.test(lower)) {
    return { type: 'STORY_CHOICE', choiceIndex: 0, transcript: clean };
  }
  if (/\b(second|right)\s+(path|choice|branch|oak)\b/.test(lower)) {
    return { type: 'STORY_CHOICE', choiceIndex: 1, transcript: clean };
  }

  // Mode launching
  if (lower.includes('cosmic') || lower.includes('space trivia')) {
    return {
      type: 'LAUNCH_MODE',
      mode: 'TRIVIA',
      targetId: 'cosmic-explorers',
      transcript: clean,
    };
  }
  if (lower.includes('ocean') || lower.includes('wildlife')) {
    return {
      type: 'LAUNCH_MODE',
      mode: 'TRIVIA',
      targetId: 'ocean-and-wildlife',
      transcript: clean,
    };
  }
  if (lower.includes('movie') || lower.includes('invention')) {
    return {
      type: 'LAUNCH_MODE',
      mode: 'TRIVIA',
      targetId: 'inventions-and-cinema',
      transcript: clean,
    };
  }
  if (lower.includes('trivia') || lower.includes('quiz')) {
    return {
      type: 'LAUNCH_MODE',
      mode: 'TRIVIA',
      targetId: 'cosmic-explorers',
      transcript: clean,
    };
  }
  if (lower.includes('starship') || lower.includes('comet')) {
    return {
      type: 'LAUNCH_MODE',
      mode: 'STORY',
      targetId: 'starship-cozy-comet',
      transcript: clean,
    };
  }
  if (lower.includes('story') || lower.includes('lantern') || lower.includes('bedtime')) {
    return {
      type: 'LAUNCH_MODE',
      mode: 'STORY',
      targetId: 'lantern-whispering-pines',
      transcript: clean,
    };
  }
  if (lower.includes('home') || lower.includes('lobby') || lower.includes('launcher')) {
    return {
      type: 'LAUNCH_MODE',
      mode: 'HOME',
      transcript: clean,
    };
  }

  // Playback / Navigation controls
  if (lower.includes('pause') || lower.includes('resume') || lower.includes('read aloud')) {
    return { type: 'REMOTE_ACTION', action: 'PLAY_PAUSE', transcript: clean };
  }
  if (lower.includes('next') || lower.includes('continue') || lower.includes('skip')) {
    return { type: 'REMOTE_ACTION', action: 'NEXT', transcript: clean };
  }
  if (lower.includes('back') || lower.includes('return')) {
    return { type: 'REMOTE_ACTION', action: 'BACK', transcript: clean };
  }

  return { type: 'UNRECOGNIZED', transcript: clean };
}
