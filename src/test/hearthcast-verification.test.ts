/**
 * HearthCast TV — Automated Verification Suite (Gates 1–6)
 *
 * Pure-math and runtime verification suite for:
 * - Gate 1: 10-Foot Fire TV Spatial Focus Engine & Orphaned Focus Recovery
 * - Gate 2: Multi-Player Family Trivia Blitz Speed Bonus & Streak Engine
 * - Gate 3: Interactive Branching Bedtime Story Theater & Underdog Tiebreaker
 * - Gate 4: Second-Screen QR Couch Party Sync Bus & Sequence Deduplication
 * - Gate 5: Amazon Vega OS Content Launcher Deep-Links & Alexa Voice Directives
 * - Gate 6: Vega OS Manifest, Port 5180 Isolation & Zero-CDN Bundle Audit
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  auditOverscanSafeArea,
  auditTenFootErgonomics,
  createSpatialFocusState,
  ensureValidFocus,
  mapKeyToRemoteAction,
  moveSpatialFocus,
  restoreRowFocusMemory,
  type FocusNode,
} from '../lib/tv/spatial-focus-engine.ts';
import {
  advanceTriviaQuestion,
  calculateTriviaAnswerScore,
  createTriviaRoundState,
  getSortedLeaderboard,
  revealTriviaQuestion,
  submitPlayerAnswer,
} from '../lib/trivia/trivia-blitz-engine.ts';
import {
  castStoryBranchVote,
  createStoryTheaterState,
  getCurrentStoryScene,
  resolveStoryBranchSelection,
} from '../lib/story/story-theater-engine.ts';
import {
  applyPartyEnvelope,
  buildSecondScreenJoinUrl,
  createCouchPartyRoomState,
  DEFAULT_FAMILY_ROSTER,
} from '../lib/party/couch-party-sync.ts';
import {
  FIRE_TV_CONTENT_ROW,
  parseVegaDeepLink,
  parseVoiceDirective,
} from '../lib/vega/vega-content-launcher.ts';
import {
  ContentLauncherStatusType,
  createKeplerContentLauncherHandler,
  detectVegaRuntimeCapabilities,
  handleVegaLauncherPayload,
  mapKeplerHWEventToRemoteAction,
} from '../lib/vega/kepler-runtime-adapter.ts';
import {
  AMAZON_DEVELOPER_FRICTION_LOG,
  synthesizeBedrockFamilyTriviaPack,
} from '../lib/vega/bedrock-pack-generator.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

async function runVerificationSuite(): Promise<void> {
  const startTime = performance.now();
  let passedGates = 0;

  console.log('================================================================');
  console.log('🔥 HEARTHCAST TV — 10-FOOT FIRE TV & VEGA OS VERIFICATION SUITE');
  console.log('================================================================');

  // ---------------------------------------------------------------------------
  // GATE 1: 10-Foot Fire TV Spatial Focus Engine, 5% Overscan & Focus Memory
  // ---------------------------------------------------------------------------
  {
    const nodes: FocusNode[] = [
      { id: 'nav-0', row: 0, col: 0, section: 'nav', label: 'Home', minHeightPx: 52 },
      { id: 'nav-1', row: 0, col: 1, section: 'nav', label: 'Trivia', minHeightPx: 52 },
      { id: 'tile-0', row: 1, col: 0, section: 'row', label: 'Cosmic', minHeightPx: 140 },
      { id: 'tile-1', row: 1, col: 1, section: 'row', label: 'Lantern', minHeightPx: 140 },
      { id: 'tile-2', row: 1, col: 2, section: 'row', label: 'Ocean', minHeightPx: 140 },
    ];

    let state = createSpatialFocusState('HOME', nodes, 'nav-0');
    assert.equal(state.activeNodeId, 'nav-0');

    // Move RIGHT across row 0
    state = moveSpatialFocus(state, 'RIGHT');
    assert.equal(state.activeNodeId, 'nav-1');

    // Clamp at right edge of row 0
    state = moveSpatialFocus(state, 'RIGHT');
    assert.equal(state.activeNodeId, 'nav-1');

    // Move DOWN to nearest column in row 1 (col 1 -> tile-1)
    state = moveSpatialFocus(state, 'DOWN');
    assert.equal(state.activeNodeId, 'tile-1');

    // Move RIGHT to tile-2, then UP to row 0 (nearest col is nav-1 at col 1)
    state = moveSpatialFocus(state, 'RIGHT');
    assert.equal(state.activeNodeId, 'tile-2');
    state = moveSpatialFocus(state, 'UP');
    assert.equal(state.activeNodeId, 'nav-1');

    // TVFocusGuideView Row Focus Memory: restoring row 1 remembers tile-2
    const restoredRow1 = restoreRowFocusMemory(state, 1);
    assert.equal(restoredRow1.activeNodeId, 'tile-2');

    // Orphaned focus recovery when active node is unmounted
    const reducedNodes = nodes.filter((n) => n.id !== 'nav-1');
    const recovered = ensureValidFocus({ ...state, nodes: reducedNodes }, 'tile-0');
    assert.equal(recovered.activeNodeId, 'tile-0');

    // Remote key mapping & 10-foot ergonomics + 5% Overscan Safe Area audit
    assert.equal(mapKeyToRemoteAction('ArrowDown'), 'DOWN');
    assert.equal(mapKeyToRemoteAction('Enter'), 'SELECT');
    assert.equal(mapKeyToRemoteAction('Escape'), 'BACK');
    assert.equal(mapKeyToRemoteAction('MediaPlayPause'), 'PLAY_PAUSE');

    const audit = auditTenFootErgonomics(nodes, 9.4);
    assert.equal(audit.valid, true);
    assert.equal(audit.minHeightCompliant, true);
    assert.equal(audit.contrastCompliant, true);

    const overscan = auditOverscanSafeArea(1920, 1080, 96, 54);
    assert.equal(overscan.safeZoneCompliant, true);
    assert.equal(overscan.dpGridWidth, 960);
    assert.equal(overscan.dpGridHeight, 540);
    assert.equal(overscan.requiredHorizontalInsetPx, 96);
    assert.equal(overscan.requiredVerticalInsetPx, 54);

    passedGates++;
    console.log('  ✅ Gate 1 Passed: 10-Foot Spatial Focus, 5% Overscan & Focus Memory');
  }

  // ---------------------------------------------------------------------------
  // GATE 2: Multi-Player Family Trivia Blitz Speed Bonus & Streak Engine
  // ---------------------------------------------------------------------------
  {
    const fastScore = calculateTriviaAnswerScore({
      isCorrect: true,
      elapsedMs: 3000,
      timeLimitMs: 15000,
      previousStreak: 0,
    });
    assert.equal(fastScore.basePoints, 1000);
    assert.equal(fastScore.speedBonus, 400);
    assert.equal(fastScore.streakBonus, 0);
    assert.equal(fastScore.pointsEarned, 1400);
    assert.equal(fastScore.nextStreak, 1);

    let round = createTriviaRoundState('cosmic-explorers', DEFAULT_FAMILY_ROSTER);
    assert.equal(round.phase, 'QUESTION');
    assert.equal(round.questionIndex, 0);

    // Maya answers correctly at 3.0s; duplicate button mash at 4.0s is ignored
    round = submitPlayerAnswer(round, {
      playerId: 'player-maya',
      playerName: 'Maya',
      optionIndex: 1,
      elapsedMs: 3000,
    });
    round = submitPlayerAnswer(round, {
      playerId: 'player-maya',
      playerName: 'Maya',
      optionIndex: 0,
      elapsedMs: 4000,
    });
    assert.equal(round.submissions['player-maya'].optionIndex, 1);

    // Leo answers incorrectly
    round = submitPlayerAnswer(round, {
      playerId: 'player-leo',
      playerName: 'Leo',
      optionIndex: 0,
      elapsedMs: 2000,
    });

    round = revealTriviaQuestion(round);
    assert.equal(round.phase, 'REVEAL');
    assert.equal(round.scoreboard['player-maya'].score, 1400);
    assert.equal(round.scoreboard['player-maya'].streak, 1);
    assert.equal(round.scoreboard['player-leo'].score, 0);
    assert.equal(round.scoreboard['player-leo'].streak, 0);

    const board = getSortedLeaderboard(round);
    assert.equal(board[0].playerId, 'player-maya');

    round = advanceTriviaQuestion(round);
    assert.equal(round.phase, 'QUESTION');
    assert.equal(round.questionIndex, 1);

    passedGates++;
    console.log('  ✅ Gate 2 Passed: Family Trivia Blitz Scoring, Speed Bonus & Streak Engine');
  }

  // ---------------------------------------------------------------------------
  // GATE 3: Interactive Branching Bedtime Story Theater & Fair Tiebreaker
  // ---------------------------------------------------------------------------
  {
    let story = createStoryTheaterState('lantern-whispering-pines');
    const scene1 = getCurrentStoryScene(story);
    assert.equal(scene1.id, 'scene-1');
    assert.equal(scene1.choices.length, 2);

    // Cast a 2 vs 2 tie vote on Scene 1:
    // Maya (timestamp 100) + Mom (timestamp 120) vote Choice 0 (bridge)
    // Leo (timestamp 110) + Dad (timestamp 130) vote Choice 1 (oak)
    story = castStoryBranchVote(story, {
      playerId: 'player-maya',
      playerName: 'Maya',
      choiceId: 'choice-bridge',
      submittedAtMs: 100,
    });
    story = castStoryBranchVote(story, {
      playerId: 'player-mom',
      playerName: 'Mom',
      choiceId: 'choice-bridge',
      submittedAtMs: 120,
    });
    story = castStoryBranchVote(story, {
      playerId: 'player-leo',
      playerName: 'Leo',
      choiceId: 'choice-oak',
      submittedAtMs: 110,
    });
    story = castStoryBranchVote(story, {
      playerId: 'player-dad',
      playerName: 'Dad',
      choiceId: 'choice-oak',
      submittedAtMs: 130,
    });

    // Both sides have 0 prior tiebreak wins -> Maya's side wins Scene 1 tie due to earliest vote (100ms)
    const res1 = resolveStoryBranchSelection(story);
    assert.equal(res1.wasTie, true);
    assert.equal(res1.winningChoice?.id, 'choice-bridge');
    story = res1.nextState;
    assert.equal(story.currentNodeId, 'scene-2a');
    assert.equal(story.tiebreakWinsByPlayer['player-maya'], 1);

    // Now on Scene 2a, Maya (1 prior tiebreak win) votes alone for choice-raft (even earlier at 200ms)
    // while Leo (0 prior tiebreak wins!) votes alone for choice-chime at 250ms (1 vs 1 tie).
    // Fair Underdog Turn-Taking Rule guarantees Leo wins this tiebreaker!
    story = castStoryBranchVote(story, {
      playerId: 'player-maya',
      playerName: 'Maya',
      choiceId: 'choice-raft',
      submittedAtMs: 200,
    });
    story = castStoryBranchVote(story, {
      playerId: 'player-leo',
      playerName: 'Leo',
      choiceId: 'choice-chime',
      submittedAtMs: 250,
    });

    const res2 = resolveStoryBranchSelection(story);
    assert.equal(res2.wasTie, true);
    assert.equal(res2.winningChoice?.id, 'choice-chime');
    assert.equal(res2.nextState.currentNodeId, 'scene-3-lantern-keep');
    assert.equal(getCurrentStoryScene(res2.nextState).isEnding, true);

    passedGates++;
    console.log('  ✅ Gate 3 Passed: Branching Story Theater & Fair Underdog Tiebreaker');
  }

  // ---------------------------------------------------------------------------
  // GATE 4: Second-Screen QR Couch Party Sync Bus & Monotonic Deduplication
  // ---------------------------------------------------------------------------
  {
    let room = createCouchPartyRoomState('fire-4', true);
    assert.equal(room.roomCode, 'FIRE-4');

    const joinUrl = buildSecondScreenJoinUrl('http://127.0.0.1:5180/', room.roomCode);
    assert.equal(joinUrl, 'http://127.0.0.1:5180/?role=controller&room=FIRE-4');

    // Valid seq 1 from Maya
    const env1 = {
      msgId: 'msg-1',
      roomCode: 'FIRE-4',
      senderId: 'player-maya',
      seq: 1,
      timestampMs: 2000,
      payload: {
        type: 'TRIVIA_SUBMIT' as const,
        playerId: 'player-maya',
        playerName: 'Maya',
        optionIndex: 1 as const,
        elapsedMs: 2500,
      },
    };
    const step1 = applyPartyEnvelope(room, env1);
    assert.equal(step1.accepted, true);
    room = step1.state;

    // Duplicate msgId rejected
    const dupStep = applyPartyEnvelope(room, env1);
    assert.equal(dupStep.accepted, false);
    assert.equal(dupStep.reason, 'DUPLICATE_MSG_ID');

    // Stale sequence rejected
    const staleStep = applyPartyEnvelope(room, {
      ...env1,
      msgId: 'msg-2',
      seq: 1,
    });
    assert.equal(staleStep.accepted, false);
    assert.equal(staleStep.reason, 'STALE_SEQ');

    // Wrong room rejected
    const wrongRoomStep = applyPartyEnvelope(room, {
      ...env1,
      msgId: 'msg-3',
      roomCode: 'OTHER-9',
      seq: 2,
    });
    assert.equal(wrongRoomStep.accepted, false);
    assert.equal(wrongRoomStep.reason, 'ROOM_MISMATCH');

    // Disconnect and reconnect preserves original seatIndex (seatIndex 1 for Leo)
    const originalSeat = room.players['player-leo'].seatIndex;
    const disc = applyPartyEnvelope(room, {
      msgId: 'msg-leo-disc',
      roomCode: 'FIRE-4',
      senderId: 'player-leo',
      seq: 1,
      timestampMs: 3000,
      payload: { type: 'PLAYER_DISCONNECT', playerId: 'player-leo' },
    });
    assert.equal(disc.state.players['player-leo'].connected, false);

    const reconn = applyPartyEnvelope(disc.state, {
      msgId: 'msg-leo-join',
      roomCode: 'FIRE-4',
      senderId: 'player-leo',
      seq: 2,
      timestampMs: 4000,
      payload: {
        type: 'PLAYER_JOIN',
        playerId: 'player-leo',
        playerName: 'Leo',
        avatarEmoji: '🦖',
      },
    });
    assert.equal(reconn.state.players['player-leo'].connected, true);
    assert.equal(reconn.state.players['player-leo'].seatIndex, originalSeat);

    passedGates++;
    console.log('  ✅ Gate 4 Passed: Second-Screen QR Sync Bus, Seq Dedup & Seat Preservation');
  }

  // ---------------------------------------------------------------------------
  // GATE 5: Vega OS Content Launcher (`IContentLauncherHandler`), Voice & Bedrock
  // ---------------------------------------------------------------------------
  {
    assert.ok(FIRE_TV_CONTENT_ROW.length >= 5);

    const dlTrivia = parseVegaDeepLink(
      'hearthcast://launch?mode=trivia&pack=ocean-and-wildlife'
    );
    assert.equal(dlTrivia.mode, 'TRIVIA');
    assert.equal(dlTrivia.contentId, 'ocean-and-wildlife');
    assert.equal(dlTrivia.role, 'tv');

    const dlController = parseVegaDeepLink('?role=controller&room=cozy-8&mode=story');
    assert.equal(dlController.role, 'controller');
    assert.equal(dlController.roomCode, 'COZY-8');
    assert.equal(dlController.mode, 'STORY');

    // Voice Directive Parsing
    const v1 = parseVoiceDirective('Alexa, select option B');
    assert.equal(v1.type, 'SELECT_OPTION');
    if (v1.type === 'SELECT_OPTION') {
      assert.equal(v1.optionIndex, 1);
    }

    const v2 = parseVoiceDirective('Launch Cosmic Explorers');
    assert.equal(v2.type, 'LAUNCH_MODE');
    if (v2.type === 'LAUNCH_MODE') {
      assert.equal(v2.mode, 'TRIVIA');
      assert.equal(v2.targetId, 'cosmic-explorers');
    }

    const v3 = parseVoiceDirective('Take the first path');
    assert.equal(v3.type, 'STORY_CHOICE');
    if (v3.type === 'STORY_CHOICE') {
      assert.equal(v3.choiceIndex, 0);
    }

    // Kepler Hardware Adapter keyDown vs keyUp filtering
    assert.equal(
      mapKeplerHWEventToRemoteAction({ eventType: 'down', eventKeyAction: 0 }),
      'DOWN'
    );
    assert.equal(
      mapKeplerHWEventToRemoteAction({ eventType: 'down', eventKeyAction: 1 }),
      null
    );

    const caps = detectVegaRuntimeCapabilities();
    assert.equal(caps.packageId, 'com.hearthcast.tv.familynight');
    assert.equal(caps.osVersionTarget, '1.2');
    assert.equal(caps.contentLauncherInterface, 'com.amazon.kepler.media.IContentLauncherServer');
    assert.equal(caps.contentLauncherModuleId, '/com.amazon.kepler.media@IContentLauncher1');

    // Official @amazon-devices/kepler-media-content-launcher IContentLauncherHandler
    const handler = createKeplerContentLauncherHandler();
    const launchRes = await handler.handleLaunchContent(
      { parameterList: [{ paramType: 'ENTITY', value: 'Cosmic Explorers' }] },
      true,
      { pageContext: 'UNIVERSAL_SEARCH' }
    );
    assert.equal(launchRes.contentLauncherStatus, ContentLauncherStatusType.SUCCESS);
    assert.equal(launchRes.resolvedTarget?.mode, 'TRIVIA');
    assert.equal(launchRes.resolvedTarget?.contentId, 'cosmic-explorers');

    const emptyRes = await handler.handleLaunchContent({ parameterList: [] }, false, {});
    assert.equal(emptyRes.contentLauncherStatus, ContentLauncherStatusType.URL_NOT_AVAILABLE);

    // AWS Builder Mini Challenge (Amazon Nova Pro Converse Schema) + Friction Log
    const bedrockOut = synthesizeBedrockFamilyTriviaPack('Solar System Rovers');
    assert.equal(bedrockOut.converseSpec.modelId, 'us.amazon.nova-pro-v1:0');
    assert.equal(bedrockOut.generatedPack.questions.length, 3);
    assert.ok(AMAZON_DEVELOPER_FRICTION_LOG.length >= 5);

    const bundle = handleVegaLauncherPayload({
      uri: 'hearthcast://launch?mode=story&book=starship-cozy-comet',
      voiceUtterance: 'Next question',
    });
    assert.equal(bundle.deepLink?.mode, 'STORY');
    assert.equal(bundle.voiceDirective?.type, 'REMOTE_ACTION');

    passedGates++;
    console.log('  ✅ Gate 5 Passed: IContentLauncherHandler, Kepler Adapter & AWS Bedrock Nova Pro');
  }

  // ---------------------------------------------------------------------------
  // GATE 6: Vega OS SDK 0.24+ Manifest, Friction Log, Port 5180 & Zero-CDN Audit
  // ---------------------------------------------------------------------------
  {
    const manifestPath = path.join(PROJECT_ROOT, 'manifest.toml');
    const frictionLogPath = path.join(PROJECT_ROOT, 'devpost/FRICTION_LOG.md');
    const viteConfigPath = path.join(PROJECT_ROOT, 'vite.config.ts');
    const indexHtmlPath = path.join(PROJECT_ROOT, 'index.html');

    const manifestText = fs.readFileSync(manifestPath, 'utf8');
    assert.ok(manifestText.includes('id = "com.hearthcast.tv.familynight"'));
    assert.ok(manifestText.includes('[os.version]'));
    assert.ok(manifestText.includes('target = "1.2"'));
    assert.ok(manifestText.includes('com.amazon.kepler.media.IContentLauncherServer'));
    assert.ok(manifestText.includes('/com.amazon.kepler.media@IContentLauncher1'));

    assert.ok(fs.existsSync(frictionLogPath), 'devpost/FRICTION_LOG.md must exist for +10% bonus');

    const viteText = fs.readFileSync(viteConfigPath, 'utf8');
    assert.ok(viteText.includes("host: '127.0.0.1'"));
    assert.ok(viteText.includes('port: 5180'));
    assert.ok(viteText.includes('strictPort: true'));

    const htmlText = fs.readFileSync(indexHtmlPath, 'utf8');
    assert.ok(!htmlText.includes('https://cdn.'), 'Zero external CDN links in index.html');

    passedGates++;
    console.log('  ✅ Gate 6 Passed: Vega SDK 0.24+ manifest.toml, Friction Log & Port 5180 Audit');
  }

  const elapsedMs = (performance.now() - startTime).toFixed(2);
  console.log('================================================================');
  console.log(`🏆 ALL ${passedGates} / 6 HEARTHCAST TV VERIFICATION GATES PASSED IN ${elapsedMs}ms`);
  console.log('================================================================');
}

runVerificationSuite();

