/**
 * HearthCast TV — Amazon Vega OS (`@amazon-devices/react-native-kepler`) Runtime Adapter
 *
 * Bridges Vega OS native hardware events (Kepler D-Pad key codes, Content Launcher
 * directives, and Alexa Voice Remote intents) with HearthCast TV's 10-foot Web/Silk
 * presentation layer so a single codebase powers both Fire TV Web App and Vega OS builds.
 */

import { mapKeyToRemoteAction, type RemoteAction } from '../tv/spatial-focus-engine.ts';
import {
  parseVegaDeepLink,
  parseVoiceDirective,
  type DeepLinkTarget,
  type VoiceDirectiveResult,
} from './vega-content-launcher.ts';

export interface KeplerHWEvent {
  eventType:
    | 'up'
    | 'down'
    | 'left'
    | 'right'
    | 'select'
    | 'back'
    | 'playPause'
    | 'menu'
    | 'voice';
  eventKeyAction?: 0 | 1; // 0 = keyDown, 1 = keyUp
}

export interface VegaRuntimeCapabilities {
  platform: 'VEGA_KEPLER' | 'FIRE_TV_SILK_WEB';
  supportsContentLauncher: boolean;
  supportsHardwareDPad: boolean;
  supportsVoiceDirectives: boolean;
  packageId: string;
}

/**
 * Detects whether the current JS context is running inside the native Vega OS
 * KeplerScript runtime or the Fire TV Silk / Desktop 10-Foot Web runtime.
 */
export function detectVegaRuntimeCapabilities(): VegaRuntimeCapabilities {
  const isKeplerNative =
    typeof globalThis !== 'undefined' &&
    Boolean((globalThis as Record<string, unknown>).__KEPLER_RUNTIME__);

  return {
    platform: isKeplerNative ? 'VEGA_KEPLER' : 'FIRE_TV_SILK_WEB',
    supportsContentLauncher: true,
    supportsHardwareDPad: true,
    supportsVoiceDirectives: true,
    packageId: 'com.hearthcast.tv.familynight',
  };
}

/**
 * Translates a Vega OS `KeplerHWEvent` (from `@amazon-devices/react-native-kepler`
 * `useTVEventHandler`) into a canonical HearthCast `RemoteAction`.
 */
export function mapKeplerHWEventToRemoteAction(
  evt: KeplerHWEvent
): RemoteAction | null {
  // Ignore key-up events when eventKeyAction === 1 so each button press fires once
  if (evt.eventKeyAction === 1) {
    return null;
  }

  switch (evt.eventType) {
    case 'up':
      return 'UP';
    case 'down':
      return 'DOWN';
    case 'left':
      return 'LEFT';
    case 'right':
      return 'RIGHT';
    case 'select':
      return 'SELECT';
    case 'back':
      return 'BACK';
    case 'playPause':
      return 'PLAY_PAUSE';
    case 'menu':
      return 'MENU';
    case 'voice':
      return 'VOICE';
    default:
      return mapKeyToRemoteAction(evt.eventType);
  }
}

/**
 * Handles an incoming Amazon Content Launcher request or Alexa Voice directive.
 */
export function handleVegaLauncherPayload(payload: {
  uri?: string;
  voiceUtterance?: string;
}): {
  deepLink: DeepLinkTarget | null;
  voiceDirective: VoiceDirectiveResult | null;
} {
  const deepLink = payload.uri ? parseVegaDeepLink(payload.uri) : null;
  const voiceDirective = payload.voiceUtterance
    ? parseVoiceDirective(payload.voiceUtterance)
    : null;

  return {
    deepLink,
    voiceDirective,
  };
}
