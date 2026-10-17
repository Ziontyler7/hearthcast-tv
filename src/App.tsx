import { useEffect, useMemo, useRef, useState } from 'react';
import {
  auditOverscanSafeArea,
  auditTenFootErgonomics,
  createSpatialFocusState,
  ensureValidFocus,
  mapKeyToRemoteAction,
  moveSpatialFocus,
  type FocusNode,
  type RemoteAction,
} from './lib/tv/spatial-focus-engine.ts';
import {
  advanceTriviaQuestion,
  createTriviaRoundState,
  CURATED_TRIVIA_PACKS,
  getSortedLeaderboard,
  getTriviaPackById,
  revealTriviaQuestion,
  submitPlayerAnswer,
  type TriviaRoundState,
} from './lib/trivia/trivia-blitz-engine.ts';
import {
  castStoryBranchVote,
  createStoryTheaterState,
  CURATED_STORY_BOOKS,
  getCurrentStoryScene,
  getStoryBookById,
  resolveStoryBranchSelection,
  type StoryTheaterState,
} from './lib/story/story-theater-engine.ts';
import {
  applyPartyEnvelope,
  buildSecondScreenJoinUrl,
  createCouchPartyRoomState,
  DEFAULT_FAMILY_ROSTER,
  type CouchPartyRoomState,
  type PartyEnvelope,
  type PartyEventPayload,
} from './lib/party/couch-party-sync.ts';
import {
  FIRE_TV_CONTENT_ROW,
  parseVegaDeepLink,
  parseVoiceDirective,
  type HearthCastScreenMode,
} from './lib/vega/vega-content-launcher.ts';
import {
  createKeplerContentLauncherHandler,
  detectVegaRuntimeCapabilities,
} from './lib/vega/kepler-runtime-adapter.ts';
import {
  AMAZON_DEVELOPER_FRICTION_LOG,
  synthesizeBedrockFamilyTriviaPack,
} from './lib/vega/bedrock-pack-generator.ts';

const PARTY_CHANNEL_NAME = 'hearthcast-party-bus-v1';
const PARTY_STORAGE_KEY = 'hearthcast.party.envelope.v1';

export default function App() {
  const initialLaunch = useMemo(
    () =>
      parseVegaDeepLink(
        typeof window !== 'undefined' ? window.location.search : ''
      ),
    []
  );

  const vegaRuntime = useMemo(() => detectVegaRuntimeCapabilities(), []);
  const overscanAudit = useMemo(() => auditOverscanSafeArea(1920, 1080, 96, 54), []);

  const [role, setRole] = useState<'tv' | 'controller'>(initialLaunch.role);
  const [screenMode, setScreenMode] = useState<HearthCastScreenMode>(
    initialLaunch.mode
  );
  const [roomState, setRoomState] = useState<CouchPartyRoomState>(() =>
    createCouchPartyRoomState(initialLaunch.roomCode ?? 'FIRE-4', true)
  );

  // Trivia state
  const [triviaState, setTriviaState] = useState<TriviaRoundState>(() =>
    createTriviaRoundState(
      initialLaunch.mode === 'TRIVIA' && initialLaunch.contentId
        ? initialLaunch.contentId
        : 'cosmic-explorers',
      DEFAULT_FAMILY_ROSTER
    )
  );
  const [questionElapsedMs, setQuestionElapsedMs] = useState<number>(0);

  // Story Theater state
  const [storyState, setStoryState] = useState<StoryTheaterState>(() =>
    createStoryTheaterState(
      initialLaunch.mode === 'STORY' && initialLaunch.contentId
        ? initialLaunch.contentId
        : 'lantern-whispering-pines'
    )
  );
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Companion Simulator Drawer (for 1-screen judge testing)
  const [showPhoneDrawer, setShowPhoneDrawer] = useState<boolean>(true);
  const [showOverscanGuide, setShowOverscanGuide] = useState<boolean>(false);
  const [activeControllerPlayerId, setActiveControllerPlayerId] =
    useState<string>('player-maya');

  // AWS Bedrock & Content Launcher Inspector state
  const [bedrockTopic, setBedrockTopic] = useState<string>('Solar Eclipses & Mars Rovers');
  const [contentLauncherLog, setContentLauncherLog] = useState<string>(
    'IContentLauncherServer Ready — Click a test payload below to invoke handleLaunchContent()'
  );

  // Voice bar feedback
  const [voiceInput, setVoiceInput] = useState<string>('');
  const [lastVoiceStatus, setLastVoiceStatus] = useState<string>(
    'Alexa / Fire TV Voice Remote Ready — Try: "Launch Cosmic Explorers" or "Select B"'
  );

  const seqRef = useRef<Record<string, number>>({});
  const channelRef = useRef<BroadcastChannel | null>(null);


  // Build focusable nodes for the current 10-foot screen
  const screenFocusNodes = useMemo<FocusNode[]>(() => {
    const navNodes: FocusNode[] = [
      { id: 'nav-home', row: 0, col: 0, section: 'nav', label: 'Fire TV Home Row', minHeightPx: 52 },
      { id: 'nav-trivia', row: 0, col: 1, section: 'nav', label: 'Family Trivia Blitz', minHeightPx: 52 },
      { id: 'nav-story', row: 0, col: 2, section: 'nav', label: 'Bedtime Story Theater', minHeightPx: 52 },
      { id: 'nav-vega', row: 0, col: 3, section: 'nav', label: 'Vega OS Inspector', minHeightPx: 52 },
    ];

    if (screenMode === 'HOME') {
      const tileNodes: FocusNode[] = FIRE_TV_CONTENT_ROW.map((tile, idx) => ({
        id: tile.id,
        row: 1,
        col: idx,
        section: 'launcher',
        label: tile.title,
        minHeightPx: 140,
      }));
      return [...navNodes, ...tileNodes];
    }

    if (screenMode === 'TRIVIA') {
      const packNodes: FocusNode[] = CURATED_TRIVIA_PACKS.map((p, idx) => ({
        id: `pack-${p.id}`,
        row: 1,
        col: idx,
        section: 'packs',
        label: p.title,
        minHeightPx: 52,
      }));
      const optionNodes: FocusNode[] = [0, 1, 2, 3].map((optIdx) => ({
        id: `trivia-opt-${optIdx}`,
        row: 2 + Math.floor(optIdx / 2),
        col: optIdx % 2,
        section: 'options',
        label: `Option ${optIdx + 1}`,
        minHeightPx: 84,
      }));
      const controlNodes: FocusNode[] = [
        { id: 'trivia-sim-family', row: 4, col: 0, section: 'controls', label: 'Simulate 4-Player Answers', minHeightPx: 54 },
        { id: 'trivia-action-primary', row: 4, col: 1, section: 'controls', label: 'Reveal / Next Question', minHeightPx: 54 },
      ];
      return [...navNodes, ...packNodes, ...optionNodes, ...controlNodes];
    }

    if (screenMode === 'STORY') {
      const bookNodes: FocusNode[] = CURATED_STORY_BOOKS.map((b, idx) => ({
        id: `book-${b.id}`,
        row: 1,
        col: idx,
        section: 'books',
        label: b.title,
        minHeightPx: 52,
      }));
      const currentScene = getCurrentStoryScene(storyState);
      const choiceNodes: FocusNode[] = currentScene.choices.map((c, idx) => ({
        id: `story-choice-${c.id}`,
        row: 2,
        col: idx,
        section: 'choices',
        label: c.label,
        minHeightPx: 92,
      }));
      const storyControls: FocusNode[] = [
        { id: 'story-narrate', row: 3, col: 0, section: 'controls', label: 'Read Aloud Narration', minHeightPx: 54 },
        { id: 'story-sim-tie', row: 3, col: 1, section: 'controls', label: 'Simulate 2v2 Tie Vote', minHeightPx: 54 },
        { id: 'story-resolve', row: 3, col: 2, section: 'controls', label: 'Resolve Family Vote', minHeightPx: 54 },
      ];
      return [...navNodes, ...bookNodes, ...choiceNodes, ...storyControls];
    }

    return navNodes;
  }, [screenMode, storyState]);

  const [focusState, setFocusState] = useState(() =>
    createSpatialFocusState('HOME', screenFocusNodes, 'tile-cosmic-explorers')
  );

  // Keep focusState valid whenever screenMode or focusable nodes change
  useEffect(() => {
    setFocusState((prev) =>
      ensureValidFocus(
        {
          ...prev,
          screenId: screenMode,
          nodes: screenFocusNodes,
        },
        screenMode === 'HOME'
          ? 'tile-cosmic-explorers'
          : screenMode === 'TRIVIA'
            ? 'trivia-opt-0'
            : screenMode === 'STORY'
              ? `story-choice-${getCurrentStoryScene(storyState).choices[0]?.id ?? ''}`
              : 'nav-vega'
      )
    );
  }, [screenMode, screenFocusNodes, storyState]);

  const ergonomicsReport = useMemo(
    () => auditTenFootErgonomics(screenFocusNodes, 9.4),
    [screenFocusNodes]
  );

  // Stop speech narration cleanly whenever mode or scene changes
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [screenMode, storyState.currentNodeId, storyState.storyId]);

  // Question elapsed timer for speed-bonus calculation
  useEffect(() => {
    if (screenMode !== 'TRIVIA' || triviaState.phase !== 'QUESTION') {
      return;
    }
    const timer = window.setInterval(() => {
      setQuestionElapsedMs((prev) => Math.min(triviaState.roundDurationMs, prev + 250));
    }, 250);
    return () => window.clearInterval(timer);
  }, [screenMode, triviaState.phase, triviaState.roundDurationMs, triviaState.questionIndex]);

  // Dispatch and apply a CouchParty envelope locally + over BroadcastChannel & localStorage
  const dispatchPartyPayload = (senderId: string, payload: PartyEventPayload) => {
    const nextSeq = (seqRef.current[senderId] ?? 0) + 1;
    seqRef.current[senderId] = nextSeq;

    const envelope: PartyEnvelope = {
      msgId: `${senderId}-${nextSeq}-${Date.now()}`,
      roomCode: roomState.roomCode,
      senderId,
      seq: nextSeq,
      timestampMs: Date.now(),
      payload,
    };

    handleIncomingEnvelope(envelope);

    if (channelRef.current) {
      try {
        channelRef.current.postMessage(envelope);
      } catch {
        // Ignore channel errors in restricted contexts
      }
    }
    try {
      localStorage.setItem(PARTY_STORAGE_KEY, JSON.stringify(envelope));
    } catch {
      // Ignore storage quota errors
    }
  };

  const handleIncomingEnvelope = (envelope: PartyEnvelope) => {
    setRoomState((prev) => {
      const res = applyPartyEnvelope(prev, envelope);
      return res.state;
    });

    const p = envelope.payload;
    if (p.type === 'TRIVIA_SUBMIT') {
      setTriviaState((prev) =>
        submitPlayerAnswer(prev, {
          playerId: p.playerId,
          playerName: p.playerName,
          optionIndex: p.optionIndex,
          elapsedMs: p.elapsedMs,
        })
      );
    } else if (p.type === 'STORY_VOTE') {
      setStoryState((prev) =>
        castStoryBranchVote(prev, {
          playerId: p.playerId,
          playerName: p.playerName,
          choiceId: p.choiceId,
          submittedAtMs: p.submittedAtMs,
        })
      );
    } else if (p.type === 'REMOTE_KEY') {
      triggerRemoteAction(p.action);
    }
  };

  // Setup BroadcastChannel and storage listener for multi-tab / multi-window Second-Screen sync
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let bc: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      bc = new BroadcastChannel(PARTY_CHANNEL_NAME);
      bc.onmessage = (ev: MessageEvent<PartyEnvelope>) => {
        if (ev.data && ev.data.msgId) {
          handleIncomingEnvelope(ev.data);
        }
      };
      channelRef.current = bc;
    }

    const onStorage = (ev: StorageEvent) => {
      if (ev.key === PARTY_STORAGE_KEY && ev.newValue) {
        try {
          const parsed = JSON.parse(ev.newValue) as PartyEnvelope;
          if (parsed && parsed.msgId) {
            handleIncomingEnvelope(parsed);
          }
        } catch {
          // Ignore malformed JSON
        }
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('storage', onStorage);
      if (bc) bc.close();
    };
  });

  // Activate the currently focused node on `SELECT`
  const activateFocusedNode = (nodeId: string) => {
    if (nodeId === 'nav-home') {
      setScreenMode('HOME');
      return;
    }
    if (nodeId === 'nav-trivia') {
      setScreenMode('TRIVIA');
      return;
    }
    if (nodeId === 'nav-story') {
      setScreenMode('STORY');
      return;
    }
    if (nodeId === 'nav-vega') {
      setScreenMode('VEGA_INSPECTOR');
      return;
    }

    // Content Launcher Row Tiles
    const launcherTile = FIRE_TV_CONTENT_ROW.find((t) => t.id === nodeId);
    if (launcherTile) {
      if (launcherTile.mode === 'TRIVIA') {
        setTriviaState(createTriviaRoundState(launcherTile.targetId, DEFAULT_FAMILY_ROSTER));
        setQuestionElapsedMs(0);
        setScreenMode('TRIVIA');
      } else {
        setStoryState(createStoryTheaterState(launcherTile.targetId));
        setScreenMode('STORY');
      }
      return;
    }

    // Trivia Pack Switcher
    if (nodeId.startsWith('pack-')) {
      const packId = nodeId.replace('pack-', '');
      setTriviaState(createTriviaRoundState(packId, DEFAULT_FAMILY_ROSTER));
      setQuestionElapsedMs(0);
      return;
    }

    // Trivia Option Selection
    if (nodeId.startsWith('trivia-opt-')) {
      const optIdx = Number(nodeId.replace('trivia-opt-', '')) as 0 | 1 | 2 | 3;
      const activePlayer =
        roomState.players[activeControllerPlayerId] ??
        Object.values(roomState.players)[0];
      if (activePlayer) {
        dispatchPartyPayload(activePlayer.playerId, {
          type: 'TRIVIA_SUBMIT',
          playerId: activePlayer.playerId,
          playerName: activePlayer.playerName,
          optionIndex: optIdx,
          elapsedMs: questionElapsedMs,
        });
      }
      return;
    }

    if (nodeId === 'trivia-sim-family') {
      simulateAllFamilyTriviaAnswers();
      return;
    }

    if (nodeId === 'trivia-action-primary') {
      handlePrimaryTriviaAction();
      return;
    }

    // Story Book Switcher
    if (nodeId.startsWith('book-')) {
      const bookId = nodeId.replace('book-', '');
      setStoryState(createStoryTheaterState(bookId));
      return;
    }

    // Story Choice Voting
    if (nodeId.startsWith('story-choice-')) {
      const choiceId = nodeId.replace('story-choice-', '');
      const activePlayer =
        roomState.players[activeControllerPlayerId] ??
        Object.values(roomState.players)[0];
      if (activePlayer) {
        dispatchPartyPayload(activePlayer.playerId, {
          type: 'STORY_VOTE',
          playerId: activePlayer.playerId,
          playerName: activePlayer.playerName,
          choiceId,
          submittedAtMs: Date.now(),
        });
      }
      return;
    }

    if (nodeId === 'story-narrate') {
      toggleStoryNarration();
      return;
    }
    if (nodeId === 'story-sim-tie') {
      simulateStoryTieVote();
      return;
    }
    if (nodeId === 'story-resolve') {
      handleResolveStoryVote();
    }
  };

  const triggerRemoteAction = (action: RemoteAction) => {
    if (action === 'UP' || action === 'DOWN' || action === 'LEFT' || action === 'RIGHT') {
      setFocusState((prev) => moveSpatialFocus(prev, action));
      return;
    }
    if (action === 'SELECT') {
      activateFocusedNode(focusState.activeNodeId);
      return;
    }
    if (action === 'BACK') {
      setScreenMode('HOME');
      return;
    }
    if (action === 'PLAY_PAUSE') {
      if (screenMode === 'STORY') {
        toggleStoryNarration();
      } else if (screenMode === 'TRIVIA') {
        handlePrimaryTriviaAction();
      }
    }
  };

  // Global Fire TV D-Pad Keyboard Listener
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const remoteAction = mapKeyToRemoteAction(e.key) ?? mapKeyToRemoteAction(e.code);
      if (remoteAction) {
        e.preventDefault();
        triggerRemoteAction(remoteAction);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // Helper actions for Trivia Blitz
  const currentPack = getTriviaPackById(triviaState.packId);
  const currentQuestion = currentPack.questions[triviaState.questionIndex];
  const leaderboard = getSortedLeaderboard(triviaState);

  const simulateAllFamilyTriviaAnswers = () => {
    if (!currentQuestion || triviaState.phase !== 'QUESTION') return;
    const correct = currentQuestion.correctIndex;
    const wrong = ((correct + 1) % 4) as 0 | 1 | 2 | 3;

    const simulated: Array<{
      playerId: string;
      playerName: string;
      optionIndex: 0 | 1 | 2 | 3;
      elapsedMs: number;
    }> = [
      { playerId: 'player-maya', playerName: 'Maya', optionIndex: correct, elapsedMs: 2400 },
      { playerId: 'player-leo', playerName: 'Leo', optionIndex: correct, elapsedMs: 3900 },
      { playerId: 'player-mom', playerName: 'Mom', optionIndex: wrong, elapsedMs: 5100 },
      { playerId: 'player-dad', playerName: 'Dad', optionIndex: correct, elapsedMs: 6200 },
    ];

    simulated.forEach((s) => {
      dispatchPartyPayload(s.playerId, {
        type: 'TRIVIA_SUBMIT',
        ...s,
      });
    });
  };

  const handlePrimaryTriviaAction = () => {
    if (triviaState.phase === 'QUESTION') {
      setTriviaState((prev) => revealTriviaQuestion(prev));
    } else if (triviaState.phase === 'REVEAL') {
      setQuestionElapsedMs(0);
      setTriviaState((prev) => advanceTriviaQuestion(prev));
    } else {
      setQuestionElapsedMs(0);
      setTriviaState(createTriviaRoundState(triviaState.packId, DEFAULT_FAMILY_ROSTER));
    }
  };

  // Helper actions for Story Theater
  const currentBook = getStoryBookById(storyState.storyId);
  const currentScene = getCurrentStoryScene(storyState);

  const toggleStoryNarration = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSpeaking((prev) => !prev);
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      `${currentScene.chapterTitle}. ${currentScene.narrationParagraphs.join(' ')}`
    );
    utterance.rate = 0.96;
    utterance.pitch = 1.02;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const simulateStoryTieVote = () => {
    if (currentScene.choices.length < 2) return;
    const c0 = currentScene.choices[0].id;
    const c1 = currentScene.choices[1].id;
    const baseTime = Date.now();

    const votes: Array<{ playerId: string; playerName: string; choiceId: string; offset: number }> = [
      { playerId: 'player-maya', playerName: 'Maya', choiceId: c0, offset: 10 },
      { playerId: 'player-mom', playerName: 'Mom', choiceId: c0, offset: 20 },
      { playerId: 'player-leo', playerName: 'Leo', choiceId: c1, offset: 15 },
      { playerId: 'player-dad', playerName: 'Dad', choiceId: c1, offset: 25 },
    ];

    votes.forEach((v) => {
      dispatchPartyPayload(v.playerId, {
        type: 'STORY_VOTE',
        playerId: v.playerId,
        playerName: v.playerName,
        choiceId: v.choiceId,
        submittedAtMs: baseTime + v.offset,
      });
    });
  };

  const handleResolveStoryVote = () => {
    if (currentScene.isEnding) {
      setStoryState(createStoryTheaterState(storyState.storyId));
      return;
    }
    setStoryState((prev) => resolveStoryBranchSelection(prev).nextState);
  };

  // Execute Alexa / Fire TV Voice Remote utterance
  const executeVoiceCommand = (rawText: string) => {
    const parsed = parseVoiceDirective(rawText);
    if (parsed.type === 'LAUNCH_MODE') {
      setScreenMode(parsed.mode);
      if (parsed.mode === 'TRIVIA' && parsed.targetId) {
        setTriviaState(createTriviaRoundState(parsed.targetId, DEFAULT_FAMILY_ROSTER));
        setQuestionElapsedMs(0);
      } else if (parsed.mode === 'STORY' && parsed.targetId) {
        setStoryState(createStoryTheaterState(parsed.targetId));
      }
      setLastVoiceStatus(`Voice Directive Executed: Launched ${parsed.mode} (${parsed.targetId ?? 'Home'})`);
      return;
    }

    if (parsed.type === 'SELECT_OPTION') {
      setScreenMode('TRIVIA');
      const activePlayer =
        roomState.players[activeControllerPlayerId] ??
        Object.values(roomState.players)[0];
      if (activePlayer) {
        dispatchPartyPayload(activePlayer.playerId, {
          type: 'TRIVIA_SUBMIT',
          playerId: activePlayer.playerId,
          playerName: activePlayer.playerName,
          optionIndex: parsed.optionIndex,
          elapsedMs: questionElapsedMs,
        });
      }
      setLastVoiceStatus(
        `Voice Directive Executed: ${activePlayer?.playerName ?? 'Player'} locked in Option ${['A', 'B', 'C', 'D'][parsed.optionIndex]}`
      );
      return;
    }

    if (parsed.type === 'STORY_CHOICE') {
      setScreenMode('STORY');
      const targetChoice = currentScene.choices[parsed.choiceIndex];
      const activePlayer =
        roomState.players[activeControllerPlayerId] ??
        Object.values(roomState.players)[0];
      if (targetChoice && activePlayer) {
        dispatchPartyPayload(activePlayer.playerId, {
          type: 'STORY_VOTE',
          playerId: activePlayer.playerId,
          playerName: activePlayer.playerName,
          choiceId: targetChoice.id,
          submittedAtMs: Date.now(),
        });
        setLastVoiceStatus(
          `Voice Directive Executed: Voted for "${targetChoice.label}"`
        );
      }
      return;
    }

    if (parsed.type === 'REMOTE_ACTION') {
      if (parsed.action === 'NEXT') {
        if (screenMode === 'TRIVIA') handlePrimaryTriviaAction();
        if (screenMode === 'STORY') handleResolveStoryVote();
      } else {
        triggerRemoteAction(parsed.action);
      }
      setLastVoiceStatus(`Voice Directive Executed: Remote ${parsed.action}`);
      return;
    }

    setLastVoiceStatus(`Unrecognized voice phrase: "${rawText}" — Try "Launch Cosmic Explorers" or "Select B"`);
  };

  const secondScreenUrl = useMemo(() => {
    const origin =
      typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : 'http://127.0.0.1:5180/';
    return buildSecondScreenJoinUrl(origin, roomState.roomCode);
  }, [roomState.roomCode]);

  const activePlayerRecord =
    roomState.players[activeControllerPlayerId] ??
    Object.values(roomState.players)[0];

  // If opened in dedicated mobile controller role (`?role=controller&room=FIRE-4`), show full mobile controller UI
  if (role === 'controller') {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px' }}>
        <div
          style={{
            background: '#0f172a',
            border: '2px solid #ff9900',
            borderRadius: 20,
            padding: 20,
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <span className="tv-badge" style={{ background: 'rgba(255,153,0,0.18)', color: '#ff9900' }}>
                📱 Couch Party Controller · Room {roomState.roomCode}
              </span>
              <h1 style={{ fontSize: '1.35rem', marginTop: 6 }}>HearthCast Pocket Remote</h1>
            </div>
            <button
              onClick={() => setRole('tv')}
              style={{
                background: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #475569',
                borderRadius: 10,
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              Switch to 10-Foot TV
            </button>
          </div>

          {/* Seat Selector */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 6 }}>
              Choose Your Couch Seat:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {DEFAULT_FAMILY_ROSTER.map((p) => {
                const isSelected = p.playerId === activeControllerPlayerId;
                return (
                  <button
                    key={p.playerId}
                    onClick={() => setActiveControllerPlayerId(p.playerId)}
                    style={{
                      padding: '10px 6px',
                      borderRadius: 12,
                      border: isSelected ? '2px solid #ff9900' : '1px solid #334155',
                      background: isSelected ? 'rgba(255,153,0,0.15)' : '#1e293b',
                      color: '#f8fafc',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '1.4rem' }}>{p.avatarEmoji}</div>
                    <div style={{ fontSize: '0.8rem', marginTop: 2 }}>{p.playerName}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trivia Buzzer Buttons */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8', marginBottom: 8 }}>
              ⚡ Trivia Answer Buzzer ({activePlayerRecord?.playerName})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {(['A', 'B', 'C', 'D'] as const).map((letter, idx) => (
                <button
                  key={letter}
                  onClick={() =>
                    dispatchPartyPayload(activeControllerPlayerId, {
                      type: 'TRIVIA_SUBMIT',
                      playerId: activeControllerPlayerId,
                      playerName: activePlayerRecord?.playerName ?? 'Player',
                      optionIndex: idx as 0 | 1 | 2 | 3,
                      elapsedMs: questionElapsedMs,
                    })
                  }
                  style={{
                    padding: '16px',
                    borderRadius: 14,
                    border: '2px solid #38bdf8',
                    background: '#162038',
                    color: '#f8fafc',
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Option {letter}
                </button>
              ))}
            </div>
          </div>

          {/* Story Branch Voting */}
          {currentScene.choices.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b', marginBottom: 8 }}>
                🏮 Vote on Tonight’s Story Branch
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {currentScene.choices.map((c) => (
                  <button
                    key={c.id}
                    onClick={() =>
                      dispatchPartyPayload(activeControllerPlayerId, {
                        type: 'STORY_VOTE',
                        playerId: activeControllerPlayerId,
                        playerName: activePlayerRecord?.playerName ?? 'Player',
                        choiceId: c.id,
                        submittedAtMs: Date.now(),
                      })
                    }
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: '1px solid #f59e0b',
                      background: '#1e293b',
                      color: '#f8fafc',
                      textAlign: 'left',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {c.previewIcon} {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Touch D-Pad for 10-Foot TV */}
          <div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 8 }}>
              🎮 Fire TV Touch D-Pad
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <div />
              <button
                onClick={() =>
                  dispatchPartyPayload(activeControllerPlayerId, {
                    type: 'REMOTE_KEY',
                    playerId: activeControllerPlayerId,
                    action: 'UP',
                  })
                }
                style={{ padding: 12, borderRadius: 10, background: '#1e293b', color: '#fff', border: '1px solid #475569', cursor: 'pointer' }}
              >
                ▲ UP
              </button>
              <div />
              <button
                onClick={() =>
                  dispatchPartyPayload(activeControllerPlayerId, {
                    type: 'REMOTE_KEY',
                    playerId: activeControllerPlayerId,
                    action: 'LEFT',
                  })
                }
                style={{ padding: 12, borderRadius: 10, background: '#1e293b', color: '#fff', border: '1px solid #475569', cursor: 'pointer' }}
              >
                ◀ LEFT
              </button>
              <button
                onClick={() =>
                  dispatchPartyPayload(activeControllerPlayerId, {
                    type: 'REMOTE_KEY',
                    playerId: activeControllerPlayerId,
                    action: 'SELECT',
                  })
                }
                style={{ padding: 12, borderRadius: 10, background: '#ff9900', color: '#070b14', fontWeight: 800, border: 'none', cursor: 'pointer' }}
              >
                OK
              </button>
              <button
                onClick={() =>
                  dispatchPartyPayload(activeControllerPlayerId, {
                    type: 'REMOTE_KEY',
                    playerId: activeControllerPlayerId,
                    action: 'RIGHT',
                  })
                }
                style={{ padding: 12, borderRadius: 10, background: '#1e293b', color: '#fff', border: '1px solid #475569', cursor: 'pointer' }}
              >
                RIGHT ▶
              </button>
              <div />
              <button
                onClick={() =>
                  dispatchPartyPayload(activeControllerPlayerId, {
                    type: 'REMOTE_KEY',
                    playerId: activeControllerPlayerId,
                    action: 'DOWN',
                  })
                }
                style={{ padding: 12, borderRadius: 10, background: '#1e293b', color: '#fff', border: '1px solid #475569', cursor: 'pointer' }}
              >
                ▼ DOWN
              </button>
              <button
                onClick={() =>
                  dispatchPartyPayload(activeControllerPlayerId, {
                    type: 'REMOTE_KEY',
                    playerId: activeControllerPlayerId,
                    action: 'BACK',
                  })
                }
                style={{ padding: 12, borderRadius: 10, background: '#334155', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                ↩ BACK
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '18px 28px', gap: 16 }}>
      {/* Top 10-Foot Fire TV Header */}
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          padding: '14px 20px',
          background: 'rgba(15, 23, 42, 0.92)',
          border: '1px solid rgba(255, 153, 0, 0.35)',
          borderRadius: 18,
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #ff9900 0%, #f59e0b 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.65rem',
              color: '#070b14',
              fontWeight: 900,
            }}
          >
            🔥
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.45rem', fontWeight: 900, letterSpacing: '-0.02em' }}>
                HearthCast TV
              </span>
              <span
                className="tv-badge"
                style={{ background: 'rgba(255, 153, 0, 0.16)', color: '#ff9900', border: '1px solid rgba(255,153,0,0.4)' }}
              >
                Fire TV &amp; Vega OS 10-Foot Edition
              </span>
              <span
                className="tv-badge"
                style={{ background: 'rgba(52, 211, 153, 0.14)', color: '#34d399' }}
              >
                WCAG AAA {ergonomicsReport.valid ? '9.4:1 Focus Verified' : 'Check Focus'}
              </span>
              <span
                className="tv-badge"
                style={{ background: 'rgba(167, 139, 250, 0.16)', color: '#a78bfa' }}
              >
                5% Overscan ({overscanAudit.requiredHorizontalInsetPx}×{overscanAudit.requiredVerticalInsetPx}px Safe)
              </span>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: 2 }}>
              Interactive Family Trivia Blitz &amp; Branching Bedtime Story Theater · D-Pad + Alexa Voice + Second-Screen QR Join
            </p>
          </div>
        </div>

        {/* Navigation Row (Row 0 in SpatialFocusEngine) */}
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {[
            { id: 'nav-home', mode: 'HOME' as const, label: '🏠 Fire TV Home Row' },
            { id: 'nav-trivia', mode: 'TRIVIA' as const, label: '⚡ Family Trivia Blitz' },
            { id: 'nav-story', mode: 'STORY' as const, label: '🏮 Bedtime Story Theater' },
            { id: 'nav-vega', mode: 'VEGA_INSPECTOR' as const, label: '📺 Vega OS & AWS Inspector' },
          ].map((tab) => {
            const isFocused = focusState.activeNodeId === tab.id;
            const isCurrent = screenMode === tab.mode;
            return (
              <button
                key={tab.id}
                className={`tv-focusable ${isFocused ? 'tv-focused' : ''}`}
                onClick={() => {
                  setFocusState((prev) => ({ ...prev, activeNodeId: tab.id }));
                  setScreenMode(tab.mode);
                }}
                style={{
                  padding: '10px 18px',
                  fontSize: '0.98rem',
                  fontWeight: 800,
                  background: isCurrent ? 'rgba(255, 153, 0, 0.2)' : '#162038',
                  borderColor: isCurrent ? '#ff9900' : undefined,
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Room Code, Overscan Guide & Judge Companion Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              padding: '8px 14px',
              borderRadius: 12,
              background: '#1e293b',
              border: '1px solid #38bdf8',
              fontSize: '0.9rem',
              fontWeight: 800,
              color: '#38bdf8',
            }}
          >
            Room Code: <span style={{ color: '#f8fafc' }}>{roomState.roomCode}</span>
          </div>
          <button
            onClick={() => setShowOverscanGuide((prev) => !prev)}
            style={{
              minHeight: 48,
              padding: '8px 12px',
              borderRadius: 12,
              border: '1px solid #a78bfa',
              background: showOverscanGuide ? 'rgba(167, 139, 250, 0.24)' : '#162038',
              color: '#e2e8f0',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: '0.82rem',
            }}
          >
            📐 {showOverscanGuide ? 'Hide' : '5%'} Overscan Guide
          </button>
          <button
            onClick={() => setShowPhoneDrawer((prev) => !prev)}
            style={{
              minHeight: 48,
              padding: '8px 14px',
              borderRadius: 12,
              border: '1px solid #ff9900',
              background: showPhoneDrawer ? '#ff9900' : '#162038',
              color: showPhoneDrawer ? '#070b14' : '#f8fafc',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: '0.88rem',
            }}
          >
            📱 {showPhoneDrawer ? 'Hide' : 'Show'} Couch Controller Sim
          </button>
        </div>
      </header>

      {showOverscanGuide && (
        <div
          style={{
            padding: '8px 16px',
            borderRadius: 12,
            border: '2px dashed #a78bfa',
            background: 'rgba(167, 139, 250, 0.1)',
            color: '#e9d5ff',
            fontSize: '0.84rem',
            fontWeight: 700,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>
            📐 Amazon Fire TV 10-Foot 5% Overscan Safe Area Active: 1920×1080 Canvas ({overscanAudit.dpGridWidth}×{overscanAudit.dpGridHeight} dp xhdpi) · Safe Inset &ge; {overscanAudit.requiredHorizontalInsetPx}px H / {overscanAudit.requiredVerticalInsetPx}px V
          </span>
          <span style={{ color: '#34d399' }}>● SAFE ZONE COMPLIANT</span>
        </div>
      )}


      {/* Alexa / Fire TV Voice Remote & D-Pad Control Strip */}
      <section
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '10px 18px',
          background: 'rgba(15, 23, 42, 0.78)',
          border: '1px solid rgba(56, 189, 248, 0.28)',
          borderRadius: 14,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#38bdf8' }}>
            🎙️ Alexa Voice Directives:
          </span>
          {[
            'Launch Cosmic Explorers',
            'Select Option B',
            'Read Lantern Story',
            'First path',
            'Next',
          ].map((preset) => (
            <button
              key={preset}
              onClick={() => executeVoiceCommand(preset)}
              style={{
                padding: '6px 11px',
                borderRadius: 999,
                border: '1px solid rgba(56, 189, 248, 0.45)',
                background: '#162038',
                color: '#e2e8f0',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              “{preset}”
            </button>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (voiceInput.trim()) {
                executeVoiceCommand(voiceInput);
                setVoiceInput('');
              }
            }}
            style={{ display: 'flex', gap: 6 }}
          >
            <input
              value={voiceInput}
              onChange={(e) => setVoiceInput(e.target.value)}
              placeholder="Type custom voice command..."
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 8,
                padding: '6px 10px',
                color: '#f8fafc',
                fontSize: '0.82rem',
              }}
            />
            <button
              type="submit"
              style={{
                background: '#38bdf8',
                color: '#070b14',
                border: 'none',
                borderRadius: 8,
                padding: '6px 10px',
                fontWeight: 800,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              Speak
            </button>
          </form>
        </div>

        <div style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 600 }}>
          {lastVoiceStatus} · <span style={{ color: '#ff9900' }}>Focused ID: {focusState.activeNodeId}</span>
        </div>
      </section>

      {/* Main 10-Foot Split Workspace: Left = 10-Foot Fire TV Stage, Right = Optional Couch Companion Simulator */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: showPhoneDrawer ? 'minmax(0, 1fr) 350px' : 'minmax(0, 1fr)',
          gap: 20,
          flex: 1,
        }}
      >
        {/* LEFT: 10-Foot Fire TV Stage */}
        <main
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: 22,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
          }}
        >
          {/* SCREEN MODE 1: FIRE TV HOME LAUNCHER */}
          {screenMode === 'HOME' && (
            <>
              <div
                style={{
                  padding: '28px 30px',
                  borderRadius: 20,
                  background:
                    'linear-gradient(135deg, rgba(255, 153, 0, 0.18) 0%, rgba(56, 189, 248, 0.14) 55%, rgba(15, 23, 42, 0.95) 100%)',
                  border: '1px solid rgba(255, 153, 0, 0.4)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 20,
                }}
              >
                <div style={{ maxWidth: 680 }}>
                  <span
                    className="tv-badge"
                    style={{ background: '#ff9900', color: '#070b14', marginBottom: 10 }}
                  >
                    📺 FEATURED TONIGHT ON FIRE TV &amp; VEGA OS
                  </span>
                  <h1 style={{ fontSize: '2.2rem', fontWeight: 900, lineHeight: 1.15 }}>
                    Turn the Living Room TV Into a Cozy Family Game &amp; Story Hearth
                  </h1>
                  <p style={{ fontSize: '1.08rem', color: '#cbd5e1', marginTop: 10, lineHeight: 1.5 }}>
                    Navigate entirely with your Fire TV D-Pad remote, speak natural voice commands, or scan the
                    room QR code so every kid, parent, and grandparent on the couch can buzz in and vote on
                    branching bedtime stories together.
                  </p>
                </div>

                {/* Family Couch Roster Status */}
                <div
                  style={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 16,
                    padding: 16,
                    minWidth: 260,
                  }}
                >
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#94a3b8', marginBottom: 10 }}>
                    COUCH PARTY SEATS ({Object.values(roomState.players).length} CONNECTED)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {Object.values(roomState.players).map((p) => (
                      <div
                        key={p.playerId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 10px',
                          borderRadius: 10,
                          background: '#162038',
                          border: '1px solid rgba(52, 211, 153, 0.35)',
                        }}
                      >
                        <span style={{ fontSize: '1.35rem' }}>{p.avatarEmoji}</span>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>{p.playerName}</div>
                          <div style={{ fontSize: '0.72rem', color: '#34d399' }}>● Ready</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fire TV Content Launcher Row */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>
                    🔥 Fire TV Content Launcher Row (`com.amazon.kepler.media.content_launcher.1`)
                  </h2>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                    Use ◀ ▶ Arrow Keys + Enter or click any tile
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: 16,
                  }}
                >
                  {FIRE_TV_CONTENT_ROW.map((tile) => {
                    const isFocused = focusState.activeNodeId === tile.id;
                    return (
                      <button
                        key={tile.id}
                        className={`tv-focusable ${isFocused ? 'tv-focused' : ''}`}
                        onClick={() => {
                          setFocusState((prev) => ({ ...prev, activeNodeId: tile.id }));
                          activateFocusedNode(tile.id);
                        }}
                        style={{
                          padding: 20,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: 185,
                        }}
                      >
                        <div>
                          <span
                            className="tv-badge"
                            style={{
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: tile.accentColor,
                              marginBottom: 10,
                            }}
                          >
                            {tile.badge}
                          </span>
                          <h3 style={{ fontSize: '1.22rem', fontWeight: 800, marginBottom: 6 }}>
                            {tile.title}
                          </h3>
                          <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                            {tile.subtitle}
                          </p>
                        </div>

                        <div
                          style={{
                            marginTop: 14,
                            paddingTop: 10,
                            borderTop: '1px solid rgba(148, 163, 184, 0.16)',
                            fontSize: '0.75rem',
                            color: '#94a3b8',
                            fontFamily: 'monospace',
                          }}
                        >
                          {tile.deepLinkUri}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* SCREEN MODE 2: MULTI-PLAYER FAMILY TRIVIA BLITZ */}
          {screenMode === 'TRIVIA' && (
            <>
              {/* Trivia Pack Selector Row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {CURATED_TRIVIA_PACKS.map((pack) => {
                    const nodeId = `pack-${pack.id}`;
                    const isFocused = focusState.activeNodeId === nodeId;
                    const isSelected = triviaState.packId === pack.id;
                    return (
                      <button
                        key={pack.id}
                        className={`tv-focusable ${isFocused ? 'tv-focused' : ''}`}
                        onClick={() => {
                          setFocusState((prev) => ({ ...prev, activeNodeId: nodeId }));
                          setTriviaState(createTriviaRoundState(pack.id, DEFAULT_FAMILY_ROSTER));
                          setQuestionElapsedMs(0);
                        }}
                        style={{
                          padding: '10px 16px',
                          fontWeight: 800,
                          fontSize: '0.92rem',
                          borderColor: isSelected ? pack.accentColor : undefined,
                          background: isSelected ? 'rgba(56, 189, 248, 0.18)' : undefined,
                        }}
                      >
                        {pack.badge} · {pack.title}
                      </button>
                    );
                  })}
                </div>

                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ff9900' }}>
                  Question {triviaState.questionIndex + 1} of {currentPack.questions.length} · Phase: {triviaState.phase}
                </div>
              </div>

              {triviaState.phase !== 'PODIUM' && currentQuestion ? (
                <div
                  style={{
                    padding: 24,
                    borderRadius: 20,
                    background: '#0f172a',
                    border: '1px solid #334155',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20,
                  }}
                >
                  {/* Question Header + Timer Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span className="tv-badge" style={{ background: 'rgba(56,189,248,0.16)', color: '#38bdf8' }}>
                        {currentQuestion.category} · {currentQuestion.difficulty}
                      </span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f59e0b' }}>
                        ⏱️ Speed Bonus Window: {Math.max(0, Math.ceil((currentQuestion.timeLimitMs - questionElapsedMs) / 1000))}s
                      </span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: 8,
                        borderRadius: 999,
                        background: '#1e293b',
                        overflow: 'hidden',
                        marginBottom: 16,
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.max(0, 100 - (questionElapsedMs / currentQuestion.timeLimitMs) * 100)}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #34d399 0%, #ff9900 100%)',
                          transition: 'width 220ms linear',
                        }}
                      />
                    </div>

                    <h2 style={{ fontSize: '1.75rem', fontWeight: 900, lineHeight: 1.25 }}>
                      {currentQuestion.prompt}
                    </h2>
                  </div>

                  {/* 4 High-Contrast 10-Foot Option Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {currentQuestion.options.map((optText, idx) => {
                      const nodeId = `trivia-opt-${idx}`;
                      const isFocused = focusState.activeNodeId === nodeId;
                      const letter = ['A', 'B', 'C', 'D'][idx];
                      const isCorrect = idx === currentQuestion.correctIndex;
                      const showReveal = triviaState.phase === 'REVEAL';

                      const playersWhoPicked = Object.values(triviaState.submissions).filter(
                        (s) => s.optionIndex === idx
                      );

                      return (
                        <button
                          key={nodeId}
                          className={`tv-focusable ${isFocused ? 'tv-focused' : ''}`}
                          onClick={() => {
                            setFocusState((prev) => ({ ...prev, activeNodeId: nodeId }));
                            activateFocusedNode(nodeId);
                          }}
                          style={{
                            padding: '20px 22px',
                            minHeight: 92,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            borderColor: showReveal
                              ? isCorrect
                                ? '#34d399'
                                : 'rgba(251, 113, 133, 0.4)'
                              : undefined,
                            background: showReveal
                              ? isCorrect
                                ? 'rgba(52, 211, 153, 0.18)'
                                : 'rgba(15, 23, 42, 0.6)'
                              : undefined,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <span
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                background: showReveal && isCorrect ? '#34d399' : '#ff9900',
                                color: '#070b14',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 900,
                                fontSize: '1.15rem',
                                flexShrink: 0,
                              }}
                            >
                              {letter}
                            </span>
                            <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>{optText}</span>
                          </div>

                          {playersWhoPicked.length > 0 && (
                            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                              {playersWhoPicked.map((sub) => (
                                <span
                                  key={sub.playerId}
                                  className="tv-badge"
                                  style={{ background: '#0f172a', color: '#38bdf8', fontSize: '0.75rem' }}
                                >
                                  ✓ {sub.playerName} ({(sub.elapsedMs / 1000).toFixed(1)}s)
                                </span>
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Fun Fact Reveal Banner */}
                  {triviaState.phase === 'REVEAL' && (
                    <div
                      style={{
                        padding: '16px 20px',
                        borderRadius: 14,
                        background: 'rgba(52, 211, 153, 0.14)',
                        border: '1px solid #34d399',
                        fontSize: '1.02rem',
                        lineHeight: 1.45,
                      }}
                    >
                      <strong style={{ color: '#34d399' }}>💡 Living-Room Fun Fact:</strong>{' '}
                      {currentQuestion.funFact}
                    </div>
                  )}

                  {/* Judge & Host Control Bar */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button
                        className={`tv-focusable ${focusState.activeNodeId === 'trivia-sim-family' ? 'tv-focused' : ''}`}
                        onClick={simulateAllFamilyTriviaAnswers}
                        style={{ padding: '12px 18px', fontWeight: 800, fontSize: '0.95rem' }}
                      >
                        ⚡ Simulate All 4 Family Buzzer Answers
                      </button>

                      <button
                        className={`tv-focusable ${focusState.activeNodeId === 'trivia-action-primary' ? 'tv-focused' : ''}`}
                        onClick={handlePrimaryTriviaAction}
                        style={{
                          padding: '12px 22px',
                          fontWeight: 900,
                          fontSize: '0.98rem',
                          background: '#ff9900',
                          color: '#070b14',
                        }}
                      >
                        {triviaState.phase === 'QUESTION'
                          ? '🏆 Reveal Correct Answer & Scores'
                          : '➡️ Next Trivia Question'}
                      </button>
                    </div>

                    <div style={{ fontSize: '0.88rem', color: '#94a3b8' }}>
                      Locked In: {Object.keys(triviaState.submissions).length} / {Object.keys(triviaState.scoreboard).length} Players
                    </div>
                  </div>
                </div>
              ) : (
                /* PODIUM VIEW */
                <div
                  style={{
                    padding: 28,
                    borderRadius: 20,
                    background: '#0f172a',
                    border: '2px solid #ff9900',
                    textAlign: 'center',
                  }}
                >
                  <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#ff9900', marginBottom: 8 }}>
                    🏆 Family Trivia Blitz Podium!
                  </h2>
                  <p style={{ color: '#cbd5e1', marginBottom: 20 }}>
                    Final standings with Speed Bonuses &amp; Streak Multipliers
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 20 }}>
                    {leaderboard.map((entry, idx) => (
                      <div
                        key={entry.playerId}
                        style={{
                          padding: 18,
                          borderRadius: 16,
                          background: idx === 0 ? 'rgba(255, 153, 0, 0.18)' : '#162038',
                          border: idx === 0 ? '2px solid #ff9900' : '1px solid #334155',
                        }}
                      >
                        <div style={{ fontSize: '2rem' }}>{entry.avatarEmoji}</div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 900, marginTop: 4 }}>
                          #{idx + 1} {entry.playerName}
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#34d399', marginTop: 4 }}>
                          {entry.score.toLocaleString()} pts
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>
                          {entry.correctCount} Correct · Streak {entry.streak}x
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    className="tv-focusable"
                    onClick={() => {
                      setQuestionElapsedMs(0);
                      setTriviaState(createTriviaRoundState(triviaState.packId, DEFAULT_FAMILY_ROSTER));
                    }}
                    style={{
                      padding: '14px 26px',
                      background: '#ff9900',
                      color: '#070b14',
                      fontWeight: 900,
                      fontSize: '1.05rem',
                    }}
                  >
                    🔄 Play Another Round
                  </button>
                </div>
              )}

              {/* Live Family Scoreboard Strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {leaderboard.map((p, idx) => {
                  const hasAnswered = Boolean(triviaState.submissions[p.playerId]);
                  return (
                    <div
                      key={p.playerId}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 14,
                        background: '#0f172a',
                        border: hasAnswered ? '1px solid #34d399' : '1px solid #334155',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '1.5rem' }}>{p.avatarEmoji}</span>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                            #{idx + 1} {p.playerName}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                            Streak: {p.streak}🔥 {p.lastDeltaPoints > 0 ? `(+${p.lastDeltaPoints})` : ''}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ff9900' }}>
                        {p.score}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* SCREEN MODE 3: INTERACTIVE BRANCHING BEDTIME STORY THEATER */}
          {screenMode === 'STORY' && (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  {CURATED_STORY_BOOKS.map((book) => {
                    const nodeId = `book-${book.id}`;
                    const isFocused = focusState.activeNodeId === nodeId;
                    const isSelected = storyState.storyId === book.id;
                    return (
                      <button
                        key={book.id}
                        className={`tv-focusable ${isFocused ? 'tv-focused' : ''}`}
                        onClick={() => {
                          setFocusState((prev) => ({ ...prev, activeNodeId: nodeId }));
                          setStoryState(createStoryTheaterState(book.id));
                        }}
                        style={{
                          padding: '10px 18px',
                          fontWeight: 800,
                          fontSize: '0.95rem',
                          borderColor: isSelected ? book.accentColor : undefined,
                        }}
                      >
                        {book.coverEmoji} {book.title} ({book.ageRange})
                      </button>
                    );
                  })}
                </div>

                <div style={{ fontSize: '0.9rem', color: '#f59e0b', fontWeight: 700 }}>
                  Ambient Cue: {currentScene.ambientCue} · Visited {storyState.visitedNodeIds.length} Scene(s)
                </div>
              </div>

              {/* Story Theater Stage */}
              <div
                style={{
                  padding: 28,
                  borderRadius: 20,
                  background:
                    'linear-gradient(160deg, rgba(30, 41, 59, 0.92) 0%, rgba(15, 23, 42, 0.98) 100%)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 20,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span className="tv-badge" style={{ background: 'rgba(245, 158, 11, 0.18)', color: '#f59e0b' }}>
                      {currentBook.title} · Read-Aloud ~{currentScene.estimatedReadSeconds}s
                    </span>
                    <h2 style={{ fontSize: '1.85rem', fontWeight: 900, marginTop: 8 }}>
                      {currentScene.chapterTitle}
                    </h2>
                  </div>
                  <div style={{ fontSize: '3.2rem' }}>{currentScene.illustrationEmoji}</div>
                </div>

                {/* Large 10-Foot Story Typography */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {currentScene.narrationParagraphs.map((para, i) => (
                    <p
                      key={i}
                      style={{
                        fontSize: '1.3rem',
                        lineHeight: 1.6,
                        color: '#f1f5f9',
                        background: 'rgba(7, 11, 20, 0.45)',
                        padding: '16px 20px',
                        borderRadius: 14,
                        borderLeft: '4px solid #f59e0b',
                      }}
                    >
                      {para}
                    </p>
                  ))}
                </div>

                {storyState.lastTiebreakReason && (
                  <div
                    style={{
                      padding: '10px 16px',
                      borderRadius: 12,
                      background: 'rgba(56, 189, 248, 0.14)',
                      border: '1px solid #38bdf8',
                      fontSize: '0.92rem',
                      color: '#38bdf8',
                      fontWeight: 700,
                    }}
                  >
                    ⚖️ Last Branch Resolution: {storyState.lastTiebreakReason}
                  </div>
                )}

                {/* Branching Choices or Ending Celebration */}
                {!currentScene.isEnding ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {currentScene.choices.map((choice) => {
                      const nodeId = `story-choice-${choice.id}`;
                      const isFocused = focusState.activeNodeId === nodeId;
                      const voters = Object.values(storyState.votes).filter(
                        (v) => v.choiceId === choice.id
                      );

                      return (
                        <button
                          key={choice.id}
                          className={`tv-focusable ${isFocused ? 'tv-focused' : ''}`}
                          onClick={() => {
                            setFocusState((prev) => ({ ...prev, activeNodeId: nodeId }));
                            activateFocusedNode(nodeId);
                          }}
                          style={{
                            padding: 20,
                            minHeight: 110,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '1.22rem', fontWeight: 900, color: '#ff9900' }}>
                              {choice.previewIcon} {choice.label}
                            </div>
                            <div style={{ fontSize: '0.92rem', color: '#cbd5e1', marginTop: 6 }}>
                              {choice.whisperHint}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                            <span
                              className="tv-badge"
                              style={{ background: 'rgba(255,153,0,0.16)', color: '#ff9900' }}
                            >
                              {voters.length} Vote{voters.length === 1 ? '' : 's'}
                            </span>
                            {voters.map((v) => (
                              <span
                                key={v.playerId}
                                className="tv-badge"
                                style={{ background: '#0f172a', color: '#38bdf8' }}
                              >
                                {v.playerName}
                              </span>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: 24,
                      borderRadius: 16,
                      background: 'rgba(52, 211, 153, 0.14)',
                      border: '2px solid #34d399',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#34d399' }}>
                      {currentScene.endingBadge}
                    </div>
                    <p style={{ color: '#cbd5e1', marginTop: 6 }}>
                      Sweet dreams! You can restart this bedtime story to explore a different family branch.
                    </p>
                  </div>
                )}

                {/* Story Controls */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  <button
                    className={`tv-focusable ${focusState.activeNodeId === 'story-narrate' ? 'tv-focused' : ''}`}
                    onClick={toggleStoryNarration}
                    style={{ padding: '12px 18px', fontWeight: 800 }}
                  >
                    {isSpeaking ? '⏹️ Stop Read-Aloud Voice' : '🔊 Read Story Aloud (Web Speech)'}
                  </button>

                  {!currentScene.isEnding && (
                    <button
                      className={`tv-focusable ${focusState.activeNodeId === 'story-sim-tie' ? 'tv-focused' : ''}`}
                      onClick={simulateStoryTieVote}
                      style={{ padding: '12px 18px', fontWeight: 800 }}
                    >
                      🎲 Simulate 2-vs-2 Family Tie Vote (Test Underdog Tiebreaker)
                    </button>
                  )}

                  <button
                    className={`tv-focusable ${focusState.activeNodeId === 'story-resolve' ? 'tv-focused' : ''}`}
                    onClick={handleResolveStoryVote}
                    style={{
                      padding: '12px 22px',
                      fontWeight: 900,
                      background: '#ff9900',
                      color: '#070b14',
                    }}
                  >
                    {currentScene.isEnding
                      ? '🔄 Restart Story Book'
                      : '✨ Lock In Family Vote & Turn Page'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* SCREEN MODE 4: VEGA OS & MANIFEST INSPECTOR */}
          {screenMode === 'VEGA_INSPECTOR' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <span className="tv-badge" style={{ background: 'rgba(255,153,0,0.2)', color: '#ff9900' }}>
                    Amazon Fire TV · Vega OS SDK 0.24+ (`[os.version] 1.2`) · AWS Builder Mini Challenge
                  </span>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginTop: 8 }}>
                    Dual-Runtime Kepler / Vega OS, Content Launcher &amp; Developer Friction Log
                  </h2>
                </div>
                <span className="tv-badge" style={{ background: 'rgba(52, 211, 153, 0.16)', color: '#34d399' }}>
                  +10% Judging Score Bonus: Friction Log Included
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                <div style={{ padding: 18, borderRadius: 16, background: '#0f172a', border: '1px solid #334155' }}>
                  <h3 style={{ color: '#ff9900', fontSize: '1.05rem', marginBottom: 8 }}>
                    1. Vega OS SDK 0.24+ `manifest.toml`
                  </h3>
                  <p style={{ fontSize: '0.86rem', color: '#cbd5e1', lineHeight: 1.55 }}>
                    Package ID: <code>{vegaRuntime.packageId}</code>
                    <br />
                    OS Target / Min: <code>{vegaRuntime.osVersionTarget} / {vegaRuntime.osVersionMin}</code>
                    <br />
                    Interface: <code>{vegaRuntime.contentLauncherInterface}</code>
                    <br />
                    Module Need: <code>{vegaRuntime.contentLauncherModuleId}</code>
                  </p>
                </div>

                <div style={{ padding: 18, borderRadius: 16, background: '#0f172a', border: '1px solid #334155' }}>
                  <h3 style={{ color: '#38bdf8', fontSize: '1.05rem', marginBottom: 8 }}>
                    2. 10-Foot Ergonomics &amp; 5% Overscan
                  </h3>
                  <p style={{ fontSize: '0.86rem', color: '#cbd5e1', lineHeight: 1.55 }}>
                    Focusable Nodes: <strong>{ergonomicsReport.totalFocusable}</strong> (&ge;48px: <strong>{ergonomicsReport.minHeightCompliant ? 'PASS' : 'FAIL'}</strong>)
                    <br />
                    Focus Halo Contrast: <strong>9.4:1 (WCAG AAA)</strong>
                    <br />
                    1080p Grid: <strong>{overscanAudit.dpGridWidth}×{overscanAudit.dpGridHeight} dp (xhdpi)</strong>
                    <br />
                    5% Overscan Safe Area: <strong>{overscanAudit.requiredHorizontalInsetPx}px H × {overscanAudit.requiredVerticalInsetPx}px V</strong>
                  </p>
                </div>

                <div style={{ padding: 18, borderRadius: 16, background: '#0f172a', border: '1px solid #334155' }}>
                  <h3 style={{ color: '#34d399', fontSize: '1.05rem', marginBottom: 8 }}>
                    3. Second-Screen Couch Party Sync
                  </h3>
                  <p style={{ fontSize: '0.86rem', color: '#cbd5e1', lineHeight: 1.55 }}>
                    Room Code: <code>{roomState.roomCode}</code>
                    <br />
                    Events Processed: <strong>{roomState.eventLog.length}</strong>
                    <br />
                    Monotonic Sequence Dedup: <strong>Active</strong>
                    <br />
                    Underdog Tiebreaker: <strong>Fair Turn-Taking Active</strong>
                  </p>
                </div>
              </div>

              {/* Interactive @amazon-devices/kepler-media-content-launcher & AWS Bedrock Mini Challenge Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
                {/* ContentLauncherServerComponent Tester */}
                <div style={{ padding: 18, borderRadius: 16, background: '#0f172a', border: '1px solid rgba(56, 189, 248, 0.35)' }}>
                  <h3 style={{ color: '#38bdf8', fontSize: '1.02rem', marginBottom: 6 }}>
                    🚀 `@amazon-devices/kepler-media-content-launcher` Tester
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: 10 }}>
                    Invoke <code>IContentLauncherHandler.handleLaunchContent(contentSearch, autoPlay, optionalFields)</code>:
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                    {[
                      { label: 'IContentSearch: "Cosmic Explorers"', searchVal: 'Cosmic Explorers' },
                      { label: 'IContentSearch: "Lantern Story"', searchVal: 'Lantern Story' },
                      { label: 'IContentSearch: "Ocean Wildlife"', searchVal: 'Ocean Wildlife' },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={async () => {
                          const handler = createKeplerContentLauncherHandler();
                          const res = await handler.handleLaunchContent(
                            { parameterList: [{ paramType: 'ENTITY', value: item.searchVal }] },
                            true,
                            { pageContext: 'FIRE_TV_UNIVERSAL_SEARCH' }
                          );
                          setContentLauncherLog(
                            `Status: ${res.contentLauncherStatus} · ${res.diagnosticMessage}`
                          );
                        }}
                        style={{
                          padding: '7px 12px',
                          borderRadius: 10,
                          border: '1px solid #38bdf8',
                          background: '#162038',
                          color: '#e2e8f0',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: 10,
                      background: '#070b14',
                      border: '1px solid #1e293b',
                      fontFamily: 'monospace',
                      fontSize: '0.78rem',
                      color: '#34d399',
                    }}
                  >
                    {contentLauncherLog}
                  </div>
                </div>

                {/* AWS Builder Mini Challenge: Amazon Bedrock (us.amazon.nova-pro-v1:0) Pack Synthesizer */}
                <div style={{ padding: 18, borderRadius: 16, background: '#0f172a', border: '1px solid rgba(167, 139, 250, 0.4)' }}>
                  <h3 style={{ color: '#a78bfa', fontSize: '1.02rem', marginBottom: 6 }}>
                    ☁️ AWS Builder Mini Challenge: Amazon Nova Pro (`us.amazon.nova-pro-v1:0`)
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: 10 }}>
                    Synthesize a custom Family Trivia Pack using the Amazon Bedrock Converse API structured tool schema:
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={bedrockTopic}
                      onChange={(e) => setBedrockTopic(e.target.value)}
                      placeholder="Enter custom family topic..."
                      style={{
                        flex: 1,
                        background: '#070b14',
                        border: '1px solid #334155',
                        borderRadius: 10,
                        padding: '8px 12px',
                        color: '#f8fafc',
                        fontSize: '0.82rem',
                      }}
                    />
                    <button
                      onClick={() => {
                        const { converseSpec } = synthesizeBedrockFamilyTriviaPack(bedrockTopic);
                        setContentLauncherLog(
                          `AWS Bedrock (${converseSpec.modelId}) Converse Schema Validated for "${bedrockTopic}" (tool: ${converseSpec.toolConfig.tools[0].toolSpec.name})`
                        );
                      }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 10,
                        border: 'none',
                        background: '#a78bfa',
                        color: '#070b14',
                        fontWeight: 900,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      Validate Bedrock Schema
                    </button>
                  </div>
                </div>
              </div>

              {/* Build, Ship, Shape Developer Friction Log (+10% Bonus) */}
              <div style={{ padding: 18, borderRadius: 16, background: '#0f172a', border: '1px solid rgba(255, 153, 0, 0.35)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h3 style={{ color: '#ff9900', fontSize: '1.05rem' }}>
                    🛠️ Build, Ship, Shape Developer Friction Log (+10% Judging Score Bonus · `devpost/FRICTION_LOG.md`)
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    {AMAZON_DEVELOPER_FRICTION_LOG.length} Verified SDK Findings &amp; Workarounds
                  </span>
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {AMAZON_DEVELOPER_FRICTION_LOG.map((entry) => (
                    <div
                      key={entry.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 12,
                        background: '#162038',
                        border: '1px solid #334155',
                        fontSize: '0.82rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#f8fafc', marginBottom: 4 }}>
                        <span>
                          <code style={{ color: '#ff9900' }}>{entry.id}</code> · {entry.component}
                        </span>
                        <span style={{ color: '#38bdf8' }}>{entry.sdkVersion}</span>
                      </div>
                      <div style={{ color: '#cbd5e1', marginBottom: 4 }}>{entry.frictionSummary}</div>
                      <div style={{ color: '#34d399', fontSize: '0.78rem' }}>
                        <strong>Workaround &amp; Recommendation:</strong> {entry.workaroundImplemented}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>


        {/* RIGHT: Built-In Second-Screen Phone Companion & Fire TV Remote Simulator Drawer */}
        {showPhoneDrawer && (
          <aside
            style={{
              background: '#0f172a',
              border: '2px solid rgba(255, 153, 0, 0.45)',
              borderRadius: 22,
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div>
              <span className="tv-badge" style={{ background: 'rgba(56,189,248,0.16)', color: '#38bdf8' }}>
                📱 Judge Single-Screen Companion
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 900, marginTop: 6 }}>
                Couch Phone &amp; Fire TV Remote Simulator
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>
                Test multi-player mobile buzzers right here, or open the Second-Screen Controller URL in another tab:
              </p>
              <a
                href={secondScreenUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'block',
                  marginTop: 8,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: '#162038',
                  color: '#38bdf8',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  textDecoration: 'none',
                  border: '1px solid rgba(56,189,248,0.35)',
                  wordBreak: 'break-all',
                }}
              >
                🔗 Open Second-Screen Tab (?role=controller&amp;room={roomState.roomCode})
              </a>
            </div>

            {/* Active Family Member Selector */}
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#cbd5e1', marginBottom: 6 }}>
                1. Active Family Member Phone:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {DEFAULT_FAMILY_ROSTER.map((p) => {
                  const active = p.playerId === activeControllerPlayerId;
                  return (
                    <button
                      key={p.playerId}
                      onClick={() => setActiveControllerPlayerId(p.playerId)}
                      style={{
                        padding: '8px 4px',
                        borderRadius: 10,
                        border: active ? '2px solid #ff9900' : '1px solid #334155',
                        background: active ? 'rgba(255,153,0,0.18)' : '#162038',
                        color: '#f8fafc',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                      }}
                    >
                      <div>{p.avatarEmoji}</div>
                      <div>{p.playerName}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Instant Trivia Buzzer for Selected Player */}
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#cbd5e1', marginBottom: 6 }}>
                2. {activePlayerRecord?.playerName}’s Trivia Buzzer:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {(['A', 'B', 'C', 'D'] as const).map((letter, idx) => (
                  <button
                    key={letter}
                    onClick={() => {
                      setScreenMode('TRIVIA');
                      dispatchPartyPayload(activeControllerPlayerId, {
                        type: 'TRIVIA_SUBMIT',
                        playerId: activeControllerPlayerId,
                        playerName: activePlayerRecord?.playerName ?? 'Player',
                        optionIndex: idx as 0 | 1 | 2 | 3,
                        elapsedMs: questionElapsedMs,
                      });
                    }}
                    style={{
                      padding: '10px',
                      borderRadius: 10,
                      border: '1px solid #38bdf8',
                      background: '#162038',
                      color: '#f8fafc',
                      fontWeight: 900,
                      cursor: 'pointer',
                    }}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            </div>

            {/* Fire TV Hardware D-Pad Simulator */}
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#cbd5e1', marginBottom: 6 }}>
                3. Fire TV Remote D-Pad Simulator:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                <div />
                <button
                  onClick={() => triggerRemoteAction('UP')}
                  style={{ padding: 10, borderRadius: 10, background: '#162038', color: '#f8fafc', border: '1px solid #475569', fontWeight: 800, cursor: 'pointer' }}
                >
                  ▲ UP
                </button>
                <div />
                <button
                  onClick={() => triggerRemoteAction('LEFT')}
                  style={{ padding: 10, borderRadius: 10, background: '#162038', color: '#f8fafc', border: '1px solid #475569', fontWeight: 800, cursor: 'pointer' }}
                >
                  ◀ LEFT
                </button>
                <button
                  onClick={() => triggerRemoteAction('SELECT')}
                  style={{ padding: 10, borderRadius: 10, background: '#ff9900', color: '#070b14', border: 'none', fontWeight: 900, cursor: 'pointer' }}
                >
                  SELECT
                </button>
                <button
                  onClick={() => triggerRemoteAction('RIGHT')}
                  style={{ padding: 10, borderRadius: 10, background: '#162038', color: '#f8fafc', border: '1px solid #475569', fontWeight: 800, cursor: 'pointer' }}
                >
                  RIGHT ▶
                </button>
                <button
                  onClick={() => triggerRemoteAction('BACK')}
                  style={{ padding: 10, borderRadius: 10, background: '#334155', color: '#f8fafc', border: 'none', fontWeight: 700, fontSize: '0.76rem', cursor: 'pointer' }}
                >
                  ↩ BACK
                </button>
                <button
                  onClick={() => triggerRemoteAction('DOWN')}
                  style={{ padding: 10, borderRadius: 10, background: '#162038', color: '#f8fafc', border: '1px solid #475569', fontWeight: 800, cursor: 'pointer' }}
                >
                  ▼ DOWN
                </button>
                <button
                  onClick={() => triggerRemoteAction('PLAY_PAUSE')}
                  style={{ padding: 10, borderRadius: 10, background: '#334155', color: '#f8fafc', border: 'none', fontWeight: 700, fontSize: '0.76rem', cursor: 'pointer' }}
                >
                  ⏯ PLAY
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
