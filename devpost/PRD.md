# 📋 Product Requirements Document (PRD) — HearthCast TV

**Product Name:** HearthCast TV: Interactive 10-Foot Family Trivia & Story Night  
**Hackathon:** Build, Ship, Shape: An Amazon Developer Hackathon (`$138,000`)  
**Target Ecosystems:** Amazon Fire TV & Amazon Vega OS (`com.hearthcast.tv.familynight`)

---

## 1. Problem Statement

Living-room televisions are the centerpiece of family gathering, yet 95% of TV applications are built for passive solo binge-watching. When families want an interactive 15-minute activity before bedtime—such as a multi-generational trivia round or a choose-your-own-adventure bedtime story—existing console games require expensive controllers, complex accounts, or tiny text unreadable from 10 feet away.

## 2. Solution Overview

**HearthCast TV** turns any Amazon Fire TV or Vega OS device into an instant, zero-friction family game and story hearth:

- **1-Click Fire TV Remote Play:** Navigate every screen using only the standard Fire TV D-Pad (`Up`, `Down`, `Left`, `Right`, `Select`, `Back`, `Play/Pause`) or Alexa Voice commands.
- **Instant Second-Screen Couch Party Join:** Family members can scan the room code (`FIRE-4`) to turn any mobile browser into a pocket trivia buzzer and story-branch voter—with zero app store downloads required.
- **Fair Family Turn-Taking ("Underdog") Tiebreaker:** Solves sibling tie votes deterministically by tracking prior tiebreak wins per player and awarding ties to the family member who hasn't won a tiebreaker most recently.

## 3. Core Functional Pillars

| Pillar | Module | Key Capability |
| :--- | :--- | :--- |
| **10-Foot Spatial Focus** | `src/lib/tv/spatial-focus-engine.ts` | Deterministic 2D directional navigation, row clamping, automatic orphaned-focus recovery, WCAG AAA `9.4:1` focus contrast |
| **Family Trivia Blitz** | `src/lib/trivia/trivia-blitz-engine.ts` | Curated multi-age packs, speed bonus (`0–500 pts`), streak multiplier (`+150 pts`), first-answer lock-in, educational fun facts |
| **Bedtime Story Theater** | `src/lib/story/story-theater-engine.ts` | Branching read-aloud stories, Web Speech narration with clean lifecycle cancellation, Underdog Tiebreaker |
| **Second-Screen Sync** | `src/lib/party/couch-party-sync.ts` | 4-char Room Code, monotonic per-sender `seq` deduplication, mid-game disconnect/reconnect seat preservation |
| **Vega OS & Voice Integration** | `src/lib/vega/vega-content-launcher.ts` | `hearthcast://` Content Launcher deep-links, Fire TV Home Row tiles, Alexa voice directive parser |
