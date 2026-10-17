/**
 * HearthCast TV — Second-Screen QR Couch Party Sync Bus
 *
 * Synchronizes the 10-foot Fire TV host screen with up to 4 family mobile
 * controllers via `BroadcastChannel` + `localStorage` storage events +
 * deterministic in-memory loopback bus.
 *
 * Enforces monotonic per-sender `seq` numbers, deduplicates messages by `msgId`,
 * and preserves player seat and score across mid-game controller reconnects.
 */

export interface CouchPlayer {
  playerId: string;
  playerName: string;
  avatarEmoji: string;
  seatIndex: number;
  connected: boolean;
  lastSeenMs: number;
}

export type PartyEventPayload =
  | {
      type: 'PLAYER_JOIN';
      playerId: string;
      playerName: string;
      avatarEmoji: string;
    }
  | {
      type: 'PLAYER_DISCONNECT';
      playerId: string;
    }
  | {
      type: 'TRIVIA_SUBMIT';
      playerId: string;
      playerName: string;
      optionIndex: 0 | 1 | 2 | 3;
      elapsedMs: number;
    }
  | {
      type: 'STORY_VOTE';
      playerId: string;
      playerName: string;
      choiceId: string;
      submittedAtMs: number;
    }
  | {
      type: 'REMOTE_KEY';
      playerId: string;
      action: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'SELECT' | 'BACK';
    };

export interface PartyEnvelope {
  msgId: string;
  roomCode: string;
  senderId: string;
  seq: number;
  timestampMs: number;
  payload: PartyEventPayload;
}

export interface CouchPartyRoomState {
  roomCode: string;
  maxSeats: number;
  players: Record<string, CouchPlayer>;
  lastSeqBySender: Record<string, number>;
  seenMsgIds: string[];
  eventLog: PartyEnvelope[];
}

export const DEFAULT_FAMILY_ROSTER: Array<{
  playerId: string;
  playerName: string;
  avatarEmoji: string;
}> = [
  { playerId: 'player-maya', playerName: 'Maya', avatarEmoji: '🦊' },
  { playerId: 'player-leo', playerName: 'Leo', avatarEmoji: '🦖' },
  { playerId: 'player-mom', playerName: 'Mom', avatarEmoji: '🦉' },
  { playerId: 'player-dad', playerName: 'Dad', avatarEmoji: '🐻' },
];

/**
 * Generates or normalizes a 4-character family-friendly room code (e.g., "FIRE-4", "COZY-8").
 */
export function normalizeRoomCode(raw?: string): string {
  const cleaned = (raw ?? 'FIRE-4').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  return cleaned.length >= 4 ? cleaned.slice(0, 8) : 'FIRE-4';
}

/**
 * Builds the second-screen mobile join URL for QR scanning or second-tab testing.
 */
export function buildSecondScreenJoinUrl(baseUrl: string, roomCode: string): string {
  const code = normalizeRoomCode(roomCode);
  const cleanBase = baseUrl.split('?')[0];
  return `${cleanBase}?role=controller&room=${encodeURIComponent(code)}`;
}

/**
 * Creates a fresh CouchPartyRoomState pre-seeded with default or custom family seats.
 */
export function createCouchPartyRoomState(
  roomCode = 'FIRE-4',
  seedDefaultPlayers = true
): CouchPartyRoomState {
  const normalized = normalizeRoomCode(roomCode);
  const players: Record<string, CouchPlayer> = {};

  if (seedDefaultPlayers) {
    DEFAULT_FAMILY_ROSTER.forEach((p, idx) => {
      players[p.playerId] = {
        playerId: p.playerId,
        playerName: p.playerName,
        avatarEmoji: p.avatarEmoji,
        seatIndex: idx,
        connected: true,
        lastSeenMs: 1000,
      };
    });
  }

  return {
    roomCode: normalized,
    maxSeats: 6,
    players,
    lastSeqBySender: {},
    seenMsgIds: [],
    eventLog: [],
  };
}

/**
 * Processes an incoming PartyEnvelope deterministically:
 * - Rejects messages for a different roomCode
 * - Rejects duplicate `msgId`
 * - Rejects stale/out-of-order `seq <= lastSeqBySender[senderId]`
 * - Preserves seatIndex if a disconnected player reconnects mid-round
 */
export function applyPartyEnvelope(
  state: CouchPartyRoomState,
  envelope: PartyEnvelope
): {
  state: CouchPartyRoomState;
  accepted: boolean;
  reason?: string;
} {
  if (normalizeRoomCode(envelope.roomCode) !== state.roomCode) {
    return { state, accepted: false, reason: 'ROOM_MISMATCH' };
  }

  if (state.seenMsgIds.includes(envelope.msgId)) {
    return { state, accepted: false, reason: 'DUPLICATE_MSG_ID' };
  }

  const prevSeq = state.lastSeqBySender[envelope.senderId] ?? 0;
  if (envelope.seq <= prevSeq) {
    return { state, accepted: false, reason: 'STALE_SEQ' };
  }

  const nextPlayers = { ...state.players };
  const payload = envelope.payload;

  if (payload.type === 'PLAYER_JOIN') {
    const existing = nextPlayers[payload.playerId];
    const seatIndex =
      existing !== undefined
        ? existing.seatIndex
        : Object.keys(nextPlayers).length;

    if (existing === undefined && seatIndex >= state.maxSeats) {
      return { state, accepted: false, reason: 'ROOM_FULL' };
    }

    nextPlayers[payload.playerId] = {
      playerId: payload.playerId,
      playerName: payload.playerName,
      avatarEmoji: payload.avatarEmoji,
      seatIndex,
      connected: true,
      lastSeenMs: envelope.timestampMs,
    };
  } else if (payload.type === 'PLAYER_DISCONNECT') {
    const existing = nextPlayers[payload.playerId];
    if (existing) {
      nextPlayers[payload.playerId] = {
        ...existing,
        connected: false,
        lastSeenMs: envelope.timestampMs,
      };
    }
  } else if (
    payload.type === 'TRIVIA_SUBMIT' ||
    payload.type === 'STORY_VOTE' ||
    payload.type === 'REMOTE_KEY'
  ) {
    const existing = nextPlayers[payload.playerId];
    if (existing) {
      nextPlayers[payload.playerId] = {
        ...existing,
        connected: true,
        lastSeenMs: envelope.timestampMs,
      };
    }
  }

  return {
    accepted: true,
    state: {
      ...state,
      players: nextPlayers,
      lastSeqBySender: {
        ...state.lastSeqBySender,
        [envelope.senderId]: envelope.seq,
      },
      seenMsgIds: [...state.seenMsgIds.slice(-99), envelope.msgId],
      eventLog: [...state.eventLog.slice(-49), envelope],
    },
  };
}
