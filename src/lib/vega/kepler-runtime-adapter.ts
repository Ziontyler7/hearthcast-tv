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
  osVersionTarget: string;
  osVersionMin: string;
  contentLauncherInterface: 'com.amazon.kepler.media.IContentLauncherServer';
  contentLauncherModuleId: '/com.amazon.kepler.media@IContentLauncher1';
  supportsContentLauncher: boolean;
  supportsHardwareDPad: boolean;
  supportsVoiceDirectives: boolean;
  packageId: string;
}

/**
 * Mirrors `@amazon-devices/kepler-media-content-launcher` `ContentLauncherStatusType`.
 */
export const ContentLauncherStatusType = {
  SUCCESS: 'SUCCESS',
  AUTH_FAILED: 'AUTH_FAILED',
  URL_NOT_AVAILABLE: 'URL_NOT_AVAILABLE',
  NOT_FOUND: 'NOT_FOUND',
} as const;

export type ContentLauncherStatusValue =
  (typeof ContentLauncherStatusType)[keyof typeof ContentLauncherStatusType];

export interface IContentSearchParameter {
  paramType: 'ENTITY' | 'GENRE' | 'FRANCHISE' | 'KEYWORD';
  value: string;
  externalIdList?: Array<{ name: string; value: string }>;
}

/**
 * Mirrors `@amazon-devices/kepler-media-content-launcher` `IContentSearch`.
 */
export interface IContentSearch {
  parameterList: IContentSearchParameter[];
}

/**
 * Mirrors `@amazon-devices/kepler-media-content-launcher` `ILaunchContentOptionalFields`.
 */
export interface ILaunchContentOptionalFields {
  pageContext?: string;
  requesterId?: string;
  deepLinkUri?: string;
}

/**
 * Mirrors `@amazon-devices/kepler-media-content-launcher` `ILauncherResponse`.
 */
export interface ILauncherResponse {
  contentLauncherStatus: ContentLauncherStatusValue;
  resolvedTarget?: DeepLinkTarget;
  autoPlayApplied?: boolean;
  diagnosticMessage?: string;
}

/**
 * Mirrors `@amazon-devices/kepler-media-content-launcher` `IContentLauncherHandler`.
 */
export interface IContentLauncherHandler {
  handleLaunchContent(
    contentSearch: IContentSearch,
    autoPlay: boolean,
    optionalFields: ILaunchContentOptionalFields
  ): Promise<ILauncherResponse>;
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
    osVersionTarget: '1.2',
    osVersionMin: '1.2',
    contentLauncherInterface: 'com.amazon.kepler.media.IContentLauncherServer',
    contentLauncherModuleId: '/com.amazon.kepler.media@IContentLauncher1',
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

/**
 * Creates a compliant `@amazon-devices/kepler-media-content-launcher`
 * `IContentLauncherHandler` whose `handleLaunchContent` method resolves
 * Universal Search & Browse (`IContentSearch`) or explicit `deepLinkUri`
 * payloads into a validated `DeepLinkTarget` and `ILauncherResponse`.
 */
export function createKeplerContentLauncherHandler(
  onTargetLaunched?: (target: DeepLinkTarget, autoPlay: boolean) => void
): IContentLauncherHandler {
  return {
    async handleLaunchContent(
      contentSearch: IContentSearch,
      autoPlay: boolean,
      optionalFields: ILaunchContentOptionalFields
    ): Promise<ILauncherResponse> {
      if (optionalFields?.deepLinkUri) {
        const resolved = parseVegaDeepLink(optionalFields.deepLinkUri);
        onTargetLaunched?.(resolved, autoPlay);
        return {
          contentLauncherStatus: ContentLauncherStatusType.SUCCESS,
          resolvedTarget: resolved,
          autoPlayApplied: autoPlay,
          diagnosticMessage: `Resolved deepLinkUri (${optionalFields.deepLinkUri}) -> ${resolved.mode}:${resolved.contentId ?? 'HOME'}`,
        };
      }

      const firstParam = contentSearch?.parameterList?.[0];
      if (!firstParam || !firstParam.value?.trim()) {
        return {
          contentLauncherStatus: ContentLauncherStatusType.URL_NOT_AVAILABLE,
          diagnosticMessage: 'Empty IContentSearch parameterList.',
        };
      }

      const externalId = firstParam.externalIdList?.[0]?.value;
      if (externalId && externalId.startsWith('hearthcast://')) {
        const resolved = parseVegaDeepLink(externalId);
        onTargetLaunched?.(resolved, autoPlay);
        return {
          contentLauncherStatus: ContentLauncherStatusType.SUCCESS,
          resolvedTarget: resolved,
          autoPlayApplied: autoPlay,
          diagnosticMessage: `Resolved externalId (${externalId}) -> ${resolved.mode}:${resolved.contentId ?? 'HOME'}`,
        };
      }

      const directive = parseVoiceDirective(firstParam.value);
      if (directive.type === 'LAUNCH_MODE') {
        const resolved: DeepLinkTarget = {
          mode: directive.mode,
          contentId: directive.targetId,
          role: 'tv',
        };
        onTargetLaunched?.(resolved, autoPlay);
        return {
          contentLauncherStatus: ContentLauncherStatusType.SUCCESS,
          resolvedTarget: resolved,
          autoPlayApplied: autoPlay,
          diagnosticMessage: `Resolved IContentSearch ("${firstParam.value}") -> ${resolved.mode}:${resolved.contentId ?? 'HOME'}`,
        };
      }

      return {
        contentLauncherStatus: ContentLauncherStatusType.NOT_FOUND,
        diagnosticMessage: `No matching Fire TV catalog item for "${firstParam.value}"`,
      };
    },
  };
}

