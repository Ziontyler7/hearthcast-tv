# 🛠️ Developer Friction Log — Build, Ship, Shape: Amazon Developer Hackathon (+10% Bonus)

**Project:** HearthCast TV (`com.hearthcast.tv.familynight`)  
**Track:** Fire TV (10-Foot Web / Silk & Amazon Vega OS / Kepler) + AWS Builder Mini Challenge  
**SDKs & Tools Evaluated:**
- Amazon Vega OS SDK `0.24+` (`manifest.toml` schema v1, `[os.version]` target `1.2`)
- `@amazon-devices/react-native-kepler` (`useTVEventHandler`, `TVFocusGuideView`, `useComponentInstance`)
- `@amazon-devices/kepler-media-content-launcher` (`ContentLauncherServerComponent`, `IContentLauncherHandler`, `ContentLauncherStatusType`)
- Fire TV 10-Foot UI Design Guidelines (`1920×1080` / `960×540 dp` `xhdpi`, 5% Overscan Safe Area, D-Pad Spatial Navigation)
- Amazon Bedrock Converse API (`us.amazon.nova-pro-v1:0` structured `toolConfig` output)

---

## Executive Summary for Amazon Devices Engineering

Building **HearthCast TV** across both the **10-Foot Fire TV Web/Silk runtime** and the **Amazon Vega OS (`@amazon-devices/react-native-kepler`)** architecture highlighted how clean the transition from Android-based `AndroidManifest.xml` to declarative TOML (`manifest.toml`) is once configured properly. Below are **5 concrete developer friction points** we encountered while building and testing, how we resolved them in code, and our actionable recommendations to make the Vega OS & Fire TV developer experience even smoother.

---

## Detailed Friction Entries

### 1. `VEGA-FL-01` · `manifest.toml` `[os.version]` Requirement in Vega SDK 0.24+
- **Component:** `manifest.toml` & `@amazon-devices/*` autolinking (`vega project install --fix`)
- **Severity:** `HIGH`
- **What Happened:** Early Kepler `v0.1` sample manifests only included `schema-version = 1` and `[package]`. Under Vega SDK `0.24+`, omitting `[os.version]` (`target = "1.2"`, `min = "1.2"`) causes package validation to fail or prevents `vega project install` from automatically injecting OS-provided module requirements (`[needs]` / `[wants]`) for `@amazon-devices/*` packages.
- **How We Solved It in HearthCast TV:** Added explicit `[os.version]` (`target = "1.2"`, `min = "1.2"`) and `[[needs.module]] id = "/com.amazon.kepler.media@IContentLauncher1"` to [`manifest.toml`](file:///Users/zion/Desktop/hearthcast-tv/manifest.toml) and added an automated assertion in Gate 6 of [`src/test/hearthcast-verification.test.ts`](file:///Users/zion/Desktop/hearthcast-tv/src/test/hearthcast-verification.test.ts).
- **Recommendation for Amazon Team:** Have `vega project build` and `vega project install` print a one-line self-healing hint (`Run: vega project update-manifest --os-min 1.2 --os-version 1.2`) whenever `[os.version]` is absent.

### 2. `VEGA-FL-02` · `@amazon-devices/kepler-media-content-launcher` Nested TOML `[[extras]]` Schema
- **Component:** `@amazon-devices/kepler-media-content-launcher` (`com.amazon.kepler.media.IContentLauncherServer`)
- **Severity:** `MEDIUM`
- **What Happened:** Registering a Content Launcher provider in `manifest.toml` requires two coupled TOML array-of-tables blocks (`[[extras]]` with `key = "interface.provider"` and `component-id`, followed by `[[extras.value.application.interface]]` with `interface_name = "com.amazon.kepler.media.IContentLauncherServer"` and inline table `static-values = { partner-id = "..." }`). If `component-id` in `[[extras]]` does not exactly match `[[components.interactive]] id`, Content Launcher registration silently fails at runtime.
- **How We Solved It in HearthCast TV:** Standardized `com.hearthcast.tv.familynight.main` across `[[components.interactive]]`, `[[extras]]`, and `[[offers.interaction]]`, and implemented a full `IContentLauncherHandler` (`handleLaunchContent(contentSearch, autoPlay, optionalFields)`) in [`src/lib/vega/kepler-runtime-adapter.ts`](file:///Users/zion/Desktop/hearthcast-tv/src/lib/vega/kepler-runtime-adapter.ts).
- **Recommendation for Amazon Team:** Ship a JSON Schema / TOML linter rule inside the **Amazon Devices Builder Tools MCP server** that validates cross-references between `[[extras]].component-id` and `[[components.interactive]].id` on save.

### 3. `VEGA-FL-03` · `useTVEventHandler` Double-Firing on `eventKeyAction` (`0` vs `1`)
- **Component:** `@amazon-devices/react-native-kepler` (`useTVEventHandler`)
- **Severity:** `HIGH`
- **What Happened:** Physical Fire TV remote D-Pad presses emit two events per button press: `eventKeyAction = 0` (`keyDown`) and `eventKeyAction = 1` (`keyUp`). If a handler switches only on `evt.eventType` (`'up' | 'down' | 'left' | 'right' | 'select'`), every D-Pad press moves focus **two** tiles instead of one.
- **How We Solved It in HearthCast TV:** Explicitly ignored `evt.eventKeyAction === 1` inside `mapKeplerHWEventToRemoteAction()` in [`src/lib/vega/kepler-runtime-adapter.ts`](file:///Users/zion/Desktop/hearthcast-tv/src/lib/vega/kepler-runtime-adapter.ts) and verified `keyDown` vs `keyUp` deduplication in Gate 5.
- **Recommendation for Amazon Team:** Add an optional config parameter `useTVEventHandler(handler, { triggerOn: 'keyDown' })` that defaults to firing only on `eventKeyAction === 0`.

### 4. `VEGA-FL-04` · `TVFocusGuideView` Orphaned Focus When Game/Story Nodes Unmount
- **Component:** 10-Foot Spatial Navigation & `TVFocusGuideView`
- **Severity:** `MEDIUM`
- **What Happened:** In interactive TV apps (like trivia rounds transitioning from `QUESTION` to `REVEAL`/`PODIUM`, or branching story choices updating between chapters), the currently focused UI element is frequently unmounted or disabled. Without deterministic fallback routing and per-row focus memory, D-Pad focus can become orphaned, leaving the user unable to navigate without pressing `BACK`.
- **How We Solved It in HearthCast TV:** Built `ensureValidFocus()` and `restoreRowFocusMemory()` in [`src/lib/tv/spatial-focus-engine.ts`](file:///Users/zion/Desktop/hearthcast-tv/src/lib/tv/spatial-focus-engine.ts) to guarantee zero orphaned focus states and automatic row focus restoration.
- **Recommendation for Amazon Team:** Add a declarative `fallbackFocusDestination` prop to `TVFocusGuideView` that automatically claims focus whenever a focused child unmounts.

### 5. `VEGA-FL-05` · 10-Foot Television 5% Overscan Safe-Area Visibility During Development
- **Component:** Fire TV 10-Foot UI Guidelines (`1920×1080` / `960×540 dp` `xhdpi`)
- **Severity:** `LOW`
- **What Happened:** Amazon's Fire TV guidelines specify a **5% Overscan Safe Area** (`96px` horizontal and `54px` vertical inset on `1080p`) so televisions with hardware overscan do not crop critical UI labels or room codes. However, standard desktop webviews and simulators render edge-to-edge without showing the 5% crop boundary.
- **How We Solved It in HearthCast TV:** Implemented `auditOverscanSafeArea()` in [`src/lib/tv/spatial-focus-engine.ts`](file:///Users/zion/Desktop/hearthcast-tv/src/lib/tv/spatial-focus-engine.ts) and added an interactive **`📐 5% Overscan Safe Zone`** visual overlay toggle in the 10-foot UI header so developers and judges can inspect the exact `5%` (`96px × 54px`) safe-area boundary live.
- **Recommendation for Amazon Team:** Add a 1-click "5% Overscan Safe Zone Overlay" button directly in the Vega Virtual Device (VVD) and Fire TV Web App Tester toolbars.
