# 🏗️ System Architecture — HearthCast TV (Fire TV & Vega OS)

## 1. High-Level Architecture Diagram

```mermaid
flowchart TD
  subgraph Inputs["Living-Room Input Surfaces"]
    Remote["🎮 Fire TV D-Pad Remote\n(Up/Down/Left/Right/Select/Back)"]
    Voice["🎙️ Alexa / Fire TV Voice Remote\n('Launch Cosmic Explorers', 'Select B')"]
    Phones["📱 Second-Screen Phones (?role=controller)\nBroadcastChannel + Storage Sync"]
    Launcher["📺 Vega Content Launcher\n(hearthcast://launch?mode=trivia)"]
  end

  subgraph Core["Pure Deterministic Core Engines (Zero DOM Coupling)"]
    Focus["SpatialFocusEngine\n(2D Matrix + Orphan Recovery)"]
    Party["CouchPartySyncBus\n(Monotonic seq + Seat Preservation)"]
    Trivia["TriviaBlitzEngine\n(Speed Bonus + Streak Math)"]
    Story["StoryTheaterEngine\n(Branch Graph + Underdog Tiebreaker)"]
    Vega["VegaContentLauncher & KeplerAdapter\n(URI Router + HW Key Filter)"]
  end

  subgraph UI["10-Foot Living-Room Stage (Port 5180)"]
    HomeRow["🏠 Fire TV Content Launcher Row"]
    TriviaStage["⚡ 4-Player Trivia Blitz Stage"]
    StoryStage["🏮 Branching Bedtime Story Theater"]
    JudgeDrawer["📱 On-Screen Judge Phone Simulator"]
  end

  Remote --> Vega --> Focus
  Voice --> Vega --> Trivia & Story
  Launcher --> Vega --> HomeRow
  Phones --> Party --> Trivia & Story
  Focus --> HomeRow & TriviaStage & StoryStage
  Trivia --> TriviaStage
  Story --> StoryStage
  JudgeDrawer --> Party
```

---

## 2. Key Engineering Invariants

1. **Zero Orphaned Focus States (`ensureValidFocus`)**:
   - Whenever the user switches between the Fire TV Home Row, Trivia Blitz, or Bedtime Story Theater—or when a story reaches an ending screen with `0` branch choices—`ensureValidFocus` verifies that `activeNodeId` exists in the mounted node set and deterministically snaps to the screen's primary action if the prior node unmounted.
2. **Monotonic Sequence Deduplication (`applyPartyEnvelope`)**:
   - Second-screen events arrive with `(senderId, seq, msgId)`. Duplicate `msgId`s and stale sequence numbers (`seq <= lastSeqBySender[senderId]`) are rejected at the bus boundary.
   - If a player's phone sleeps and reconnects mid-round (`PLAYER_DISCONNECT` $\to$ `PLAYER_JOIN`), their original `seatIndex` and trivia scoreboard record are preserved intact.
3. **Fair Family Underdog Tiebreaker (`resolveStoryBranchSelection`)**:
   - When a couch story vote ties (e.g., `2 vs 2`), each tied choice is scored by the minimum `tiebreakWinsByPlayer` among its voters, ensuring younger siblings rotate tiebreak victories fairly.
