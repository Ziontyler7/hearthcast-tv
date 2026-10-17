# 🔥📺 HearthCast TV — Interactive 10-Foot Family Trivia & Story Night for Fire TV & Vega OS

**Competition:** *Build, Ship, Shape: An Amazon Developer Hackathon (`$138,000`)*  
**Target Platforms:** Amazon Fire TV (10-Foot Web / Silk) & Amazon Vega OS (`@amazon-devices/react-native-kepler` · `manifest.toml`)  
**Studio:** HearthCast Studio  
**Local Dev Port:** `http://127.0.0.1:5180` (`strictPort: true`)

---

## 🌟 What Is HearthCast TV?

Most living-room streaming screens are passive: families scroll for 20 minutes and watch in silence. **HearthCast TV** transforms the living-room television into an interactive 10-foot family game and bedtime story hearth built specifically for **Amazon Fire TV and Vega OS**:

1. **⚡ Multi-Generational Couch Party Trivia Blitz (`TriviaBlitzEngine`)**:
   - Curated family question packs (*Cosmic Explorers & Starlight Science*, *Ocean Wonders & Wild Kingdom*, *Family Movie Night & Everyday Inventions*).
   - Real-time speed bonuses (`+500 pts` max), family streak multipliers (`+150 pts/streak`), idempotent first-answer lock-in, and post-question *"Living-Room Fun Facts"* that spark conversation across kids, parents, and grandparents.
2. **🏮 Interactive Branching Bedtime Story Theater (`StoryTheaterEngine`)**:
   - Cozy illustrated read-aloud adventures (*The Lantern of Whispering Pines*, *Starship Cozy & The Clockwork Comet*) with Web Speech synthesis narration and ambient soundscape cues.
   - Features our **Fair Family Turn-Taking ("Underdog") Tiebreaker**: when a 4-player family couch vote ties `2 vs 2`, the tiebreaker automatically rotates to the sibling who hasn't won a tiebreak yet—ending bedtime arguments forever.
3. **🎮 True 10-Foot Fire TV D-Pad Spatial Navigation (`SpatialFocusEngine`)**:
   - Engineered for the Fire TV Remote (`UP`, `DOWN`, `LEFT`, `RIGHT`, `SELECT`, `BACK`, `PLAY_PAUSE`) with WCAG AAA `9.4:1` amber focus halos, `>= 52px` target heights, and automatic orphaned-focus recovery when modals or scenes transition.
4. **📱 Instant Second-Screen QR Couch Party Join + Single-Screen Judge Simulator (`CouchPartySyncBus`)**:
   - Up to 6 family members can join via `?role=controller&room=FIRE-4` on their phones or a second browser tab, OR judges testing on a single laptop screen can use the built-in **On-Screen Couch Phone & Fire TV Remote Simulator Drawer**.
5. **🎙️ Amazon Vega OS Content Launcher & Alexa Voice Directive Parity**:
   - Includes a complete Vega OS `manifest.toml` (`com.amazon.kepler.media.content_launcher.1`, `com.amazon.input.key_events.1`, `com.amazon.voice.directive_handler.1`), deep-link URI router (`hearthcast://launch?mode=trivia&pack=cosmic-explorers`), and voice directive parser (`"Launch Cosmic Explorers"`, `"Select Option B"`, `"Take the first path"`, `"Next"`).

---

## 📂 Repository Structure

- [`manifest.toml`](file:///Users/zion/Desktop/hearthcast-tv/manifest.toml) — Amazon Vega OS SDK `0.24+` (`[os.version] 1.2`) application manifest, `IContentLauncherServer` extras & `/com.amazon.kepler.media@IContentLauncher1` module needs
- [`src/lib/tv/spatial-focus-engine.ts`](file:///Users/zion/Desktop/hearthcast-tv/src/lib/tv/spatial-focus-engine.ts) — 2D D-Pad spatial focus matrix, `TVFocusGuideView` row focus memory, orphaned-focus recovery, 5% Overscan (`96×54px`) & WCAG AAA ergonomics audit
- [`src/lib/trivia/trivia-blitz-engine.ts`](file:///Users/zion/Desktop/hearthcast-tv/src/lib/trivia/trivia-blitz-engine.ts) — Multi-player trivia scoring, speed-bonus interpolation & streak engine
- [`src/lib/story/story-theater-engine.ts`](file:///Users/zion/Desktop/hearthcast-tv/src/lib/story/story-theater-engine.ts) — Branching bedtime story graph & Fair Underdog Turn-Taking Tiebreaker
- [`src/lib/party/couch-party-sync.ts`](file:///Users/zion/Desktop/hearthcast-tv/src/lib/party/couch-party-sync.ts) — Second-Screen QR room state, monotonic `seq` deduplication & seat preservation
- [`src/lib/vega/vega-content-launcher.ts`](file:///Users/zion/Desktop/hearthcast-tv/src/lib/vega/vega-content-launcher.ts) — Vega OS `hearthcast://` deep-link router, Fire TV Home Row catalog & Alexa voice parser
- [`src/lib/vega/kepler-runtime-adapter.ts`](file:///Users/zion/Desktop/hearthcast-tv/src/lib/vega/kepler-runtime-adapter.ts) — `@amazon-devices/kepler-media-content-launcher` (`IContentLauncherHandler.handleLaunchContent`) & `@amazon-devices/react-native-kepler` hardware event bridge
- [`src/lib/vega/bedrock-pack-generator.ts`](file:///Users/zion/Desktop/hearthcast-tv/src/lib/vega/bedrock-pack-generator.ts) — AWS Builder Mini Challenge (`us.amazon.nova-pro-v1:0` Bedrock Converse Schema) & 5-Point Developer Friction Log Registry
- [`src/test/hearthcast-verification.test.ts`](file:///Users/zion/Desktop/hearthcast-tv/src/test/hearthcast-verification.test.ts) — 6-gate deterministic verification suite (`npm test`)
- [`devpost/FRICTION_LOG.md`](file:///Users/zion/Desktop/hearthcast-tv/devpost/FRICTION_LOG.md) — Official Build, Ship, Shape Developer Friction Log (`+10% Judging Score Bonus`)
- [`devpost/PRD.md`](file:///Users/zion/Desktop/hearthcast-tv/devpost/PRD.md) — Product Requirements & Judging Alignment
- [`devpost/ARCHITECTURE.md`](file:///Users/zion/Desktop/hearthcast-tv/devpost/ARCHITECTURE.md) — System Architecture & Vega OS Integration Guide
- [`devpost/SUBMISSION_CHECKLIST.md`](file:///Users/zion/Desktop/hearthcast-tv/devpost/SUBMISSION_CHECKLIST.md) — Devpost Submission & Demo Video Script


---

## ⚡ Quick Start & Verification

```bash
# 1. Run the 6-gate deterministic verification suite
npm test

# 2. Run full TypeScript + production bundle build
npm run build

# 3. Launch the 10-Foot Fire TV & Vega OS studio on http://127.0.0.1:5180
npm run dev
```
