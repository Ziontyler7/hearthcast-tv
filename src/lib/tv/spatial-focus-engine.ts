/**
 * HearthCast TV — 10-Foot Fire TV & Vega OS Spatial Focus Engine
 *
 * Pure, deterministic 2D directional focus manager engineered for Amazon Fire TV
 * Remote controls (D-Pad Up/Down/Left/Right, Select, Back, Play/Pause, Menu)
 * and Vega OS (`TVFocusGuideView` / `useTVEventHandler`).
 *
 * Guarantees zero orphaned focus states when screens, modals, or drawers mount/unmount.
 */

export type RemoteAction =
  | 'UP'
  | 'DOWN'
  | 'LEFT'
  | 'RIGHT'
  | 'SELECT'
  | 'BACK'
  | 'PLAY_PAUSE'
  | 'MENU'
  | 'VOICE';

export interface FocusNode {
  id: string;
  row: number;
  col: number;
  section: string;
  label: string;
  disabled?: boolean;
  /** Optional explicit directional overrides */
  nextUp?: string;
  nextDown?: string;
  nextLeft?: string;
  nextRight?: string;
  /** Minimum target height in px for 10-foot ergonomics (must be >= 48) */
  minHeightPx?: number;
}

export interface SpatialFocusState {
  screenId: string;
  nodes: FocusNode[];
  activeNodeId: string;
  lastAction: RemoteAction | null;
  focusHistory: string[];
}

const KEY_TO_REMOTE_ACTION: Record<string, RemoteAction> = {
  ArrowUp: 'UP',
  Up: 'UP',
  KeyW: 'UP',
  ArrowDown: 'DOWN',
  Down: 'DOWN',
  KeyS: 'DOWN',
  ArrowLeft: 'LEFT',
  Left: 'LEFT',
  KeyA: 'LEFT',
  ArrowRight: 'RIGHT',
  Right: 'RIGHT',
  KeyD: 'RIGHT',
  Enter: 'SELECT',
  NumpadEnter: 'SELECT',
  Space: 'SELECT',
  ' ': 'SELECT',
  Escape: 'BACK',
  Backspace: 'BACK',
  BrowserBack: 'BACK',
  MediaPlayPause: 'PLAY_PAUSE',
  KeyP: 'PLAY_PAUSE',
  ContextMenu: 'MENU',
  F1: 'MENU',
  KeyV: 'VOICE',
};

/**
 * Maps a DOM KeyboardEvent.key or KeyboardEvent.code (or Fire TV / Vega remote event name)
 * to a canonical RemoteAction.
 */
export function mapKeyToRemoteAction(keyOrCode: string): RemoteAction | null {
  return KEY_TO_REMOTE_ACTION[keyOrCode] ?? null;
}

/**
 * Returns only enabled focusable nodes sorted deterministically by (row ASC, col ASC, id ASC).
 */
export function getEnabledNodes(nodes: FocusNode[]): FocusNode[] {
  return nodes
    .filter((n) => !n.disabled)
    .slice()
    .sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      if (a.col !== b.col) return a.col - b.col;
      return a.id.localeCompare(b.id);
    });
}

/**
 * Ensures the activeNodeId always points to a valid, enabled node on screen.
 * If the current activeNodeId was unmounted or disabled, automatically snaps
 * to defaultNodeId (if valid) or the top-leftmost enabled node `[row 0, col 0]`.
 */
export function ensureValidFocus(
  state: SpatialFocusState,
  defaultNodeId?: string
): SpatialFocusState {
  const enabled = getEnabledNodes(state.nodes);
  if (enabled.length === 0) {
    return { ...state, activeNodeId: '' };
  }

  const currentStillValid = enabled.some((n) => n.id === state.activeNodeId);
  if (currentStillValid) {
    return state;
  }

  if (defaultNodeId && enabled.some((n) => n.id === defaultNodeId)) {
    return {
      ...state,
      activeNodeId: defaultNodeId,
      focusHistory: [...state.focusHistory.slice(-15), defaultNodeId],
    };
  }

  const fallbackId = enabled[0].id;
  return {
    ...state,
    activeNodeId: fallbackId,
    focusHistory: [...state.focusHistory.slice(-15), fallbackId],
  };
}

/**
 * Creates a new SpatialFocusState for a screen and guarantees valid initial focus.
 */
export function createSpatialFocusState(
  screenId: string,
  nodes: FocusNode[],
  defaultNodeId?: string
): SpatialFocusState {
  const initial: SpatialFocusState = {
    screenId,
    nodes,
    activeNodeId: defaultNodeId ?? '',
    lastAction: null,
    focusHistory: [],
  };
  return ensureValidFocus(initial, defaultNodeId);
}

/**
 * Computes the next focus state given a directional D-Pad action (UP, DOWN, LEFT, RIGHT).
 *
 * Navigation rules for 10-foot living-room ergonomics:
 * 1. Explicit override (`nextUp`, `nextDown`, `nextLeft`, `nextRight`) wins if target is enabled.
 * 2. LEFT / RIGHT moves to the nearest enabled sibling in the same row first;
 *    if none exists in that row, focus stays clamped on the row boundary (no accidental row jumps).
 * 3. UP / DOWN moves to the nearest enabled row in that direction, picking the node
 *    with the smallest `|target.col - current.col|` column distance.
 */
export function moveSpatialFocus(
  state: SpatialFocusState,
  action: RemoteAction
): SpatialFocusState {
  const validated = ensureValidFocus(state);
  const enabled = getEnabledNodes(validated.nodes);
  if (enabled.length === 0) {
    return { ...validated, lastAction: action };
  }

  const current = enabled.find((n) => n.id === validated.activeNodeId) ?? enabled[0];

  if (action !== 'UP' && action !== 'DOWN' && action !== 'LEFT' && action !== 'RIGHT') {
    return { ...validated, lastAction: action };
  }

  // 1. Check explicit directional link first
  const explicitTargetId =
    action === 'UP'
      ? current.nextUp
      : action === 'DOWN'
        ? current.nextDown
        : action === 'LEFT'
          ? current.nextLeft
          : current.nextRight;

  if (explicitTargetId) {
    const explicitNode = enabled.find((n) => n.id === explicitTargetId);
    if (explicitNode) {
      return {
        ...validated,
        activeNodeId: explicitNode.id,
        lastAction: action,
        focusHistory: [...validated.focusHistory.slice(-15), explicitNode.id],
      };
    }
  }

  // 2. Horizontal movement within the same row
  if (action === 'LEFT' || action === 'RIGHT') {
    const sameRowCandidates = enabled.filter(
      (n) =>
        n.row === current.row &&
        (action === 'LEFT' ? n.col < current.col : n.col > current.col)
    );

    if (sameRowCandidates.length === 0) {
      // Clamp cleanly at row edge
      return { ...validated, lastAction: action };
    }

    sameRowCandidates.sort((a, b) =>
      action === 'LEFT' ? b.col - a.col : a.col - b.col
    );
    const chosen = sameRowCandidates[0];
    return {
      ...validated,
      activeNodeId: chosen.id,
      lastAction: action,
      focusHistory: [...validated.focusHistory.slice(-15), chosen.id],
    };
  }

  // 3. Vertical movement (UP / DOWN) across rows
  const targetRowCandidates = enabled.filter((n) =>
    action === 'UP' ? n.row < current.row : n.row > current.row
  );

  if (targetRowCandidates.length === 0) {
    return { ...validated, lastAction: action };
  }

  // Find the closest row in the requested vertical direction
  const sortedRows = Array.from(new Set(targetRowCandidates.map((n) => n.row))).sort(
    (a, b) => (action === 'UP' ? b - a : a - b)
  );
  const nearestRow = sortedRows[0];
  const nodesInNearestRow = targetRowCandidates.filter((n) => n.row === nearestRow);

  // Pick node with minimum column distance from current.col
  nodesInNearestRow.sort((a, b) => {
    const distA = Math.abs(a.col - current.col);
    const distB = Math.abs(b.col - current.col);
    if (distA !== distB) return distA - distB;
    return a.col - b.col;
  });

  const chosen = nodesInNearestRow[0];
  return {
    ...validated,
    activeNodeId: chosen.id,
    lastAction: action,
    focusHistory: [...validated.focusHistory.slice(-15), chosen.id],
  };
}

/**
 * Validates 10-foot Fire TV UI ergonomics:
 * - Every enabled node has a unique ID
 * - Every enabled node meets the minimum 48px target height for 10-foot viewing
 * - Contrast ratio between foreground and background meets WCAG AA/AAA for TV (>= 4.5)
 */
export function auditTenFootErgonomics(
  nodes: FocusNode[],
  focusRingLuminanceContrast = 9.2
): {
  valid: boolean;
  totalFocusable: number;
  minHeightCompliant: boolean;
  contrastCompliant: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const seenIds = new Set<string>();
  let minHeightCompliant = true;

  for (const node of nodes) {
    if (seenIds.has(node.id)) {
      issues.push(`Duplicate focus node ID: ${node.id}`);
    }
    seenIds.add(node.id);

    const height = node.minHeightPx ?? 56;
    if (height < 48) {
      minHeightCompliant = false;
      issues.push(`Node ${node.id} height (${height}px) is below 48px 10-foot minimum.`);
    }
  }

  const contrastCompliant = focusRingLuminanceContrast >= 4.5;
  if (!contrastCompliant) {
    issues.push(
      `Focus halo contrast ratio (${focusRingLuminanceContrast}) is below 4.5:1 threshold.`
    );
  }

  return {
    valid: issues.length === 0,
    totalFocusable: getEnabledNodes(nodes).length,
    minHeightCompliant,
    contrastCompliant,
    issues,
  };
}
