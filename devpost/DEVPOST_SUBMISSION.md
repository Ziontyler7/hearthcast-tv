# 🔥📺 Build, Ship, Shape: Amazon Developer Hackathon — Complete Devpost Submission Package

**Project Title:** HearthCast TV — Interactive 10-Foot Family Trivia & Story Night for Fire TV & Vega OS  
**Tagline (<= 60 chars):** 10-foot Fire TV & Vega OS family trivia and story theater.  
**Track:** Amazon Fire TV & Vega OS (`com.hearthcast.tv.familynight`) + AWS Builder Mini Challenge (`us.amazon.nova-pro-v1:0`) + Developer Friction Log (`+10% Bonus`)  
**Local Studio Port:** `http://127.0.0.1:5180` (`strictPort: true`)

---

## 1. Inspiration

Living-room televisions are the centerpiece of family gathering, yet 95% of TV applications are built for passive solo binge-watching. When families want an interactive 15-minute activity before bedtime—such as a multi-generational trivia round or a choose-your-own-adventure bedtime story—existing console games require expensive controllers, complex accounts, or tiny text unreadable from 10 feet away. We built **HearthCast TV** natively for **Amazon Fire TV and Vega OS** so any family can play together using just their Fire TV D-Pad remote, Alexa Voice commands, or instant QR second-screen phones.

---

## 2. What It Does

1. **True 10-Foot Fire TV D-Pad Spatial Navigation (`SpatialFocusEngine`)**:
   - Engineered for the Fire TV Remote (`UP`, `DOWN`, `LEFT`, `RIGHT`, `SELECT`, `BACK`, `PLAY_PAUSE`) with WCAG AAA `9.4:1` amber focus halos, `>= 52px` target heights, `5%` Overscan Safe Area (`96×54px` margins on `1920×1080`), `TVFocusGuideView` row focus memory, and automatic orphaned-focus recovery.
2. **Multi-Generational Couch Party Trivia Blitz (`TriviaBlitzEngine`)**:
   - Curated family question packs with real-time speed bonuses (`+500 pts` max), family streak multipliers (`+150 pts/streak`), idempotent first-answer lock-in, and post-question *"Living-Room Fun Facts"*.
3. **Interactive Branching Bedtime Story Theater & Fair "Underdog" Tiebreaker (`StoryTheaterEngine`)**:
   - Illustrated read-aloud adventures with Web Speech narration and our deterministic **Fair Family Turn-Taking ("Underdog") Tiebreaker**: when a 4-player family couch vote ties `2 vs 2`, the tiebreaker automatically rotates to the sibling who hasn't won a tiebreak most recently.
4. **Amazon Vega OS SDK `0.24+` `manifest.toml` & `IContentLauncherHandler`**:
   - Ships with a complete Vega OS `manifest.toml` (`[os.version] target = "1.2"`, `com.amazon.kepler.media.IContentLauncherServer`, `/com.amazon.kepler.media@IContentLauncher1`), `@amazon-devices/kepler-media-content-launcher` `IContentLauncherHandler.handleLaunchContent`, `hearthcast://launch` deep-link routing, and Alexa Voice Remote directive parsing.
5. **AWS Builder Mini Challenge (`us.amazon.nova-pro-v1:0`) & `+10% Bonus` Friction Log**:
   - Synthesizes custom family trivia packs via the Amazon Bedrock Converse API schema (`us.amazon.nova-pro-v1:0`) with instant offline fallback, and includes a detailed 5-entry [`devpost/FRICTION_LOG.md`](FRICTION_LOG.md).

---

## 3. How We Built It

- **Pure Deterministic TypeScript Core (`src/lib/`)**: All 6 subsystems (`SpatialFocusEngine`, `TriviaBlitzEngine`, `StoryTheaterEngine`, `CouchPartySyncBus`, `VegaContentLauncher`/`KeplerRuntimeAdapter`, and `BedrockPackGenerator`) are pure TypeScript modules verified by **6/6 automated verification gates (`npm test`)**.
- **Single-Screen Judge Simulator Drawer**: Allows judges testing on a single laptop browser (`http://127.0.0.1:5180`) to simulate 4 family phone controllers, D-Pad remote keys, Alexa voice utterances, and Vega OS `IContentLauncherHandler` payloads in 1 click.

---

## 4. Challenges We Ran Into & Accomplishments

- **Key-Up Echoes on Vega OS (`VEGA-FL-03`)**: `useTVEventHandler` emits both `eventKeyAction = 0` (down) and `1` (up). Filtering strictly for `eventKeyAction === 0` in `mapKeplerHWEventToRemoteAction()` eliminated double-navigation skips.
- **Orphaned Focus Recovery (`VEGA-FL-04`)**: When a trivia timer expires and unmounts the answer grid while D-Pad focus sits on an option card, our `SpatialFocusEngine` automatically recovers focus to the next primary action button in `0ms`.

---

## 5. "Built With" Tags

`amazon-fire-tv`, `vega-os`, `react-native-kepler`, `amazon-bedrock`, `amazon-nova-pro`, `alexa-voice`, `typescript`, `react`, `vite`, `spatial-navigation`

---

## 6. 90-Second Demo Video Narration Script

- **`0:00 – 0:20` · 10-Foot Fire TV Home Row & Vega OS Content Launcher**:
  - *Visual*: Open `http://127.0.0.1:5180`. Navigate the 10-foot Fire TV Home Row using keyboard Arrow keys (`#FF9900` WCAG AAA focus halo inside the 5% overscan safe frame) and trigger the Alexa Voice Directive `"Launch Cosmic Explorers"`.
- **`0:20 – 0:50` · 4-Player Couch Trivia Blitz & Underdog Story Tiebreaker**:
  - *Visual*: Submit answers across the 4 simulated family phone controllers in the Judge Drawer, showing speed bonuses and streak multipliers. Switch to **Bedtime Story Theater**, cast a `2 vs 2` tied vote, and demonstrate the **Fair Underdog Tiebreaker** badge.
- **`0:50 – 1:30` · Vega OS `manifest.toml`, AWS Nova Pro Generator & Friction Log**:
  - *Visual*: Open the **Vega OS & AWS Bedrock Inspector** modal to showcase the SDK `0.24+` `manifest.toml`, `IContentLauncherHandler` response, `us.amazon.nova-pro-v1:0` Converse schema, and the 5-point Developer Friction Log (`+10% Bonus`).
