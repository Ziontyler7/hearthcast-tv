# ✅ Amazon Developer Hackathon ("Build, Ship, Shape" — $138,000) Submission Checklist

**Deadline:** October 23, 2026  
**Project:** HearthCast TV (`com.hearthcast.tv.familynight`)  
**Repository:** `hearthcast-tv`

---

## 1. Automated Verification Gates (`6 / 6 Passing`)

- [x] **Gate 1 (`SpatialFocusEngine`)**: 2D directional D-Pad focus, row clamping, nearest-column vertical selection, `TVFocusGuideView` row focus memory, orphaned-focus recovery, 5% Overscan Safe Area (`96×54px`), and WCAG AAA `9.4:1` contrast compliance.
- [x] **Gate 2 (`TriviaBlitzEngine`)**: Speed-bonus interpolation (`1000` base + `0..500` speed + `150` streak), idempotent first-answer lock-in, and podium leaderboard sorting.
- [x] **Gate 3 (`StoryTheaterEngine`)**: Branching story scene graph, majority voting, and deterministic Fair Underdog Turn-Taking Tiebreaker.
- [x] **Gate 4 (`CouchPartySyncBus`)**: 4-character Room Code (`FIRE-4`), monotonic `seq` deduplication, room isolation, and mid-round disconnect/reconnect seat preservation.
- [x] **Gate 5 (`VegaContentLauncher`, `KeplerAdapter` & `BedrockPackGenerator`)**: Official `@amazon-devices/kepler-media-content-launcher` (`IContentLauncherHandler.handleLaunchContent`), `hearthcast://launch` deep-link URI router, Kepler `eventKeyAction` key-up filtering, Alexa Voice Remote directives, and AWS Builder Mini Challenge (`us.amazon.nova-pro-v1:0`) Converse schema.
- [x] **Gate 6 (`Vega SDK 0.24+ Manifest, Friction Log & Bundle Audit`)**: Valid Vega OS `manifest.toml` (`[os.version] 1.2`, `IContentLauncherServer`, `/com.amazon.kepler.media@IContentLauncher1`), `+10% Bonus` [`devpost/FRICTION_LOG.md`](FRICTION_LOG.md), strict port isolation (`127.0.0.1:5180`), and zero external CDN dependencies.


---

## 2. 90-Second Judge Demo Video Flow

1. **0:00 – 0:20 · The 10-Foot Fire TV Home Row & Content Launcher**:
   - Show the 10-foot Fire TV Home Row on `http://127.0.0.1:5180` with the high-contrast `#FF9900` D-Pad focus halo moving smoothly across *Cosmic Explorers*, *The Lantern of Whispering Pines*, and *Ocean Wonders*.
   - Trigger the Alexa Voice Directive `"Launch Cosmic Explorers"`.
2. **0:20 – 0:50 · 4-Player Couch Party Trivia Blitz**:
   - Open the On-Screen Couch Phone Simulator (or second browser tab at `?role=controller&room=FIRE-4`).
   - Click **`⚡ Simulate All 4 Family Buzzer Answers`**, then **`🏆 Reveal Correct Answer & Scores`** to show the speed-bonus math, family streak badges, and Living-Room Fun Fact.
3. **0:50 – 1:30 · Interactive Branching Bedtime Story Theater & Underdog Tiebreaker**:
   - Switch to **🏮 Bedtime Story Theater** (*The Lantern of Whispering Pines*).
   - Click **`🔊 Read Story Aloud`**, then click **`🎲 Simulate 2-vs-2 Family Tie Vote`** and **`✨ Lock In Family Vote & Turn Page`** to demonstrate the Fair Family Turn-Taking Tiebreaker resolving the tie and advancing to Chapter 2.
