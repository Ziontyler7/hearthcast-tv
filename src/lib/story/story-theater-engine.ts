/**
 * HearthCast TV — Interactive Branching Bedtime Story Theater Engine
 *
 * Pure, deterministic branching story engine designed for 10-foot living-room
 * read-aloud night. Supports multi-player couch voting with a fair
 * "Turn-Taking / Underdog Tiebreaker" so younger siblings never lose every tie.
 */

export interface StoryChoice {
  id: string;
  label: string;
  targetNodeId: string;
  previewIcon: string;
  whisperHint: string;
}

export interface StorySceneNode {
  id: string;
  chapterTitle: string;
  illustrationEmoji: string;
  ambientCue: 'campfire-crackling' | 'starlight-chimes' | 'ocean-waves' | 'forest-breeze';
  narrationParagraphs: string[];
  estimatedReadSeconds: number;
  isEnding?: boolean;
  endingBadge?: string;
  choices: StoryChoice[];
}

export interface StoryBook {
  id: string;
  title: string;
  subtitle: string;
  ageRange: string;
  durationMinutes: number;
  coverEmoji: string;
  accentColor: string;
  rootNodeId: string;
  nodes: Record<string, StorySceneNode>;
}

export interface StoryVote {
  playerId: string;
  playerName: string;
  choiceId: string;
  submittedAtMs: number;
}

export interface StoryTheaterState {
  storyId: string;
  currentNodeId: string;
  visitedNodeIds: string[];
  votes: Record<string, StoryVote>;
  /** Tracks how many times each player has won a tiebreaker so ties rotate fairly */
  tiebreakWinsByPlayer: Record<string, number>;
  lastTiebreakReason: string | null;
  narrationPlaying: boolean;
}

export const CURATED_STORY_BOOKS: StoryBook[] = [
  {
    id: 'lantern-whispering-pines',
    title: 'The Lantern of Whispering Pines',
    subtitle: 'A cozy woodland mystery where fireflies guide two siblings to the Cloudberry Observatory',
    ageRange: 'Ages 5–11 & Family',
    durationMinutes: 6,
    coverEmoji: '🏮',
    accentColor: '#F59E0B',
    rootNodeId: 'scene-1',
    nodes: {
      'scene-1': {
        id: 'scene-1',
        chapterTitle: 'Chapter 1: The Brass Compass on the Porch',
        illustrationEmoji: '🌲🏮✨',
        ambientCue: 'campfire-crackling',
        estimatedReadSeconds: 22,
        narrationParagraphs: [
          'As twilight settled over Whispering Pines Cabin, a warm amber glow flickered inside Grandpa Arthur’s old brass lantern on the front porch.',
          'Inside the glass chimed three sleepy golden fireflies, pointing toward two mossy trails at the edge of the meadow: the Singing Brook Bridge to the left, and the Echoing Hollow Oak to the right.',
        ],
        choices: [
          {
            id: 'choice-bridge',
            label: 'Cross the Singing Brook Bridge',
            targetNodeId: 'scene-2a',
            previewIcon: '🌉',
            whisperHint: 'Follow the gentle splash of silver trout and glowing water lilies.',
          },
          {
            id: 'choice-oak',
            label: 'Climb the Spiral Stairs of Hollow Oak',
            targetNodeId: 'scene-2b',
            previewIcon: '🦉',
            whisperHint: 'Ask Barnaby the Spectacled Owl for his star map.',
          },
        ],
      },
      'scene-2a': {
        id: 'scene-2a',
        chapterTitle: 'Chapter 2: The River Otter’s Ferry',
        illustrationEmoji: '🦦🛶🌙',
        ambientCue: 'ocean-waves',
        estimatedReadSeconds: 24,
        narrationParagraphs: [
          'At the middle of the wooden bridge, Captain Pip—awhiskered river otter wearing a tiny knitted wool cap—tipped his paddle in greeting.',
          '“The Cloudberry Observatory is just beyond the mist!” Pip whispered. “Shall we sail the Moonbeam Raft downstream, or ring the Silver Wind-Chime to summon the forest gondola?”',
        ],
        choices: [
          {
            id: 'choice-raft',
            label: 'Sail the Moonbeam Cedar Raft',
            targetNodeId: 'scene-3-observatory',
            previewIcon: '⛵',
            whisperHint: 'Drift past sleepy beavers and glowing firefly reeds.',
          },
          {
            id: 'choice-chime',
            label: 'Ring the Silver Wind-Chime',
            targetNodeId: 'scene-3-lantern-keep',
            previewIcon: '🔔',
            whisperHint: 'Ride the canopy cable-car through the pine tops.',
          },
        ],
      },
      'scene-2b': {
        id: 'scene-2b',
        chapterTitle: 'Chapter 2: Barnaby’s Clockwork Telescope',
        illustrationEmoji: '🦉🔭🌟',
        ambientCue: 'forest-breeze',
        estimatedReadSeconds: 24,
        narrationParagraphs: [
          'Inside the Hollow Oak, Barnaby the Owl adjusted his brass spectacles and unrolled a parchment map dusted with cinnamon and starlight.',
          '“Two secret passages lead to the bedtime constellations tonight,” Barnaby hooted softly. “The Cloudberry Observatory dome, or the Cozy Lantern Keep.”',
        ],
        choices: [
          {
            id: 'choice-dome',
            label: 'Take the Secret Skylight to the Observatory',
            targetNodeId: 'scene-3-observatory',
            previewIcon: '🔭',
            whisperHint: 'Watch the Aurora Borealis paint the ceiling in emerald and gold.',
          },
          {
            id: 'choice-keep',
            label: 'Follow the Warm Cocoa Trail to Lantern Keep',
            targetNodeId: 'scene-3-lantern-keep',
            previewIcon: '☕',
            whisperHint: 'Gather by the hearth where the forest creatures share lullabies.',
          },
        ],
      },
      'scene-3-observatory': {
        id: 'scene-3-observatory',
        chapterTitle: 'Finale: The Cloudberry Starlight Dome',
        illustrationEmoji: '🌌🔭😴',
        ambientCue: 'starlight-chimes',
        estimatedReadSeconds: 25,
        isEnding: true,
        endingBadge: '🌟 Starlight Astronomer Ending',
        narrationParagraphs: [
          'The glass dome of the Cloudberry Observatory parted gently, revealing a ribbon of emerald northern lights dancing across the velvet sky.',
          'Wrapped in warm quilts with mugs of spiced apple cider, the whole family watched the three golden fireflies rise to join the constellations—drifting peacefully into sweet dreams.',
        ],
        choices: [],
      },
      'scene-3-lantern-keep': {
        id: 'scene-3-lantern-keep',
        chapterTitle: 'Finale: Lullaby at the Cozy Lantern Keep',
        illustrationEmoji: '🏡🔥🎶',
        ambientCue: 'campfire-crackling',
        estimatedReadSeconds: 25,
        isEnding: true,
        endingBadge: '🏮 Hearthside Guardian Ending',
        narrationParagraphs: [
          'Inside the Cozy Lantern Keep, velvet cushions encircled a gentle hearth that crackled in three-quarter lullaby time.',
          'Captain Pip and Barnaby the Owl tucked a woven pine-needle blanket around the explorers as the brass lantern dimmed to a soft nightlight glow. Goodnight, Whispering Pines!',
        ],
        choices: [],
      },
    },
  },
  {
    id: 'starship-cozy-comet',
    title: 'Starship Cozy & The Clockwork Comet',
    subtitle: 'A gentle orbital voyage past the Pillow Nebula and the Ringed Library of Titan',
    ageRange: 'Ages 6–12 & Family',
    durationMinutes: 5,
    coverEmoji: '🛸',
    accentColor: '#38BDF8',
    rootNodeId: 'space-1',
    nodes: {
      'space-1': {
        id: 'space-1',
        chapterTitle: 'Chapter 1: Departure from Dock Seven',
        illustrationEmoji: '🛸🪐✨',
        ambientCue: 'starlight-chimes',
        estimatedReadSeconds: 20,
        narrationParagraphs: [
          'Starship Cozy hummed like a purring kitten as its solar sails caught the evening breeze above Saturn’s shimmering rings.',
          'On the panoramic bridge, the navigation console chimed with two gentle routes for tonight’s pajama cruise.',
        ],
        choices: [
          {
            id: 'space-choice-nebula',
            label: 'Glide Through the Cotton-Candy Pillow Nebula',
            targetNodeId: 'space-2-ending-nebula',
            previewIcon: '☁️',
            whisperHint: 'Zero-gravity clouds that hum gentle piano chords.',
          },
          {
            id: 'space-choice-titan',
            label: 'Dock at the Floating Library of Titan',
            targetNodeId: 'space-2-ending-titan',
            previewIcon: '📚',
            whisperHint: 'Ancient glowing storybooks orbiting a warm amber lamp.',
          },
        ],
      },
      'space-2-ending-nebula': {
        id: 'space-2-ending-nebula',
        chapterTitle: 'Finale: Drifting Through the Pillow Nebula',
        illustrationEmoji: '🌌☁️💤',
        ambientCue: 'starlight-chimes',
        estimatedReadSeconds: 22,
        isEnding: true,
        endingBadge: '🛸 Nebula Dreamer Ending',
        narrationParagraphs: [
          'Soft lavender and rose-gold clouds cradled Starship Cozy as the observation dome dimmed to bedtime mode.',
          'Outside the window, tiny comet fireflies traced silver lullabies across the stars until every crew member was fast asleep.',
        ],
        choices: [],
      },
      'space-2-ending-titan': {
        id: 'space-2-ending-titan',
        chapterTitle: 'Finale: The Floating Library of Titan',
        illustrationEmoji: '🪐📖🕯️',
        ambientCue: 'campfire-crackling',
        estimatedReadSeconds: 22,
        isEnding: true,
        endingBadge: '📚 Cosmic Archivist Ending',
        narrationParagraphs: [
          'In the grand reading room of Titan Station, paper lanterns floated gently in low gravity while Saturn’s rings glowed softly across the bay window.',
          'With tomorrow’s course safely charted, the crew curled up on cloud-velvet couches for a peaceful night’s rest.',
        ],
        choices: [],
      },
    },
  },
];

export function getStoryBookById(storyId: string): StoryBook {
  return CURATED_STORY_BOOKS.find((b) => b.id === storyId) ?? CURATED_STORY_BOOKS[0];
}

export function createStoryTheaterState(storyId: string): StoryTheaterState {
  const book = getStoryBookById(storyId);
  return {
    storyId: book.id,
    currentNodeId: book.rootNodeId,
    visitedNodeIds: [book.rootNodeId],
    votes: {},
    tiebreakWinsByPlayer: {},
    lastTiebreakReason: null,
    narrationPlaying: false,
  };
}

export function getCurrentStoryScene(state: StoryTheaterState): StorySceneNode {
  const book = getStoryBookById(state.storyId);
  return book.nodes[state.currentNodeId] ?? book.nodes[book.rootNodeId];
}

/**
 * Submits or updates a family member's vote for the current scene branch.
 */
export function castStoryBranchVote(
  state: StoryTheaterState,
  vote: StoryVote
): StoryTheaterState {
  const scene = getCurrentStoryScene(state);
  const validChoice = scene.choices.some((c) => c.id === vote.choiceId);
  if (!validChoice) {
    return state;
  }

  return {
    ...state,
    votes: {
      ...state.votes,
      [vote.playerId]: vote,
    },
  };
}

/**
 * Resolves the winning story branch choice from current couch votes.
 *
 * Tie-breaking invariant ("Fair Family Turn-Taking / Underdog Rule"):
 * 1. The choice with strictly the most votes wins.
 * 2. If two or more choices are tied for top votes:
 *    - Compute each tied choice's minimum `tiebreakWinsByPlayer` among its voters
 *      (so a sibling who hasn't won a tiebreaker yet wins this tie!).
 *    - If still tied, pick the choice whose earliest vote (`min submittedAtMs`) was cast first.
 * 3. If no votes were cast at all, selects the first choice (`choices[0]`).
 */
export function resolveStoryBranchSelection(
  state: StoryTheaterState,
  explicitChoiceId?: string
): {
  nextState: StoryTheaterState;
  winningChoice: StoryChoice | null;
  wasTie: boolean;
} {
  const scene = getCurrentStoryScene(state);
  if (scene.choices.length === 0) {
    return { nextState: state, winningChoice: null, wasTie: false };
  }

  if (explicitChoiceId && Object.keys(state.votes).length === 0) {
    const directChoice =
      scene.choices.find((c) => c.id === explicitChoiceId) ?? scene.choices[0];
    return {
      nextState: {
        ...state,
        currentNodeId: directChoice.targetNodeId,
        visitedNodeIds: [...state.visitedNodeIds, directChoice.targetNodeId],
        votes: {},
        lastTiebreakReason: 'Selected directly via Fire TV remote / voice.',
      },
      winningChoice: directChoice,
      wasTie: false,
    };
  }

  const voteList = Object.values(state.votes);
  if (voteList.length === 0) {
    const fallback = scene.choices[0];
    return {
      nextState: {
        ...state,
        currentNodeId: fallback.targetNodeId,
        visitedNodeIds: [...state.visitedNodeIds, fallback.targetNodeId],
        votes: {},
        lastTiebreakReason: 'Default story path selected.',
      },
      winningChoice: fallback,
      wasTie: false,
    };
  }

  // Group votes by choiceId
  const votesByChoice: Record<string, StoryVote[]> = {};
  for (const choice of scene.choices) {
    votesByChoice[choice.id] = [];
  }
  for (const v of voteList) {
    if (votesByChoice[v.choiceId]) {
      votesByChoice[v.choiceId].push(v);
    }
  }

  const maxVotes = Math.max(
    ...scene.choices.map((c) => (votesByChoice[c.id] ?? []).length)
  );
  const topChoices = scene.choices.filter(
    (c) => (votesByChoice[c.id] ?? []).length === maxVotes
  );

  if (topChoices.length === 1) {
    const winner = topChoices[0];
    return {
      nextState: {
        ...state,
        currentNodeId: winner.targetNodeId,
        visitedNodeIds: [...state.visitedNodeIds, winner.targetNodeId],
        votes: {},
        lastTiebreakReason: `Majority family vote (${maxVotes} vote${maxVotes === 1 ? '' : 's'}).`,
      },
      winningChoice: winner,
      wasTie: false,
    };
  }

  // Deterministic Fair Family Turn-Taking Tiebreaker
  const scoredTop = topChoices.map((choice) => {
    const voters = votesByChoice[choice.id] ?? [];
    const minPriorTieWins = Math.min(
      ...voters.map((v) => state.tiebreakWinsByPlayer[v.playerId] ?? 0)
    );
    const earliestTimestamp = Math.min(...voters.map((v) => v.submittedAtMs));
    const underdogVoter = voters
      .slice()
      .sort((a, b) => {
        const winsA = state.tiebreakWinsByPlayer[a.playerId] ?? 0;
        const winsB = state.tiebreakWinsByPlayer[b.playerId] ?? 0;
        if (winsA !== winsB) return winsA - winsB;
        return a.submittedAtMs - b.submittedAtMs;
      })[0];

    return {
      choice,
      minPriorTieWins,
      earliestTimestamp,
      underdogVoter,
    };
  });

  scoredTop.sort((a, b) => {
    if (a.minPriorTieWins !== b.minPriorTieWins) {
      return a.minPriorTieWins - b.minPriorTieWins;
    }
    if (a.earliestTimestamp !== b.earliestTimestamp) {
      return a.earliestTimestamp - b.earliestTimestamp;
    }
    return a.choice.id.localeCompare(b.choice.id);
  });

  const winnerEntry = scoredTop[0];
  const nextTiebreakWins = { ...state.tiebreakWinsByPlayer };
  if (winnerEntry.underdogVoter) {
    const pid = winnerEntry.underdogVoter.playerId;
    nextTiebreakWins[pid] = (nextTiebreakWins[pid] ?? 0) + 1;
  }

  const tieReason = winnerEntry.underdogVoter
    ? `Fair Turn-Taking Tiebreaker won by ${winnerEntry.underdogVoter.playerName}!`
    : 'Tie resolved by earliest family vote.';

  return {
    nextState: {
      ...state,
      currentNodeId: winnerEntry.choice.targetNodeId,
      visitedNodeIds: [...state.visitedNodeIds, winnerEntry.choice.targetNodeId],
      votes: {},
      tiebreakWinsByPlayer: nextTiebreakWins,
      lastTiebreakReason: tieReason,
    },
    winningChoice: winnerEntry.choice,
    wasTie: true,
  };
}
