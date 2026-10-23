import { createFileRoute } from "@tanstack/react-router";
import React, {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Activity,
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  LayoutList,
  Link2,
  Loader2,
  Moon,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Subtitles,
  Sun,
  Tv,
  Share2,
  Info,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  align,
  fmt,
  LANGS,
  RTL,
  STRATEGIES,
  PARSER_CRITERIA,
  DEFAULT_PARSER_CRITERIA,
  PARSER_PRESETS,
  DEFAULT_CRITERIA_SETTINGS,
  type CriteriaGroupSettings,
  type CriteriaId,
  type Json3,
  type Row,
  type Strategy,
} from "@/lib/subtitles";
import {
  buildLangReplacedCaptionUrl,
  buildTranslatedCaptionUrl,
  decodeInterceptedCaption,
  nativeShell,
  parseJson3,
  parseVideoId,
  timedTextVideoId,
} from "@/lib/native-captions";
import {
  SUPPORTED_LANGUAGES_CATALOG,
  getUserLearningLanguages,
  setUserLearningLanguages,
  getAutoScrollSetting,
  setAutoScrollSetting,
  recordUserInteraction,
  isAutoScrollAllowed,
  getLastUserInteractionTimestamp,
  AUTO_SCROLL_COOLDOWN_MS,
  getDebugModeSetting,
  setDebugModeSetting,
  loadVideoSettings,
  saveVideoSettings,
  getAutoSpeakOnFetchSetting,
  setAutoSpeakOnFetchSetting,
  getSpeakLanguageNameOnFetchSetting,
  setSpeakLanguageNameOnFetchSetting,
  getSubtitleFetchWindowSeconds,
  setSubtitleFetchWindowSeconds,
  getFavoriteLanguages,
  setFavoriteLanguages,
  getOnDemandTranslationSetting,
  setOnDemandTranslationSetting,
  getOnDemandTranslationSentencesAhead,
  setOnDemandTranslationSentencesAhead,
  getOpenRouterApiKeySetting,
  setOpenRouterApiKeySetting,
  getStripSpeakerBracketsSetting,
  setStripSpeakerBracketsSetting,
  getRemoveCharsSetting,
  setRemoveCharsSetting,
} from "@/utils/appSettings";
import { SpecialCharactersRemovalPanel } from "@/components/SpecialCharactersRemovalPanel";
import {
  getAppStateFromUrl,
  extractVideoIdFromSubtitlesUrl,
  extractLanguageFromSubtitlesUrl,
} from "@/utils/urlStateManager";
import { ShareStateModal } from "@/components/ShareStateModal";
import { ParserDiffConfirmationModal } from "@/components/ParserDiffConfirmationModal";
import { VideoMetadataModal } from "@/components/VideoMetadataModal";
import { computeParserDiff, type ParserDiffResult } from "@/utils/parserDiffHelper";
import { Switch } from "@/components/ui/switch";
import {
  translateSentencesAhead,
  getStoredOnDemandTranslation,
  getAllStoredOnDemandTranslations,
  clearOnDemandTranslations,
} from "@/utils/onDemandTranslationManager";
import { LanguageBoxesSelector } from "@/components/LanguageBoxesSelector";
import { LanguageSubtitleUrlModal } from "@/components/LanguageSubtitleUrlModal";
import {
  getAudioTrackMode,
  setAudioTrackMode,
  repeatSegmentWithAudioTrack,
} from "@/utils/audioTrackManager";
import {
  deduplicateVoices,
  getLanguageVoices,
  getUniqueVoiceKey,
  matchesLanguageCode,
  setCachedVoices,
  getCachedVoices,
  findVoiceByUriOrName,
} from "@/utils/speechVoiceUtils";
import {
  getUseAlternativeTts,
  setUseAlternativeTts,
  getAlternativeTtsMode,
  setAlternativeTtsMode,
  getLovableTtsProvider,
  setLovableTtsProvider,
  getLovableTtsVoice,
  setLovableTtsVoice,
  getLovableTtsSpeed,
  setLovableTtsSpeed,
  getLovableTtsApiKey,
  setLovableTtsApiKey,
  getServerOpenRouterApiKey,
  hasCustomOpenRouterApiKey,
  playAlternativeTtsAudio,
  cancelAlternativeTtsAudio,
  LOVABLE_TTS_OPENAPI_URL,
  LOVABLE_VOICES,
  OPENROUTER_VOICES,
  type AlternativeTtsMode,
  type LovableTtsProvider,
} from "@/lib/alternative-tts";
import {
  computeVideoInstances,
  multiVideoPlayerRegistry,
  executeMultiVideoSegmentSync,
  removeVideoInstanceConfig,
  type VideoInstanceConfig,
  type YTPlayerLike,
} from "@/utils/multiVideoPlayerManager";
import { VideoInstancesSwiper } from "@/components/VideoInstancesSwiper";
import { VideoPlaybackControls } from "@/components/VideoPlaybackControls";
import { FloatingDraggablePauseButton } from "@/components/FloatingDraggablePauseButton";
import { trackNetworkRequest, useNetworkRequests } from "@/utils/networkTracker";
import { NetworkRequestsInspector } from "@/components/NetworkRequestsInspector";
import { AccordionSection } from "@/components/AccordionSection";
import { SubtitlesTablePanel } from "@/components/SubtitlesTablePanel";
import { HighlightedSubtitle } from "@/components/HighlightedSubtitle";
import { ApkReleasesFooter } from "@/components/ApkReleasesFooter";
import { VideoPlayground, type DetectedSubtitleTrack } from "@/components/VideoPlayground";
import { AiSubtitlePunctuationTab } from "@/components/AiSubtitlePunctuationTab";
import { WebDemoUrlsInput } from "@/components/WebDemoUrlsInput";
import { ParserTimingLab } from "@/components/ParserTimingLab";
import { FloatingSubtitleRetryIndicator } from "@/components/FloatingSubtitleRetryIndicator";
import { ModeSwitcherHeader } from "@/components/ModeSwitcherHeader";
import { BeginnerFlowContainer } from "@/components/beginner/BeginnerFlowContainer";
import { subtitleRequestQueue } from "@/utils/subtitleRequestQueue";
import {
  getSectionOrder,
  getSubtitleRequestMode,
  getTtsRatiosPreference,
  isSubtitleInstanceEligibleForTTS,
  shouldHighlightSentenceForTTS,
  setSectionOrder as saveSectionOrder,
  setSubtitleRequestMode as saveSubtitleRequestMode,
  setTtsRatioPreference as saveTtsRatioPreference,
  subtitleRequestModeOrder,
  getAutoRetrySubtitles,
  setAutoRetrySubtitles as saveAutoRetrySubtitles,
  getRetryPacingMinSec,
  setRetryPacingMinSec as saveRetryPacingMinSec,
  getRetryPacingMaxSec,
  setRetryPacingMaxSec as saveRetryPacingMaxSec,
  getBackgroundAudioEnabled,
  setBackgroundAudioEnabled as saveBackgroundAudioEnabled,
  type SectionOrder,
  type SubtitleRequestMode,
} from "@/lib/playback-preferences";
import {
  initBackgroundMediaManager,
  syncMediaMetadata,
  setNativeBackgroundAudio,
} from "@/utils/backgroundMediaManager";
import { ApkReleaseModal } from "@/components/ApkReleaseModal";
import { SubtitleFetchToast } from "@/components/SubtitleFetchToast";
import { VideoLibraryPanel } from "@/components/VideoLibraryPanel";
import { AttemptOrderSettings } from "@/components/AttemptOrderSettings";
import {
  type FetchAttempt,
  type SendMode,
  type ExactFetchResult,
  type SubtitleFetchStrategyConfig,
  getAttemptOrder,
  setAttemptOrder,
  getPromoteSuccessfulAttempt,
  setPromoteSuccessfulAttempt,
  getUseFetchServer,
  setUseFetchServer,
  getFetchServerUrl,
  setFetchServerUrl,
  fetchViaServer,
  promoteAttempt,
  runFetchAttempts,
  nativeExactFetch,
  getFetchStrategyConfig,
  DEFAULT_FETCH_STRATEGY_CONFIG,
  buildActiveAttemptOrder,
} from "@/lib/subtitle-fetch-plan";
import type { VideoMetadata } from "@/types";
import { recordVideoWatch, updateVideoLibraryTitle } from "@/utils/videoLibraryManager";
import {
  fetchVideoMetadata,
  getCachedVideoMetadata,
  enrichMetadataWithPlayer,
} from "@/utils/videoMetadataManager";
import { notifySubtitleFetch } from "@/utils/subtitleNotificationManager";
import { getApkReleaseLinks } from "@/utils/apkUpdater";
import {
  isValidJsonSubtitleResponse,
  saveCachedRawJson3,
  getCachedRawJson3,
  removeCachedTargetSubtitles,
  clearVideoSubtitleCache,
  getCachedAiSubtitles,
  hasCachedAiSubtitles,
} from "@/utils/subtitleCache";
import { recordWinnerPromotion } from "@/utils/winnerPromotionTracker";
import {
  STORAGE_KEYS,
  APP_VERSION,
  APP_COMMIT_ID,
  APP_VERSION_DESCRIPTION,
  ALL_RELEASES_URL,
  DEFAULT_VIDEO_ID,
} from "@/config/appConfig";
import serverConfig from "@/config/server.json";
import { JSON3_RAW_MAP } from "../../test/fixtures/L2Ryrr6txwA/jsonStrings";

const DEMO_VIDEO = "L2Ryrr6txwA";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Parallel Subtitles" },
      {
        name: "description",
        content:
          "Align json3 subtitles into parallel sentences and hear each language spoken between video sections.",
      },
      { property: "og:title", content: "Parallel Subtitles" },
      {
        property: "og:description",
        content:
          "Align json3 subtitles into parallel sentences and hear each language spoken between video sections.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(s: number, a: boolean): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  destroy?(): void;
  stopVideo?(): void;
  getVideoData?(): { video_id?: string; title?: string };
  getDuration?(): number;
  getAvailableAudioTracks?(): unknown[];
  setAudioTrack?(trackId: string): void;
  getAudioTrack?(): unknown;
  setPlaybackRate?(rate: number): void;
  getPlaybackRate?(): number;
};
declare global {
  interface Window {
    YT?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    onYouTubeIframeAPIReady?: () => void;
    onNativeCaptionsInterceptedBase64?: (payload: string) => void;
    onNativeSharedLinkReceived?: (url: string) => void;
    __pendingSharedLink?: string;
  }
}

type SpeechProgress = { lang: string; row: number; start: number; end: number } | null;
type Theme = "light" | "dark" | "dark-blue";
import { type PanelId, PANELS, ACCORDION_THEMES } from "@/config/accordionThemes";

function cancelSpeech() {
  cancelAlternativeTtsAudio();
  if (typeof window !== "undefined") {
    (window as Window & { _activeUtterance?: SpeechSynthesisUtterance | null })._activeUtterance =
      null;
  }
  if (typeof window !== "undefined" && window.AndroidNativeShell?.stopSpeaking) {
    try {
      window.AndroidNativeShell.stopSpeaking();
    } catch (_e) {
      // Ignore Android TTS cancellation error
    }
  }
  if (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    window.speechSynthesis?.cancel
  ) {
    try {
      window.speechSynthesis.cancel();
    } catch (_e) {
      // Ignore speech cancellation error
    }
  }
  try {
    multiVideoPlayerRegistry.pauseAllExcept("primary");
    multiVideoPlayerRegistry.unmuteOnly("primary");
  } catch {
    // Ignore multi-player cleanup error
  }
}

const getFixturesUrl = (video: string, lang: string) => {
  if (typeof window !== "undefined") {
    try {
      const base = document.baseURI || window.location.href;
      return new URL(`fixtures/${video}/${lang}.json`, base).href;
    } catch {
      // fallback
    }
  }
  return `./fixtures/${video}/${lang}.json`;
};

function speak(
  text: string,
  lang: string,
  rate: number,
  voiceURI: string,
  row: number,
  onProgress: (value: SpeechProgress) => void,
) {
  return new Promise<void>((res) => {
    void (async () => {
      if (!text) return res();

      const normalizedRate = Math.max(0.3, Math.min(1.5, rate || 0.5));
      const useAltTts = typeof window !== "undefined" && getUseAlternativeTts();
      const altTtsMode = typeof window !== "undefined" ? getAlternativeTtsMode() : "fallback_only";
      // Use the native speech rate setting directly (no separate extra speed rate)
      const altSpeed = normalizedRate;
      const altProvider = typeof window !== "undefined" ? getLovableTtsProvider() : "lovable";
      const altVoice = typeof window !== "undefined" ? getLovableTtsVoice() : "Kore";

      // 1. If alternative TTS service is enabled as preferred / always, speak with it directly
      if (useAltTts && altTtsMode === "always") {
        try {
          onProgress({
            lang: lang.slice(0, 2),
            row,
            start: 0,
            end: text.length,
          });
          await playAlternativeTtsAudio(
            text,
            lang,
            altSpeed,
            (pct) => {
              onProgress({
                lang: lang.slice(0, 2),
                row,
                start: 0,
                end: Math.round((pct / 100) * text.length),
              });
            },
            "lovable",
            {
              provider: altProvider,
              voice: altVoice,
              speed: altSpeed,
            },
          );
          onProgress(null);
          return res();
        } catch (err) {
          console.warn("Alternative TTS primary error, continuing to Web Speech:", err);
        }
      }

      const cached = getCachedVoices<SpeechSynthesisVoice>();
      const systemVoices =
        typeof window !== "undefined" && "speechSynthesis" in window
          ? window.speechSynthesis.getVoices?.() || []
          : [];
      const voices = cached.length > 0 ? cached : systemVoices;

      const chosenVoice =
        voiceURI && voices.length > 0 ? findVoiceByUriOrName(voices, voiceURI) : undefined;

      if (typeof window !== "undefined" && window.AndroidNativeShell?.speak) {
        try {
          const utteranceId = `row-${row}-${lang}-${Date.now()}`;
          const handled = window.AndroidNativeShell.speak(text, lang, normalizedRate, utteranceId);
          if (handled) {
            onProgress({
              lang: lang.slice(0, 2),
              row,
              start: 0,
              end: text.length,
            });
            let resolved = false;
            let timer: ReturnType<typeof setTimeout> | null = null;
            const finish = () => {
              if (resolved) return;
              resolved = true;
              if (timer) clearTimeout(timer);
              onProgress(null);
              res();
            };
            const prevDone = window.onNativeTTSDone;
            window.onNativeTTSDone = (uid: string) => {
              if (uid === utteranceId) {
                window.onNativeTTSDone = prevDone;
                finish();
              } else if (prevDone) {
                prevDone(uid);
              }
            };
            const prevErr = window.onNativeTTSError;
            window.onNativeTTSError = (uid: string, err?: string) => {
              if (uid === utteranceId) {
                window.onNativeTTSError = prevErr;
                finish();
              } else if (prevErr) {
                prevErr(uid, err);
              }
            };
            const estDurationMs = Math.max(
              800,
              (text.length / 10) * (1000 / (normalizedRate || 0.5)),
            );
            timer = setTimeout(finish, estDurationMs);
            return;
          }
        } catch (e) {
          console.warn("Android native TTS bridge failed, falling back to Web Speech", e);
        }
      }

      const fallbackToAlternative = async () => {
        if (useAltTts) {
          try {
            onProgress({
              lang: lang.slice(0, 2),
              row,
              start: 0,
              end: text.length,
            });
            await playAlternativeTtsAudio(
              text,
              lang,
              altSpeed,
              (pct) => {
                onProgress({
                  lang: lang.slice(0, 2),
                  row,
                  start: 0,
                  end: Math.round((pct / 100) * text.length),
                });
              },
              "lovable",
              {
                provider: altProvider,
                voice: altVoice,
                speed: altSpeed,
              },
            );
            onProgress(null);
            res();
            return true;
          } catch (altErr) {
            console.warn("Alternative TTS fallback error:", altErr);
          }
        }
        return false;
      };

      if (
        typeof window === "undefined" ||
        !("speechSynthesis" in window) ||
        !window.speechSynthesis
      ) {
        if (await fallbackToAlternative()) return;
        return res();
      }

      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        const u = new SpeechSynthesisUtterance(text);
        u.rate = normalizedRate;

        const v =
          chosenVoice ??
          voices.find((x) => x.voiceURI === voiceURI || x.name === voiceURI) ??
          voices.find((x) => matchesLanguageCode(x.lang, lang));

        if (v) {
          u.voice = v;
          // Align u.lang with chosen voice's lang to avoid voice override on Chromium/WebKit
          u.lang = v.lang || lang;
        } else {
          u.lang = lang;
        }

        u.onboundary = (event) => {
          if (event.name !== "word") return;
          const remainder = text.slice(event.charIndex);
          const wordLength = event.charLength || remainder.match(/^\S+/)?.[0].length || 1;
          onProgress({
            lang: lang.slice(0, 2),
            row,
            start: event.charIndex,
            end: event.charIndex + wordLength,
          });
        };
        let resolved = false;
        let safetyTimer: ReturnType<typeof setTimeout> | null = null;
        const done = async (isError?: boolean) => {
          if (resolved) return;
          resolved = true;
          if (safetyTimer) {
            clearTimeout(safetyTimer);
            safetyTimer = null;
          }
          if (typeof window !== "undefined") {
            (
              window as Window & { _activeUtterance?: SpeechSynthesisUtterance | null }
            )._activeUtterance = null;
          }
          if (isError && (await fallbackToAlternative())) {
            return;
          }
          onProgress(null);
          res();
        };
        u.onend = () => done(false);
        u.onerror = () => done(true);
        const timeoutMs = Math.max(
          3000,
          (text.length / 5) * (1000 / (normalizedRate || 0.5)) + 3000,
        );
        safetyTimer = setTimeout(() => done(false), timeoutMs);
        if (typeof window !== "undefined") {
          (
            window as Window & { _activeUtterance?: SpeechSynthesisUtterance | null }
          )._activeUtterance = u;
        }
        window.speechSynthesis.speak(u);
      } catch (e) {
        console.warn("Speech synthesis error:", e);
        if (await fallbackToAlternative()) return;
        onProgress(null);
        res();
      }
    })();
  });
}

function getLanguageMeta(code: string): { code: string; name: string; tts: string } {
  const fromLangs = LANGS.find((l) => l.code === code);
  if (fromLangs) return fromLangs;
  const fromCatalog = SUPPORTED_LANGUAGES_CATALOG.find((l) => l.code === code);
  if (fromCatalog) {
    const tts = code.includes("-") ? code : `${code}-${code.toUpperCase()}`;
    return { code, name: fromCatalog.name, tts };
  }
  return { code, name: code.toUpperCase(), tts: code };
}

function Index() {
  const [isAndroid, setIsAndroid] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      Boolean(nativeShell()) ||
      new URLSearchParams(window.location.search).get("android") === "true"
    );
  });

  const [workflowMode, setWorkflowMode] = useState<"beginner" | "expert">(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("app_workflow_mode");
        if (saved === "expert" || saved === "beginner") return saved;
      } catch {
        // ignore
      }
    }
    return "beginner";
  });

  const handleWorkflowModeChange = (mode: "beginner" | "expert") => {
    setWorkflowMode(mode);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("app_workflow_mode", mode);
      } catch {
        // ignore
      }
    }
  };

  const [videoId, setVideoId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const target =
        params.get("v") ||
        params.get("url") ||
        (window as Window & { __pendingSharedLink?: string }).__pendingSharedLink;
      if (target) {
        const id = parseVideoId(target);
        if (id) return id;
      }
      // Requirement 1.2: Video ID is extracted from subtitles URL if present
      const subUrlParam = params.get("subtitles_url") || params.get("sub_url");
      if (subUrlParam) {
        const idFromSub = extractVideoIdFromSubtitlesUrl(subUrlParam);
        if (idFromSub) return idFromSub;
      }
      const isAndroidEnv = Boolean(nativeShell()) || params.get("android") === "true";
      if (isAndroidEnv) {
        return DEFAULT_VIDEO_ID;
      }
    }
    return DEMO_VIDEO;
  });
  const [activeTopTab, setActiveTopTab] = useState<"viewer" | "playground" | "ai-punctuation">(
    "viewer",
  );
  const activeTopTabRef = useRef(activeTopTab);
  activeTopTabRef.current = activeTopTab;

  const [detectedPlaygroundTracks, setDetectedPlaygroundTracks] = useState<
    Record<string, DetectedSubtitleTrack>
  >({});

  const [videoInput, setVideoInput] = useState("");
  const [captionStatus, setCaptionStatus] = useState("");
  const [observedUrl, setObservedUrl] = useState("");
  const [defaultCaptionsLoaded, setDefaultCaptionsLoaded] = useState(false);
  const [tracks, setTracks] = useState<Record<string, Json3> | null>(null);
  const [isSubtitlesPending, startSubtitlesTransition] = useTransition();
  const [strategy, setStrategy] = useState<Strategy>("sentence");
  const [selectedCriteria, setSelectedCriteria] = useState<CriteriaId[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.PARSER_CRITERIA_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {
        // ignore storage error
      }
    }
    // By default check all options (combine all categories: syntax, timing, alignment)
    return DEFAULT_PARSER_CRITERIA;
  });

  const [confirmParserDiff, setConfirmParserDiff] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved =
          localStorage.getItem(STORAGE_KEYS.PARSER_CONFIRM_DIFF_STORAGE_KEY) ||
          localStorage.getItem("yt_confirm_parser_diff");
        return saved === "true";
      } catch {
        return false;
      }
    }
    return false;
  });
  const confirmParserDiffEnabled = confirmParserDiff;
  const setConfirmParserDiffEnabled = setConfirmParserDiff;

  const [pendingParserChange, setPendingParserChange] = useState<{
    criteria: CriteriaId[];
    settings?: CriteriaGroupSettings;
    criteriaNames: string[];
    diffResult: ParserDiffResult;
  } | null>(null);

  const [criteriaSettings, setCriteriaSettings] = useState<CriteriaGroupSettings>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.PARSER_SETTINGS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object") {
            return {
              sentence: { ...DEFAULT_CRITERIA_SETTINGS.sentence, ...(parsed.sentence || {}) },
              pause: { ...DEFAULT_CRITERIA_SETTINGS.pause, ...(parsed.pause || {}) },
              punctVote: { ...DEFAULT_CRITERIA_SETTINGS.punctVote, ...(parsed.punctVote || {}) },
              consensus: { ...DEFAULT_CRITERIA_SETTINGS.consensus, ...(parsed.consensus || {}) },
              cue: { ...DEFAULT_CRITERIA_SETTINGS.cue, ...(parsed.cue || {}) },
              anchors: { ...DEFAULT_CRITERIA_SETTINGS.anchors, ...(parsed.anchors || {}) },
              window: { ...DEFAULT_CRITERIA_SETTINGS.window, ...(parsed.window || {}) },
            };
          }
        }
      } catch {
        // ignore storage error
      }
    }
    return DEFAULT_CRITERIA_SETTINGS;
  });

  const [expandedSettingsGroup, setExpandedSettingsGroup] = useState<CriteriaId | null>(null);

  const handleUpdateGroupSettings = <K extends keyof CriteriaGroupSettings>(
    group: K,
    patch: Partial<CriteriaGroupSettings[K]>,
  ) => {
    setCriteriaSettings((prev) => {
      const updated = {
        ...prev,
        [group]: {
          ...prev[group],
          ...patch,
        },
      };
      try {
        localStorage.setItem(STORAGE_KEYS.PARSER_SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore storage error
      }
      return updated;
    });
  };

  const getInitialFavoriteLanguages = (): string[] => {
    if (typeof window !== "undefined") {
      const favs = getFavoriteLanguages();
      if (favs && favs.length > 0) return favs;
      const isAndroidEnv =
        Boolean(nativeShell()) ||
        new URLSearchParams(window.location.search).get("android") === "true";
      if (isAndroidEnv) return ["he", "it"];
    }
    return [];
  };

  const getInitialTargetLanguages = (): string[] => {
    if (typeof window !== "undefined") {
      const urlVideo = parseVideoId(window.location.search) || DEMO_VIDEO;
      const videoSaved = loadVideoSettings(urlVideo);
      if (
        videoSaved?.targetLanguages &&
        Array.isArray(videoSaved.targetLanguages) &&
        videoSaved.targetLanguages.length > 0
      ) {
        return videoSaved.targetLanguages.map((l: unknown) =>
          typeof l === "string" ? l : (l as { code: string }).code,
        );
      }
      const saved = getUserLearningLanguages();
      if (saved && saved.length > 0) return saved;
      const isAndroidEnv =
        Boolean(nativeShell()) ||
        new URLSearchParams(window.location.search).get("android") === "true";
      if (isAndroidEnv) return ["he", "it"];
    }
    return [];
  };

  const [favoriteLanguages, setFavoriteLanguagesState] = useState<string[]>(
    getInitialFavoriteLanguages,
  );
  const [targetLanguages, setTargetLanguages] = useState<string[]>(getInitialTargetLanguages);

  // For any favorite language - by default do checkbox on for both options: present in table & tts-play
  const [shown, setShown] = useState<string[]>(() => {
    const favs = getInitialFavoriteLanguages();
    const targets = getInitialTargetLanguages();
    return Array.from(new Set([...favs, ...targets]));
  });
  const [spoken, setSpoken] = useState<string[]>(() => {
    const favs = getInitialFavoriteLanguages();
    const targets = getInitialTargetLanguages();
    return Array.from(new Set([...favs, ...targets]));
  });

  const handleUpdateFavoriteLanguages = (newFavs: string[]) => {
    const addedFavs = newFavs.filter((l) => !favoriteLanguages.includes(l));
    const removedFavs = favoriteLanguages.filter((l) => !newFavs.includes(l));
    setFavoriteLanguagesState(newFavs);
    setFavoriteLanguages(newFavs);

    if (addedFavs.length > 0) {
      // For any favorite language - by default do checkbox on for both options: present in table & tts-play
      setShown((prev) => Array.from(new Set([...prev, ...addedFavs])));
      setSpoken((prev) => Array.from(new Set([...prev, ...addedFavs])));
      setTargetLanguages((prev) => Array.from(new Set([...prev, ...addedFavs])));
      targetLanguagesRef.current = Array.from(new Set([...targetLanguages, ...addedFavs]));
      if (videoId) {
        saveVideoSettings(videoId, {
          targetLanguages: Array.from(new Set([...targetLanguages, ...addedFavs])),
        });
      }
      if (isAndroid) {
        setCaptionStatus(
          `Fetching live subtitles for added favorite language: ${addedFavs.join(", ")}…`,
        );
        void fetchFavoriteLanguageSubtitles(addedFavs);
      }
    }
    if (removedFavs.length > 0) {
      setShown((prev) => prev.filter((c) => !removedFavs.includes(c)));
      setSpoken((prev) => prev.filter((c) => !removedFavs.includes(c)));
      setTargetLanguages((prev) => prev.filter((c) => !removedFavs.includes(c)));
      targetLanguagesRef.current = targetLanguages.filter((c) => !removedFavs.includes(c));
      if (videoId) {
        saveVideoSettings(videoId, {
          targetLanguages: targetLanguages.filter((c) => !removedFavs.includes(c)),
        });
      }
    }
  };

  const handleResetVideoToFavorites = () => {
    const favs = getFavoriteLanguages();
    if (favs.length > 0) {
      handleTargetLanguagesChange(favs);
      // For any favorite language - by default do checkbox on for both options: present in table & tts-play
      setShown((prev) => Array.from(new Set([...prev, ...favs])));
      setSpoken((prev) => Array.from(new Set([...prev, ...favs])));
      if (isAndroid) {
        void fetchFavoriteLanguageSubtitles(favs);
      }
    }
  };

  const handleSaveCurrentAsFavorites = () => {
    handleUpdateFavoriteLanguages(targetLanguages);
  };
  const [autoSpeakOnFetch, setAutoSpeakOnFetch] = useState<boolean>(() =>
    getAutoSpeakOnFetchSetting(),
  );
  const [speakLanguageNameOnFetch, setSpeakLanguageNameOnFetchState] = useState<boolean>(() =>
    typeof window !== "undefined" ? getSpeakLanguageNameOnFetchSetting() : true,
  );
  const [fetchWindowSeconds, setFetchWindowSecondsState] = useState<number>(() =>
    typeof window !== "undefined" ? getSubtitleFetchWindowSeconds() : 5,
  );
  const [rates, setRates] = useState<Record<string, number>>(() =>
    Object.fromEntries(LANGS.map((lang) => [lang.code, 0.5])),
  );
  const [useAlternativeTtsState, setUseAlternativeTtsState] = useState<boolean>(() =>
    typeof window !== "undefined" ? getUseAlternativeTts() : false,
  );
  const [alternativeTtsModeState, setAlternativeTtsModeState] = useState<AlternativeTtsMode>(() =>
    typeof window !== "undefined" ? getAlternativeTtsMode() : "fallback_only",
  );
  const [lovableTtsProviderState, setLovableTtsProviderState] = useState<LovableTtsProvider>(() =>
    typeof window !== "undefined" ? getLovableTtsProvider() : "lovable",
  );
  const [lovableTtsVoiceState, setLovableTtsVoiceState] = useState<string>(() =>
    typeof window !== "undefined" ? getLovableTtsVoice() : "Kore",
  );
  const [lovableTtsSpeedState, setLovableTtsSpeedState] = useState<number>(() =>
    typeof window !== "undefined" ? getLovableTtsSpeed() : 1.0,
  );
  const [isTestingAlternativeTts, setIsTestingAlternativeTts] = useState<boolean>(false);
  const [openRouterKeyInput, setOpenRouterKeyInput] = useState<string>(() =>
    typeof window !== "undefined" ? getOpenRouterApiKeySetting() : "",
  );
  const [showOpenRouterKey, setShowOpenRouterKey] = useState<boolean>(false);
  const [openRouterKeySaved, setOpenRouterKeySaved] = useState<boolean>(false);
  const [voiceSelections, setVoiceSelections] = useState<Record<string, string>>({});
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("yt_tts_voice_selections_v1") || "{}");
      if (saved && typeof saved === "object") setVoiceSelections(saved);
    } catch {
      // ignore storage errors
    }
  }, []);

  const speakFetchedLanguageName = useCallback(
    (langCode: string) => {
      if (!speakLanguageNameOnFetch) return;
      const langMeta = (isAndroid ? SUPPORTED_LANGUAGES_CATALOG : LANGS).find(
        (c) => c.code === langCode,
      );
      const name = langMeta?.name?.split("(")[0]?.trim() || langCode;
      const rate = rates[langCode] ?? 0.8;
      const voiceURI = voiceSelections[langCode] || "";
      void speak(name, langCode, rate, voiceURI, -1, () => {});
    },
    [speakLanguageNameOnFetch, isAndroid, rates, voiceSelections],
  );

  const handleImportTrackFromPlayground = useCallback(
    (lang: string, json: Json3, rawData: string, setAsTarget = true) => {
      if (videoId) {
        saveCachedRawJson3(videoId, lang, rawData);
      }
      startSubtitlesTransition(() => {
        setTracks((prev) => ({ ...prev, [lang]: json }));
        setShown((prev) => (prev.includes(lang) ? prev : [...prev, lang]));
        if (setAsTarget) {
          setTargetLanguages((prev) => (prev.includes(lang) ? prev : [...prev, lang]));
          setSpoken((prev) => (prev.includes(lang) ? prev : [...prev, lang]));
        }
      });
      speakFetchedLanguageName(lang);
    },
    [videoId, speakFetchedLanguageName],
  );

  const baseLanguage = useMemo(() => {
    if (observedUrl) {
      try {
        const l = new URL(observedUrl).searchParams.get("lang");
        if (l) return l;
      } catch {
        // ignore malformed URL
      }
    }
    if (tracks && Object.keys(tracks).length > 0) {
      return Object.keys(tracks)[0];
    }
    return "";
  }, [observedUrl, tracks]);

  const tracksRef = useRef<Record<string, Json3> | null>(tracks);
  tracksRef.current = tracks;
  const observedUrlRef = useRef(observedUrl);
  observedUrlRef.current = observedUrl;

  const applyCriteriaNow = useCallback(
    (nextCriteria: CriteriaId[], nextSettings: CriteriaGroupSettings = criteriaSettings) => {
      setSelectedCriteria(nextCriteria);
      setCriteriaSettings(nextSettings);
      try {
        localStorage.setItem(
          STORAGE_KEYS.PARSER_CRITERIA_STORAGE_KEY,
          JSON.stringify(nextCriteria),
        );
        localStorage.setItem(
          STORAGE_KEYS.PARSER_SETTINGS_STORAGE_KEY,
          JSON.stringify(nextSettings),
        );
      } catch {
        // ignore storage error
      }
    },
    [criteriaSettings],
  );

  const checkAndApplyCriteria = useCallback(
    (nextCriteria: CriteriaId[], nextSettings: CriteriaGroupSettings = criteriaSettings) => {
      if (!confirmParserDiff || !tracks || !baseLanguage) {
        applyCriteriaNow(nextCriteria, nextSettings);
        return;
      }

      const currentRows = align(tracks, baseLanguage, selectedCriteria, criteriaSettings);
      const proposedRows = align(tracks, baseLanguage, nextCriteria, nextSettings);
      const diff = computeParserDiff(currentRows, proposedRows, baseLanguage);

      if (!diff.hasChanges) {
        applyCriteriaNow(nextCriteria, nextSettings);
        return;
      }

      const proposedNames = nextCriteria.map((c) => {
        const found = PARSER_CRITERIA.find((item) => item.id === c);
        return found ? found.name : c;
      });

      setPendingParserChange({
        criteria: nextCriteria,
        settings: nextSettings,
        criteriaNames: proposedNames,
        diffResult: diff,
      });
    },
    [confirmParserDiff, tracks, baseLanguage, selectedCriteria, criteriaSettings, applyCriteriaNow],
  );

  const handleToggleCriterion = useCallback(
    (id: CriteriaId) => {
      let updated: CriteriaId[];
      if (selectedCriteria.includes(id)) {
        if (selectedCriteria.length <= 1) return;
        updated = selectedCriteria.filter((c) => c !== id);
      } else {
        updated = [...selectedCriteria, id];
      }
      checkAndApplyCriteria(updated, criteriaSettings);
    },
    [selectedCriteria, criteriaSettings, checkAndApplyCriteria],
  );

  const handleApplyPreset = useCallback(
    (presetCriteria: CriteriaId[]) => {
      checkAndApplyCriteria(presetCriteria, criteriaSettings);
    },
    [criteriaSettings, checkAndApplyCriteria],
  );

  const handleResetGroupSettings = useCallback(() => {
    checkAndApplyCriteria(selectedCriteria, DEFAULT_CRITERIA_SETTINGS);
  }, [selectedCriteria, checkAndApplyCriteria]);

  const handleConfirmDiff = useCallback(() => {
    if (pendingParserChange) {
      applyCriteriaNow(
        pendingParserChange.criteria,
        pendingParserChange.settings || criteriaSettings,
      );
      setPendingParserChange(null);
    }
  }, [pendingParserChange, criteriaSettings, applyCriteriaNow]);

  const handleCancelDiff = useCallback(() => {
    setPendingParserChange(null);
  }, []);
  // Single attempt per language per observed URL (no automatic retries, like Youtubenet6)
  const attemptedRef = useRef<Set<string>>(new Set());
  const [failedLangs, setFailedLangs] = useState<string[]>([]);
  const [requestMode, setRequestModeState] = useState<SubtitleRequestMode>("tlang");
  const [attemptOrder, setAttemptOrderState] = useState<FetchAttempt[]>(() => getAttemptOrder());
  const [promoteSuccess, setPromoteSuccessState] = useState<boolean>(() =>
    getPromoteSuccessfulAttempt(),
  );
  const [useFetchServer, setUseFetchServerState] = useState<boolean>(() => getUseFetchServer());
  const [fetchServerUrl, setFetchServerUrlState] = useState<string>(() => getFetchServerUrl());
  const [autoRetrySubtitles, setAutoRetrySubtitlesState] = useState<boolean>(() =>
    getAutoRetrySubtitles(),
  );
  const [retryPacingMinSec, setRetryPacingMinSecState] = useState<number>(() =>
    getRetryPacingMinSec(),
  );
  const [retryPacingMaxSec, setRetryPacingMaxSecState] = useState<number>(() =>
    getRetryPacingMaxSec(),
  );
  const [backgroundAudioEnabled, setBackgroundAudioEnabledState] = useState<boolean>(() =>
    getBackgroundAudioEnabled(),
  );
  const [strategyConfig, setStrategyConfigState] = useState<SubtitleFetchStrategyConfig>(() =>
    typeof window !== "undefined" ? getFetchStrategyConfig() : DEFAULT_FETCH_STRATEGY_CONFIG,
  );

  useEffect(() => {
    // Load device-saved preferences after hydration
    setRequestModeState(getSubtitleRequestMode());
    setSectionOrderState(getSectionOrder());
    setAttemptOrderState(getAttemptOrder());
    setPromoteSuccessState(getPromoteSuccessfulAttempt());
    setUseFetchServerState(getUseFetchServer());
    setFetchServerUrlState(getFetchServerUrl());
    setAutoRetrySubtitlesState(getAutoRetrySubtitles());
    setRetryPacingMinSecState(getRetryPacingMinSec());
    setRetryPacingMaxSecState(getRetryPacingMaxSec());
    setBackgroundAudioEnabledState(getBackgroundAudioEnabled());
    setStrategyConfigState(getFetchStrategyConfig());
  }, []);
  const requestModeRef = useRef(requestMode);
  requestModeRef.current = requestMode;
  const attemptOrderRef = useRef(attemptOrder);
  attemptOrderRef.current = attemptOrder;
  const strategyConfigRef = useRef(strategyConfig);
  strategyConfigRef.current = strategyConfig;
  const promoteSuccessRef = useRef(promoteSuccess);
  promoteSuccessRef.current = promoteSuccess;
  const useFetchServerRef = useRef(useFetchServer);
  useFetchServerRef.current = useFetchServer;
  const fetchServerUrlRef = useRef(fetchServerUrl);
  fetchServerUrlRef.current = fetchServerUrl;
  const targetLanguagesRef = useRef(targetLanguages);
  targetLanguagesRef.current = targetLanguages;

  const handleUpdateAttemptOrder = useCallback((next: FetchAttempt[]) => {
    setAttemptOrder(next);
    setAttemptOrderState(next);
  }, []);

  const handleTogglePromoteSuccess = useCallback((next: boolean) => {
    setPromoteSuccessfulAttempt(next);
    setPromoteSuccessState(next);
  }, []);

  const handleToggleUseFetchServer = useCallback((next: boolean) => {
    setUseFetchServer(next);
    setUseFetchServerState(next);
  }, []);

  const handleUpdateFetchServerUrl = useCallback((next: string) => {
    setFetchServerUrl(next);
    setFetchServerUrlState(next);
  }, []);

  const handleToggleAutoRetry = useCallback((next: boolean) => {
    saveAutoRetrySubtitles(next);
    setAutoRetrySubtitlesState(next);
    subtitleRequestQueue.setPaused(!next);
  }, []);

  const handleUpdatePacingMin = useCallback((next: number) => {
    const val = Math.max(1, next);
    saveRetryPacingMinSec(val);
    setRetryPacingMinSecState(val);
  }, []);

  const handleUpdatePacingMax = useCallback((next: number) => {
    const val = Math.max(1, next);
    saveRetryPacingMaxSec(val);
    setRetryPacingMaxSecState(val);
  }, []);

  const handleToggleBackgroundAudio = useCallback((enabled: boolean) => {
    setBackgroundAudioEnabledState(enabled);
    saveBackgroundAudioEnabled(enabled);
    setNativeBackgroundAudio(enabled);
  }, []);

  const [networkInspectorOpen, setNetworkInspectorOpen] = useState(false);
  const [apkModalOpen, setApkModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const networkRequests = useNetworkRequests();
  const apkReleaseLinks = useMemo(() => getApkReleaseLinks(), []);

  const fetchFavoriteLanguageSubtitles = useCallback(
    async (langsToFetch: string[], baseUrl?: string) => {
      const activeUrl = baseUrl || observedUrlRef.current;
      if (!isAndroid || !activeUrl) return;
      const shell = nativeShell();
      if (!shell) return;
      let defaultLang = "";
      try {
        defaultLang = new URL(activeUrl).searchParams.get("lang") || "";
      } catch (_e) {
        // ignore malformed URL
      }
      const needed = langsToFetch.filter(
        (code) =>
          code &&
          (!defaultLang || code !== defaultLang) &&
          !tracksRef.current?.[code] &&
          !attemptedRef.current.has(`${activeUrl}|${code}`),
      );
      if (needed.length === 0) return;

      // Sort needed strictly according to targetLanguages order
      const currentTargetOrder = targetLanguagesRef.current;
      needed.sort((a, b) => {
        const idxA = currentTargetOrder.indexOf(a);
        const idxB = currentTargetOrder.indexOf(b);
        return (idxA >= 0 ? idxA : 999) - (idxB >= 0 ? idxB : 999);
      });

      needed.forEach((code) => attemptedRef.current.add(`${activeUrl}|${code}`));
      setFailedLangs((prev) => prev.filter((c) => !needed.includes(c)));
      const failed: string[] = [];
      notifySubtitleFetch(
        "fetching",
        `Fetching live subtitles for added favorite language: ${needed.join(", ")}…`,
        needed[0],
      );
      const next: Record<string, Json3> = {};
      for (const code of needed) {
        let json: Json3 | null = null;
        if (videoId) {
          const cachedRaw = getCachedRawJson3(videoId, code);
          if (cachedRaw) {
            const parsed = parseJson3(cachedRaw);
            if (parsed) {
              json = parsed;
              next[code] = json;
              startSubtitlesTransition(() => {
                setTracks((prev) => ({ ...prev, [code]: json! }));
                setShown((prev) => (prev.includes(code) ? prev : [...prev, code]));
              });
              speakFetchedLanguageName(code);
              subtitleRequestQueue.markSucceeded(videoId, code);
              continue;
            }
          }
        }
        await subtitleRequestQueue.enqueue({
          videoId: videoId || "current",
          lang: code,
          execute: async () => {
            try {
              const activeOrder = buildActiveAttemptOrder(
                attemptOrderRef.current,
                strategyConfigRef.current,
              );
              const promote = promoteSuccessRef.current;

              // Reference primary mode order for backward compatibility & preference alignment
              const _modeOrder = subtitleRequestModeOrder(requestModeRef.current);

              const result = runFetchAttempts({
                observedUrl: activeUrl,
                lang: code,
                order: activeOrder,
                send: (url, withSession): ExactFetchResult => {
                  const mode = url.includes("tlang=") ? "tlang" : "lang";
                  const sendMode: SendMode = withSession ? "session" : "anon";
                  const tracker = trackNetworkRequest(url, "GET", "native_bridge", {
                    attemptMode: mode,
                    attemptSend: sendMode,
                  });
                  const r: ExactFetchResult = shell.fetchTimedTextExact
                    ? nativeExactFetch(shell, url, withSession)
                    : {
                        status: 200,
                        body: shell.fetchTranslatedCaptionsWithUrl(url, code, "json3"),
                        sentUrl: url,
                        send: sendMode,
                      };
                  const isGood = r.status === 200 && isValidJsonSubtitleResponse(r.body);
                  if (isGood) {
                    tracker.complete(r.status, r.body);
                  } else {
                    tracker.fail(
                      r.error || (r.status ? `HTTP ${r.status}` : "Fetch failed"),
                      r.status,
                      r.body,
                    );
                  }
                  return r;
                },
                isGood: (body) => isValidJsonSubtitleResponse(body),
              });

              if (result) {
                if (promote) {
                  const promoted = promoteAttempt(activeOrder, result.winner);
                  setAttemptOrder(promoted);
                  setAttemptOrderState(promoted);
                }
                const raw = result.body;
                json = parseJson3(raw);
                if (json) {
                  if (videoId) {
                    saveCachedRawJson3(videoId, code, raw);
                  }
                  recordWinnerPromotion({
                    videoId: videoId || "unknown",
                    lang: code,
                    mode: result.winner.mode,
                    send: result.winner.send,
                    cuesCount: json?.events?.length,
                  });
                  next[code] = json;
                  startSubtitlesTransition(() => {
                    setTracks((prev) => ({ ...prev, [code]: json! }));
                    setShown((prev) => (prev.includes(code) ? prev : [...prev, code]));
                  });
                  speakFetchedLanguageName(code);
                  return true;
                }
              } else if (useFetchServerRef.current && fetchServerUrlRef.current) {
                // Server proxy fallback repetition if enabled
                const fallbackUrl = buildTranslatedCaptionUrl(activeUrl, code, "json3");
                const serverTracker = trackNetworkRequest(fallbackUrl, "GET", "server_proxy", {
                  attemptMode: "tlang",
                  attemptSend: "anon",
                });
                const serverRes = await fetchViaServer(fetchServerUrlRef.current, fallbackUrl);
                if (serverRes.status === 200 && isValidJsonSubtitleResponse(serverRes.body)) {
                  serverTracker.complete(serverRes.status, serverRes.body);
                  json = parseJson3(serverRes.body);
                  if (json) {
                    if (videoId) {
                      saveCachedRawJson3(videoId, code, serverRes.body);
                    }
                    recordWinnerPromotion({
                      videoId: videoId || "unknown",
                      lang: code,
                      mode: "tlang",
                      send: "anon",
                      cuesCount: json?.events?.length,
                    });
                    next[code] = json;
                    startSubtitlesTransition(() => {
                      setTracks((prev) => ({ ...prev, [code]: json! }));
                      setShown((prev) => (prev.includes(code) ? prev : [...prev, code]));
                    });
                    speakFetchedLanguageName(code);
                    return true;
                  }
                } else {
                  serverTracker.fail(
                    serverRes.error || `HTTP ${serverRes.status}`,
                    serverRes.status,
                    serverRes.body,
                  );
                }
              }
              return false;
            } catch (_err) {
              return false;
            }
          },
        });
        if (!json) {
          failed.push(code);
        }
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
      if (failed.length > 0) {
        setFailedLangs((prev) => Array.from(new Set([...prev, ...failed])));
        notifySubtitleFetch(
          "error",
          `Subtitles fetch failed for ${failed.join(", ")}. Tap "Fetch again".`,
          failed[0],
        );
      }
      if (Object.keys(next).length > 0) {
        startSubtitlesTransition(() => {
          setCaptionStatus(`${Object.keys(next).length} live language tracks loaded.`);
        });
        notifySubtitleFetch(
          "completed",
          `Subtitles successfully loaded for ${Object.keys(next).join(", ")}!`,
          Object.keys(next)[0],
        );
        if (autoSpeakOnFetch) {
          // Auto-enable "Speak" checkbox for the fetched languages
          setSpoken((prev) => Array.from(new Set([...prev, ...Object.keys(next)])));
        }
      }
    },
    [isAndroid, autoSpeakOnFetch, videoId, speakFetchedLanguageName],
  );

  const handleFloatingFetchSingleLanguage = useCallback(
    async (code: string) => {
      const activeUrl = observedUrlRef.current;
      if (activeUrl) {
        attemptedRef.current.delete(`${activeUrl}|${code}`);
      }
      setFailedLangs((prev) => prev.filter((c) => c !== code));
      await fetchFavoriteLanguageSubtitles([code]);
    },
    [fetchFavoriteLanguageSubtitles],
  );

  const manualFetchFailed = () => {
    const url = observedUrlRef.current;
    const currentTargetOrder = targetLanguagesRef.current;
    // Determine the exact list of languages to be fetched next, strictly in the order of targetLanguages
    const toFetch = currentTargetOrder.filter(
      (code) =>
        (!tracksRef.current?.[code] || failedLangs.includes(code)) &&
        (!baseLanguage || code !== baseLanguage),
    );
    const finalLangs = toFetch.length > 0 ? toFetch : failedLangs;
    finalLangs.forEach((code) => attemptedRef.current.delete(`${url}|${code}`));
    void fetchFavoriteLanguageSubtitles(finalLangs, url);
  };

  const handleFetchAgain = useCallback(
    async (url: string, withSession: boolean, viaServer: boolean = false) => {
      const shell = nativeShell();
      const shouldUseServer = viaServer || useFetchServerRef.current;
      if (!shell && !shouldUseServer) return;
      let targetLang = "";
      try {
        const u = new URL(url, "https://www.youtube.com");
        targetLang = u.searchParams.get("tlang") || u.searchParams.get("lang") || "";
      } catch {
        const m = /[?&](?:tlang|lang)=([^&#]+)/.exec(url);
        if (m) targetLang = decodeURIComponent(m[1]);
      }
      const mode = url.includes("tlang=") ? "tlang" : "lang";

      let r: ExactFetchResult;
      if (shouldUseServer && fetchServerUrlRef.current) {
        const tracker = trackNetworkRequest(url, "GET", "server_proxy", {
          attemptMode: mode,
          attemptSend: "anon",
        });
        r = await fetchViaServer(fetchServerUrlRef.current, url);
        if (r.status === 200 && isValidJsonSubtitleResponse(r.body)) {
          tracker.complete(r.status, r.body);
        } else {
          tracker.fail(
            r.error || (r.status ? `HTTP ${r.status}` : "Server fetch failed"),
            r.status,
            r.body,
          );
        }
      } else {
        const send: SendMode = withSession ? "session" : "anon";
        const tracker = trackNetworkRequest(url, "GET", "native_bridge", {
          attemptMode: mode,
          attemptSend: send,
        });
        r = shell?.fetchTimedTextExact
          ? nativeExactFetch(shell, url, withSession)
          : {
              status: 200,
              body: shell ? shell.fetchTranslatedCaptionsWithUrl(url, targetLang, "json3") : "",
              sentUrl: url,
              send,
            };
        if (r.status === 200 && isValidJsonSubtitleResponse(r.body)) {
          tracker.complete(r.status, r.body);
        } else {
          tracker.fail(
            r.error || (r.status ? `HTTP ${r.status}` : "Fetch failed"),
            r.status,
            r.body,
          );
        }
      }

      if (r.status === 200 && isValidJsonSubtitleResponse(r.body)) {
        if (targetLang) {
          const parsed = parseJson3(r.body);
          if (parsed) {
            if (videoId) saveCachedRawJson3(videoId, targetLang, r.body);
            setTracks((prev) => ({ ...prev, [targetLang]: parsed }));
            setShown((prev) => (prev.includes(targetLang) ? prev : [...prev, targetLang]));
            notifySubtitleFetch(
              "completed",
              `Fetched live subtitles for ${targetLang}`,
              targetLang,
            );
          }
        }
      } else {
        notifySubtitleFetch("error", `Fetch failed (${r.status || "network error"})`, targetLang);
      }
    },
    [videoId],
  );

  const handleFetchAgainViaServer = useCallback(
    (url: string) => {
      void handleFetchAgain(url, false, true);
    },
    [handleFetchAgain],
  );

  const handleUseTheseSubtitles = useCallback(
    (url: string, rawBody: string) => {
      if (!isValidJsonSubtitleResponse(rawBody)) return;
      let target = "";
      try {
        const u = new URL(url, "https://www.youtube.com");
        target = u.searchParams.get("tlang") || u.searchParams.get("lang") || "";
      } catch {
        const m = /[?&](?:tlang|lang)=([^&#]+)/.exec(url);
        if (m) target = decodeURIComponent(m[1]);
      }
      if (!target) return;
      const json = parseJson3(rawBody);
      if (json) {
        if (videoId) saveCachedRawJson3(videoId, target, rawBody);
        setTracks((prev) => ({ ...prev, [target]: json }));
        setShown((prev) => (prev.includes(target) ? prev : [...prev, target]));
        notifySubtitleFetch("completed", `Applied and cached subtitles for ${target}`, target);
      }
    },
    [videoId],
  );

  const handleTargetLanguagesChange = (newTargetLangs: string[]) => {
    const removedLangs = targetLanguages.filter((l) => !newTargetLangs.includes(l));
    const newlyAdded = newTargetLangs.filter((lang) => !targetLanguages.includes(lang));

    // 1. Immediately prune failedLangs to only those still present in newTargetLangs
    setFailedLangs((prev) => prev.filter((lang) => newTargetLangs.includes(lang)));

    // 2. When favorite languages are removed, remove all related instances:
    // - columns shown
    // - speech synthesis spoken list
    // - parsed subtitle tracks
    // - queue & attempted cache
    // - player instance configs & active player registry
    // - cached subtitle state
    if (removedLangs.length > 0) {
      setShown((prev) => prev.filter((code) => !removedLangs.includes(code)));
      setSpoken((prev) => prev.filter((code) => !removedLangs.includes(code)));
      setTracks((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        removedLangs.forEach((code) => {
          delete next[code];
        });
        return next;
      });

      const currentUrl = observedUrlRef.current;
      removedLangs.forEach((prevLang) => {
        subtitleRequestQueue.removeLanguage(prevLang);
        if (currentUrl) {
          attemptedRef.current.delete(`${currentUrl}|${prevLang}`);
        }
        if (videoId) {
          removeCachedTargetSubtitles(videoId, prevLang);
          removeVideoInstanceConfig(videoId, `lang_${prevLang}`);
        }
        multiVideoPlayerRegistry.unregister(`lang_${prevLang}`);
      });
    }

    setTargetLanguages(newTargetLangs);
    setUserLearningLanguages(newTargetLangs);
    if (videoId) {
      saveVideoSettings(videoId, { targetLanguages: newTargetLangs });
    }
    if (newlyAdded.length > 0) {
      setShown((prev) => Array.from(new Set([...prev, ...newlyAdded])));
      // For any favorite language - by default do checkbox on for both options: present in table & tts-play
      setSpoken((prev) => Array.from(new Set([...prev, ...newlyAdded])));
      if (isAndroid) {
        setCaptionStatus(
          `Fetching live subtitles for added favorite language: ${newlyAdded.join(", ")}…`,
        );
        void fetchFavoriteLanguageSubtitles(newlyAdded);
      } else {
        // Web demo: auto enable "Speak" checkbox upon selection if autoSpeakOnFetch is true
        if (autoSpeakOnFetch) {
          setSpoken((prev) => Array.from(new Set([...prev, ...newlyAdded])));
        }
      }
    }
  };
  const [languageOrder, setLanguageOrder] = useState(() => LANGS.map((lang) => lang.code));
  const [ttsRatios, setTtsRatios] = useState<Record<string, number>>(() => {
    const saved = getTtsRatiosPreference();
    const defaults = Object.fromEntries(LANGS.map((lang) => [lang.code, 1]));
    return { ...defaults, ...saved };
  });

  useEffect(() => {
    if (!videoId) return;
    const settings = loadVideoSettings(videoId);
    if (
      settings?.targetLanguages &&
      Array.isArray(settings.targetLanguages) &&
      settings.targetLanguages.length > 0
    ) {
      const savedLangs = settings.targetLanguages.map((l: unknown) =>
        typeof l === "string" ? l : (l as { code: string }).code,
      );
      setTargetLanguages(savedLangs);
    } else {
      const favs = getFavoriteLanguages();
      if (favs.length > 0) {
        setTargetLanguages(favs);
      }
    }
    if (settings?.ttsRatios) {
      setTtsRatios((curr) => ({
        ...curr,
        ...settings.ttsRatios,
      }));
    }
    if (settings?.ttsRates) {
      setRates((curr) => ({
        ...curr,
        ...settings.ttsRates,
      }));
    }
  }, [videoId]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [theme, setTheme] = useState<Theme>("light");
  const themeWasSelectedRef = useRef(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [pauseMode, setPauseMode] = useState(true);
  const [sectionOrder, setSectionOrderState] = useState<SectionOrder>("video-first");
  const [audioTrackMode, setAudioTrackModeState] = useState(() =>
    typeof window !== "undefined" ? getAudioTrackMode() : false,
  );
  const [activeSwiperIndex, setActiveSwiperIndex] = useState(0);
  const secondaryPlayerHosts = useRef<Map<string, HTMLDivElement>>(new Map());
  const secondaryPlayers = useRef<Map<string, YTPlayerLike>>(new Map());

  const videoInstances = useMemo(() => {
    if (!audioTrackMode) {
      return computeVideoInstances([], LANGS, videoId);
    }
    return computeVideoInstances(spoken, LANGS, videoId);
  }, [audioTrackMode, spoken, videoId]);

  const onAudioTrackModeChange = (enabled: boolean) => {
    setAudioTrackModeState(enabled);
    setAudioTrackMode(enabled);
  };
  const [autoFocus, setAutoFocusState] = useState(() =>
    typeof window !== "undefined" ? getAutoScrollSetting() : false,
  );
  const onAutoFocusChange = (enabled: boolean) => {
    setAutoFocusState(enabled);
    setAutoScrollSetting(enabled);
  };
  const [debugMode, setDebugModeState] = useState(() =>
    typeof window !== "undefined" ? getDebugModeSetting() : true,
  );
  const onDebugModeChange = (enabled: boolean) => {
    setDebugModeState(enabled);
    setDebugModeSetting(enabled);
    if (!enabled) {
      setNetworkInspectorOpen(false);
    }
  };
  const [onDemandTranslations, setOnDemandTranslations] = useState<
    Record<string, Record<number, string>>
  >({});
  const [enableOnDemandTranslation, setEnableOnDemandTranslationState] = useState(() =>
    typeof window !== "undefined" ? getOnDemandTranslationSetting() : true,
  );
  const [onDemandAheadCount, setOnDemandAheadCountState] = useState(() =>
    typeof window !== "undefined" ? getOnDemandTranslationSentencesAhead() : 10,
  );
  const onEnableOnDemandTranslationChange = (enabled: boolean) => {
    setEnableOnDemandTranslationState(enabled);
    setOnDemandTranslationSetting(enabled);
  };
  const onOnDemandAheadCountChange = (count: number) => {
    setOnDemandAheadCountState(count);
    setOnDemandTranslationSentencesAhead(count);
  };
  const [isSetupPaused, setIsSetupPaused] = useState(false);
  const toggleSetupPause = useCallback(() => {
    setIsSetupPaused((prev) => {
      const next = !prev;
      if (next) {
        try {
          multiVideoPlayerRegistry.pauseAllExcept();
          player.current?.pauseVideo?.();
        } catch {
          // ignore
        }
        cancelSpeech();
        busy.current = false;
      }
      return next;
    });
  }, []);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [playbackCurrentTime, setPlaybackCurrentTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isPlayerHovered, setIsPlayerHovered] = useState(false);

  const [showVideoSubtitles, setShowVideoSubtitles] = useState(true);
  const [urlModalLang, setUrlModalLang] = useState<string | null>(null);
  const [expandedTableUrlLang, setExpandedTableUrlLang] = useState<string | null>(null);
  const [tableUrlInputs, setTableUrlInputs] = useState<Record<string, string>>({});
  const [tableFetchStatus, setTableFetchStatus] = useState<
    Record<string, { loading: boolean; message: string | null; type: "info" | "success" | "error" }>
  >({});

  const handleSaveTrackFromUrl = useCallback(
    (langCode: string, track: Json3, url?: string) => {
      setTracks((prev) => ({
        ...(prev || {}),
        [langCode]: track,
      }));
      setShown((prev) => (prev.includes(langCode) ? prev : [...prev, langCode]));
      setTargetLanguages((prev) => (prev.includes(langCode) ? prev : [...prev, langCode]));
      if (videoId) {
        saveCachedRawJson3(videoId, langCode, JSON.stringify(track));
      }
      if (url && url.startsWith("http") && !observedUrl) {
        setObservedUrl(url);
      }
      if (autoSpeakOnFetch) {
        setSpoken((prev) => (prev.includes(langCode) ? prev : [...prev, langCode]));
      }
      notifySubtitleFetch(
        "completed",
        `Subtitles loaded for ${getLanguageMeta(langCode).name}`,
        langCode,
        getLanguageMeta(langCode).name,
      );
    },
    [videoId, observedUrl, autoSpeakOnFetch],
  );

  const handleFetchTableUrl = async (langCode: string, langName: string) => {
    const inputUrl = (tableUrlInputs[langCode] || "").trim();
    if (!inputUrl) return;

    setTableFetchStatus((prev) => ({
      ...prev,
      [langCode]: {
        loading: true,
        message: `Fetching subtitles for ${langName}…`,
        type: "info",
      },
    }));

    try {
      let parsed: Json3 | null = null;
      try {
        const resp = await fetch(inputUrl);
        if (resp.ok) {
          const text = await resp.text();
          parsed = parseJson3(text);
        }
      } catch {
        // Direct fetch failed
      }

      if (!parsed || !isValidJsonSubtitleResponse(parsed)) {
        if (inputUrl.startsWith("http")) {
          const serverUrl =
            (serverConfig as { fetchServerUrl?: string; server_address?: string }).fetchServerUrl ||
            (serverConfig as { fetchServerUrl?: string; server_address?: string }).server_address ||
            "http://localhost:3000/api/proxy";
          const proxyResp = await fetchViaServer(inputUrl, serverUrl);
          if (proxyResp && proxyResp.status === 200 && proxyResp.body) {
            parsed = parseJson3(proxyResp.body);
          }
        }
      }

      if (parsed && isValidJsonSubtitleResponse(parsed)) {
        const cuesCount = parsed.events?.length || 0;
        setTableFetchStatus((prev) => ({
          ...prev,
          [langCode]: {
            loading: false,
            message: `Loaded ${cuesCount} cues for ${langName}!`,
            type: "success",
          },
        }));

        handleSaveTrackFromUrl(langCode, parsed, inputUrl);
      } else {
        setTableFetchStatus((prev) => ({
          ...prev,
          [langCode]: {
            loading: false,
            message: "Invalid YouTube JSON3 subtitles. Expected { events: [...] }.",
            type: "error",
          },
        }));
      }
    } catch (err) {
      setTableFetchStatus((prev) => ({
        ...prev,
        [langCode]: {
          loading: false,
          message: `Error: ${err instanceof Error ? err.message : String(err)}`,
          type: "error",
        },
      }));
    }
  };

  const [panelOrder, setPanelOrder] = useState<PanelId[]>(() => PANELS.map((panel) => panel.id));
  const [openPanels, setOpenPanels] = useState<Record<PanelId, boolean>>({
    player: true,
    playback: false,
    charsRemoval: false,
    parser: false,
    languages: false,
    subtitles: true,
    library: false,
  });

  const [stripSpeakerBrackets, setStripSpeakerBrackets] = useState<boolean>(() =>
    getStripSpeakerBracketsSetting(),
  );
  const [removeChars, setRemoveChars] = useState<string[]>(() => getRemoveCharsSetting());

  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(() =>
    getCachedVideoMetadata(videoId),
  );
  const [videoMetadataModalOpen, setVideoMetadataModalOpen] = useState(false);

  useEffect(() => {
    if (!videoId) {
      setVideoMetadata(null);
      return;
    }
    const cached = getCachedVideoMetadata(videoId);
    if (cached) {
      setVideoMetadata(cached);
    }
    fetchVideoMetadata(videoId)
      .then((meta) => {
        setVideoMetadata(meta);
        if (meta?.title && !meta.title.startsWith("YouTube Video")) {
          updateVideoLibraryTitle(videoId, meta.title);
        }
      })
      .catch(() => {});
  }, [videoId]);

  const handleSelectLibraryVideo = (newId: string, customUrl?: string) => {
    if (!newId || newId === videoId) return;
    cancelSpeech();
    setTracks(null);
    setObservedUrl("");
    setDefaultCaptionsLoaded(false);
    setActive(-1);
    setSpeakingLang(null);
    setSpeakingRow(-1);
    setSpeechProgress(null);
    setPlayedRecordsCount(0);
    playedTtsRecords.current.clear();
    setSubtitlesPage(1);
    setOnDemandTranslations({});
    setDetectedPlaygroundTracks({});
    setVideoId(newId);
    setVideoInput(newId);
    if (typeof window !== "undefined") {
      const currentSearch = new URLSearchParams(window.location.search);
      if (currentSearch.get("v") !== newId) {
        currentSearch.set("v", newId);
        window.history.pushState(
          { videoId: newId },
          "",
          `${window.location.pathname}?${currentSearch.toString()}${window.location.hash}`,
        );
      }
    }
  };

  const previousVideoIdRef = useRef<string>(videoId);

  useEffect(() => {
    const isVideoChanged = previousVideoIdRef.current !== videoId;
    if (isVideoChanged) {
      previousVideoIdRef.current = videoId;
      // Immediately and cleanly reset all state belonging to the previous video
      cancelSpeech();
      startSubtitlesTransition(() => {
        setTracks(null);
        setSubtitlesPage(1);
        setActive(-1);
        setSpeakingLang(null);
        setSpeakingRow(-1);
        setSpeechProgress(null);
        setPlayedRecordsCount(0);
        playedTtsRecords.current.clear();
        setOnDemandTranslations({});
        setDetectedPlaygroundTracks({});
        setObservedUrl("");
        setDefaultCaptionsLoaded(false);
      });
    }

    if (videoId) {
      subtitleRequestQueue.setVideoContext(videoId);
      recordVideoWatch({
        id: videoId,
        originalUrl: `https://www.youtube.com/watch?v=${videoId}`,
      });

      // Cache hydration: Load any previously cached raw JSON3 subtitle tracks for targetLanguages
      const activeLangs = targetLanguagesRef.current;
      const hydratedTracks: Record<string, Json3> = {};
      activeLangs.forEach((lang) => {
        const cachedRaw = getCachedRawJson3(videoId, lang);
        if (cachedRaw) {
          const parsed = parseJson3(cachedRaw);
          if (parsed) {
            hydratedTracks[lang] = parsed;
            subtitleRequestQueue.markSucceeded(videoId, lang);
          }
        }
      });
      if (Object.keys(hydratedTracks).length > 0) {
        startSubtitlesTransition(() => {
          // When video changed, do NOT merge with prev (which belonged to previous video)
          if (isVideoChanged) {
            setTracks(hydratedTracks);
          } else {
            setTracks((prev) => ({ ...(prev || {}), ...hydratedTracks }));
          }
          setShown((prev) => Array.from(new Set([...prev, ...Object.keys(hydratedTracks)])));
        });
      }
    }
  }, [videoId]);

  useEffect(() => {
    if (tracks && videoId) {
      Object.entries(tracks).forEach(([code, track]) => {
        if (track?.events && track.events.length > 0) {
          subtitleRequestQueue.markSucceeded(videoId, code);
        }
      });
    }
  }, [tracks, videoId]);
  const [active, setActive] = useState(-1);
  const [speakingLang, setSpeakingLang] = useState<string | null>(null);
  const [speakingRow, setSpeakingRow] = useState(-1);
  const [speechProgress, setSpeechProgress] = useState<SpeechProgress>(null);
  const [subtitlesLimit, setSubtitlesLimit] = useState<number>(() => (isAndroid ? 10 : 0));
  const [subtitlesPage, setSubtitlesPage] = useState<number>(1);

  const handleTogglePlay = useCallback(() => {
    const p = player.current;
    if (!p) return;
    try {
      const state = p.getPlayerState?.();
      if (state === 1) {
        p.pauseVideo?.();
        setIsVideoPlaying(false);
      } else {
        if (busy.current) {
          cancelSpeech();
          busy.current = false;
        }
        p.playVideo?.();
        setIsVideoPlaying(true);
      }
    } catch (e) {
      console.warn("Toggle play error:", e);
    }
  }, []);

  const handleSeek = useCallback((seconds: number) => {
    const p = player.current;
    if (!p) return;
    try {
      p.seekTo?.(seconds, true);
      setPlaybackCurrentTime(seconds);
      lastMs.current = seconds * 1000;
      handledRow.current = -1;
    } catch (e) {
      console.warn("Seek error:", e);
    }
  }, []);

  const handleRewind = useCallback(
    (seconds = 5) => {
      const p = player.current;
      if (!p?.getCurrentTime) return;
      const cur = p.getCurrentTime();
      handleSeek(Math.max(0, cur - seconds));
    },
    [handleSeek],
  );

  const handleFastForward = useCallback(
    (seconds = 5) => {
      const p = player.current;
      if (!p?.getCurrentTime) return;
      const cur = p.getCurrentTime();
      const dur = p.getDuration?.() || Infinity;
      handleSeek(Math.min(dur, cur + seconds));
    },
    [handleSeek],
  );

  const handlePrevSection = useCallback(() => {
    const p = player.current;
    if (!p?.getCurrentTime) return;
    const curMs = p.getCurrentTime() * 1000;
    const currentRows = st.current.rows;
    if (currentRows.length === 0) return;
    const prevCues = currentRows.filter((r) => r.start < curMs - 1200);
    const targetCue = prevCues.length > 0 ? prevCues[prevCues.length - 1] : currentRows[0];
    if (targetCue) {
      handleSeek(targetCue.start / 1000);
    }
  }, [handleSeek]);

  const handleNextSection = useCallback(() => {
    const p = player.current;
    if (!p?.getCurrentTime) return;
    const curMs = p.getCurrentTime() * 1000;
    const currentRows = st.current.rows;
    if (currentRows.length === 0) return;
    const nextCue = currentRows.find((r) => r.start > curMs + 400);
    if (nextCue) {
      handleSeek(nextCue.start / 1000);
    }
  }, [handleSeek]);

  const handleReplaySection = useCallback(() => {
    const p = player.current;
    if (!p) return;
    const currentRows = st.current.rows;
    if (active >= 0 && currentRows[active]) {
      handleSeek(currentRows[active].start / 1000);
      try {
        p.playVideo?.();
        setIsVideoPlaying(true);
      } catch {
        // ignore
      }
    }
  }, [active, handleSeek]);

  const handleStop = useCallback(() => {
    const p = player.current;
    if (!p) return;
    try {
      cancelSpeech();
      busy.current = false;
      p.pauseVideo?.();
      p.seekTo?.(0, true);
      setIsVideoPlaying(false);
      setPlaybackCurrentTime(0);
    } catch {
      // ignore
    }
  }, []);

  const handleRateChange = useCallback((rate: number) => {
    setPlaybackRate(rate);
    const p = player.current;
    if (!p) return;
    try {
      p.setPlaybackRate?.(rate);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const openLink = (link: string) => {
      const id = parseVideoId(link);
      if (id) {
        console.log("[SHARED_LINK_DISPATCH]", id, link);
        // Persist immediately to video library so shared video is remembered
        recordVideoWatch({
          id,
          originalUrl: link.startsWith("http") ? link : `https://www.youtube.com/watch?v=${id}`,
        });
        setVideoId((prevId) => {
          if (id !== prevId) {
            setTracks(null);
            setObservedUrl("");
            setDefaultCaptionsLoaded(false);
            setActive(-1);
            setSpeakingLang(null);
            setSpeakingRow(-1);
            setSpeechProgress(null);
            cancelSpeech();
            setSubtitlesPage(1);
            if (typeof window !== "undefined") {
              const currentSearch = new URLSearchParams(window.location.search);
              if (currentSearch.get("v") !== id) {
                currentSearch.set("v", id);
                window.history.pushState(
                  { videoId: id },
                  "",
                  `${window.location.pathname}?${currentSearch.toString()}${window.location.hash}`,
                );
              }
            }
          }
          return id;
        });
        setVideoInput(link);
      }
    };
    window.onNativeSharedLinkReceived = openLink;
    if (window.__pendingSharedLink) {
      openLink(window.__pendingSharedLink);
      delete window.__pendingSharedLink;
    }
    const params = new URLSearchParams(window.location.search);
    const query = params.get("v") || params.get("url");
    if (query) openLink(query);

    const appState = getAppStateFromUrl();
    if (appState.openRouterApiKey) {
      setOpenRouterApiKeySetting(appState.openRouterApiKey);
    }
    if (appState.subLang) {
      setBaseLanguage(appState.subLang);
    }
    if (appState.targetLanguages && appState.targetLanguages.length > 0) {
      setTargetLanguages((prev) => {
        const next = [...prev];
        appState.targetLanguages?.forEach((code) => {
          if (!next.includes(code)) next.push(code);
        });
        return next;
      });
      setShown((prev) => {
        const next = [...prev];
        appState.targetLanguages?.forEach((code) => {
          if (!next.includes(code)) next.push(code);
        });
        return next;
      });
    } else if (appState.targetLang) {
      const code = appState.targetLang.toLowerCase().trim();
      setTargetLanguages((prev) => (prev.includes(code) ? prev : [...prev, code]));
      setShown((prev) => (prev.includes(code) ? prev : [...prev, code]));
    }
    if (appState.ttsProvider) {
      const prov = appState.ttsProvider.toLowerCase().trim() as LovableTtsProvider;
      setLovableTtsProvider(prov);
      setLovableTtsProviderState(prov);
    }
    const incomingSubUrl = appState.subUrl || appState.subtitlesUrl;
    if (incomingSubUrl) {
      setObservedUrl(incomingSubUrl);
      const subLang =
        appState.subLang ||
        appState.sourceLangCode ||
        extractLanguageFromSubtitlesUrl(incomingSubUrl) ||
        "en";

      const applyIncomingTrack = (parsed: Json3, rawBody?: string) => {
        if (!isValidJsonSubtitleResponse(parsed)) return;
        setTracks((prev) => ({
          ...(prev || {}),
          [subLang]: parsed,
        }));
        setDefaultCaptionsLoaded(true);
        setShown((prev) => Array.from(new Set([...prev, subLang])));
        const effectiveVid = appState.videoId || videoId;
        if (effectiveVid) {
          saveCachedRawJson3(effectiveVid, subLang, rawBody || JSON.stringify(parsed));
        }
      };

      // 1. Android Native Bridge fetch if available
      const shell = nativeShell();
      if (shell?.fetchTimedTextExact) {
        try {
          const exact = nativeExactFetch(shell, incomingSubUrl, true);
          if (exact.status === 200 && isValidJsonSubtitleResponse(exact.body)) {
            const parsed = parseJson3(exact.body);
            if (parsed) {
              applyIncomingTrack(parsed, exact.body);
              return;
            }
          }
        } catch (_err) {
          // Native bridge fetch error, continue to direct fetch
        }
      }

      // 2. Direct fetch with server proxy fallback
      fetch(incomingSubUrl)
        .then(async (res) => {
          if (!res.ok) return null;
          const text = await res.text();
          return parseJson3(text);
        })
        .then(async (parsed) => {
          if (parsed && isValidJsonSubtitleResponse(parsed)) {
            applyIncomingTrack(parsed);
          } else {
            const serverUrl = getFetchServerUrl();
            if (serverUrl && incomingSubUrl.startsWith("http")) {
              const proxyResp = await fetchViaServer(serverUrl, incomingSubUrl);
              if (proxyResp.status === 200 && isValidJsonSubtitleResponse(proxyResp.body)) {
                const proxyParsed = parseJson3(proxyResp.body);
                if (proxyParsed) {
                  applyIncomingTrack(proxyParsed, proxyResp.body);
                }
              }
            }
          }
        })
        .catch(async (err) => {
          console.warn("[UrlState] Direct fetch error, trying server proxy fallback:", err);
          const serverUrl = getFetchServerUrl();
          if (serverUrl && incomingSubUrl.startsWith("http")) {
            try {
              const proxyResp = await fetchViaServer(serverUrl, incomingSubUrl);
              if (proxyResp.status === 200 && isValidJsonSubtitleResponse(proxyResp.body)) {
                const proxyParsed = parseJson3(proxyResp.body);
                if (proxyParsed) {
                  applyIncomingTrack(proxyParsed, proxyResp.body);
                }
              }
            } catch (proxyErr) {
              console.warn("[UrlState] Server proxy fetch error:", proxyErr);
            }
          }
        });
    } else if (appState.subData) {
      try {
        const decoded = decodeURIComponent(appState.subData);
        const parsed = JSON.parse(decoded);
        if (isValidJsonSubtitleResponse(parsed)) {
          const subLang = appState.subLang || "en";
          setTracks((prev) => ({
            ...(prev || {}),
            [subLang]: parsed,
          }));
          setDefaultCaptionsLoaded(true);
        }
      } catch (err) {
        console.warn("[UrlState] Failed to decode subData:", err);
      }
    }

    const shell = nativeShell();
    if (shell) {
      setIsAndroid(true);
      setSubtitlesLimit(10);
      setSubtitlesPage(1);
    }

    return () => {
      delete window.onNativeSharedLinkReceived;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Android Native Shell and browser history back navigation
  useEffect(() => {
    // 1. Android hardware back button / gesture handler exposed on window
    (window as Window & { __handleAndroidBack?: () => boolean }).__handleAndroidBack = () => {
      if (networkInspectorOpen) {
        setNetworkInspectorOpen(false);
        return true;
      }
      if (apkModalOpen) {
        setApkModalOpen(false);
        return true;
      }
      if (shareModalOpen) {
        setShareModalOpen(false);
        return true;
      }
      return false;
    };

    // 2. Browser history popstate handler (back/forward navigation)
    const handlePopState = (event: PopStateEvent) => {
      if (networkInspectorOpen) {
        setNetworkInspectorOpen(false);
        return;
      }
      if (apkModalOpen) {
        setApkModalOpen(false);
        return;
      }
      if (shareModalOpen) {
        setShareModalOpen(false);
        return;
      }

      const currentParams = new URLSearchParams(window.location.search);
      const urlVideo = currentParams.get("v") || currentParams.get("url");
      const targetId =
        (urlVideo && parseVideoId(urlVideo)) || (event.state?.videoId as string | undefined);
      if (targetId) {
        setVideoId((prevId) => {
          if (targetId !== prevId) {
            setTracks(null);
            setObservedUrl("");
            setDefaultCaptionsLoaded(false);
            setActive(-1);
            setSpeakingLang(null);
            setSpeakingRow(-1);
            setSpeechProgress(null);
            cancelSpeech();
            setSubtitlesPage(1);
            return targetId;
          }
          return prevId;
        });
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      delete (window as Window & { __handleAndroidBack?: () => boolean }).__handleAndroidBack;
      window.removeEventListener("popstate", handlePopState);
    };
  }, [networkInspectorOpen, apkModalOpen, shareModalOpen]);

  useEffect(() => {
    if (!isAndroid) return;
    setTracks(null);
    setObservedUrl("");
    setDefaultCaptionsLoaded(false);
    setActive(-1);
    setSpeakingLang(null);
    setSpeakingRow(-1);
    setSpeechProgress(null);
    cancelSpeech();
    setSubtitlesPage(1);
    setCaptionStatus(
      "Waiting for YouTube captions. Play the video and enable captions if necessary.",
    );
    const shell = nativeShell();
    const captured = shell?.getLastObservedTimedTextUrl();
    if (captured && (!videoId || timedTextVideoId(captured) === videoId)) {
      setObservedUrl(captured);
      setDefaultCaptionsLoaded(true);
      const defaultLang = new URL(captured).searchParams.get("lang") || "";
      if (defaultLang) {
        try {
          const raw = shell!.fetchTranslatedCaptionsWithUrl(captured, defaultLang, "json3");
          if (raw && isValidJsonSubtitleResponse(raw)) {
            const json = parseJson3(raw);
            if (json) {
              if (videoId) {
                saveCachedRawJson3(videoId, defaultLang, raw);
              }
              setTracks((prev) => ({ ...prev, [defaultLang]: json }));
              setShown((prev) => (prev.includes(defaultLang) ? prev : [defaultLang, ...prev]));
            }
          }
        } catch (_e) {
          // ignore native bridge fetch error
        }
      }
    }
    window.onNativeCaptionsInterceptedBase64 = (encoded) => {
      const payload = decodeInterceptedCaption(encoded);
      if (!payload) return;
      const urlVideoId = timedTextVideoId(payload.url);
      if (urlVideoId && urlVideoId !== videoId) return;

      // Discard invalid, non-JSON3, error pages, or empty subtitle payloads
      if (!isValidJsonSubtitleResponse(payload.rawData)) {
        console.warn("[Interception] Discarded non-JSON3 / bad response payload:", payload.url);
        return;
      }

      const tracker = trackNetworkRequest(payload.url, "GET", "timedtext_interception");
      tracker.complete(200, payload.rawData);
      let requestUrl: URL | null = null;
      try {
        requestUrl = new URL(payload.url);
      } catch (_e) {
        // ignore malformed URL
      }
      const targetLanguage = requestUrl?.searchParams.get("tlang") || null;
      const lang = targetLanguage ?? requestUrl?.searchParams.get("lang") ?? null;
      const json = parseJson3(payload.rawData);
      if (!json) return;
      if (!targetLanguage) {
        setObservedUrl(payload.url);
        setDefaultCaptionsLoaded(true);
      }
      if (lang) {
        if (videoId) {
          saveCachedRawJson3(videoId, lang, payload.rawData);
        }
        setTracks((prev) => ({ ...prev, [lang]: json }));
        setShown((prev) => (prev.includes(lang) ? prev : [lang, ...prev]));
        setOpenPanels((prev) => (prev.subtitles ? prev : { ...prev, subtitles: true }));
        if (autoSpeakOnFetch) {
          // Auto-enable "Speak" checkbox for the fetched language
          setSpoken((prev) => (prev.includes(lang) ? prev : [...prev, lang]));
        }
        speakFetchedLanguageName(lang);

        const langMeta = LANGS.find((l) => l.code === lang);
        const cuesCount =
          json.events?.filter((ev) => ev.segs?.some((s) => s.utf8?.trim()))?.length || 0;
        setDetectedPlaygroundTracks((prev) => ({
          ...prev,
          [lang]: {
            lang,
            langName: langMeta?.name || lang,
            json,
            rawData: payload.rawData,
            url: payload.url,
            timestamp: Date.now(),
            cuesCount,
          },
        }));
      }
    };
    return () => {
      delete window.onNativeCaptionsInterceptedBase64;
    };
  }, [isAndroid, videoId, autoSpeakOnFetch, speakFetchedLanguageName]);

  useEffect(() => {
    if (!tracks) return;
    setDetectedPlaygroundTracks((prev) => {
      const updated = { ...prev };
      let hasChanges = false;
      for (const [code, json] of Object.entries(tracks)) {
        if (!updated[code] && json) {
          const langMeta = LANGS.find((l) => l.code === code);
          const cuesCount =
            json.events?.filter((ev) => ev.segs?.some((s) => s.utf8?.trim()))?.length || 0;
          updated[code] = {
            lang: code,
            langName: langMeta?.name || code,
            json,
            rawData: JSON.stringify(json),
            url: "",
            timestamp: Date.now(),
            cuesCount,
          };
          hasChanges = true;
        }
      }
      return hasChanges ? updated : prev;
    });
  }, [tracks]);

  useEffect(() => {
    if (!isAndroid || !observedUrl || !defaultCaptionsLoaded) return;
    let defaultLang = "";
    try {
      defaultLang = new URL(observedUrl).searchParams.get("lang") || "";
    } catch (_e) {
      // ignore malformed URL
    }
    const selected = [...new Set(targetLanguages.filter((code) => Boolean(code)))];
    if (selected.length > 0) {
      setCaptionStatus("Fetching live subtitles for favorite languages…");
      void fetchFavoriteLanguageSubtitles(selected, observedUrl);
    }
  }, [
    isAndroid,
    observedUrl,
    defaultCaptionsLoaded,
    targetLanguages,
    fetchFavoriteLanguageSubtitles,
  ]);

  // Keep shown columns and spoken TTS synchronized with favorite languages by default
  const processedDefaultFavsRef = useRef<Set<string>>(
    new Set([...getInitialFavoriteLanguages(), ...getInitialTargetLanguages()]),
  );
  useEffect(() => {
    const missingInShown = targetLanguages.filter((l) => !shown.includes(l));
    if (missingInShown.length > 0) {
      setShown((prev) => Array.from(new Set([...prev, ...missingInShown])));
    }
    const allFavs = Array.from(new Set([...favoriteLanguages, ...targetLanguages]));
    const newFavsToDefault = allFavs.filter((lang) => !processedDefaultFavsRef.current.has(lang));
    if (newFavsToDefault.length > 0) {
      newFavsToDefault.forEach((l) => processedDefaultFavsRef.current.add(l));
      setShown((prev) => Array.from(new Set([...prev, ...newFavsToDefault])));
      setSpoken((prev) => Array.from(new Set([...prev, ...newFavsToDefault])));
    }
  }, [targetLanguages, favoriteLanguages, shown]);

  useEffect(() => {
    if (themeWasSelectedRef.current) return;
    const saved = window.localStorage.getItem("parallel-subtitles-theme");
    if (saved === "light" || saved === "dark" || saved === "dark-blue") setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove("dark", "dark-blue");
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (theme === "dark-blue") {
      document.documentElement.classList.add("dark", "dark-blue");
    }
    window.localStorage.setItem("parallel-subtitles-theme", theme);
  }, [theme]);

  useEffect(() => {
    setIsHydrated(true);
    // Sync client-persisted preferences post-hydration to eliminate SSR mismatches
    const isAndroidEnvironment =
      Boolean(nativeShell()) ||
      new URLSearchParams(window.location.search).get("android") === "true";
    if (isAndroidEnvironment) {
      setIsAndroid(true);
      setSubtitlesLimit(10);
      setSubtitlesPage(1);
    }
    const savedLangs = getUserLearningLanguages();
    if (savedLangs && savedLangs.length > 0) {
      setTargetLanguages(savedLangs);
      setShown((prev) => Array.from(new Set([...prev, ...savedLangs])));
      setSpoken((prev) => Array.from(new Set([...prev, ...savedLangs])));
    }
    setAudioTrackModeState(getAudioTrackMode());
    setAutoFocusState(getAutoScrollSetting());
    setDebugModeState(getDebugModeSetting());

    // Prevent background pause on visibility changes
    try {
      if (typeof document !== "undefined") {
        Object.defineProperty(document, "hidden", {
          get: () => false,
          configurable: true,
        });
        Object.defineProperty(document, "visibilityState", {
          get: () => "visible",
          configurable: true,
        });
        window.addEventListener("visibilitychange", (e) => e.stopImmediatePropagation(), true);
      }
    } catch (_e) {
      // Ignore in restricted environments
    }
  }, []);

  useEffect(() => {
    const cleanupMedia = initBackgroundMediaManager({
      onPlay: () => {
        try {
          player.current?.playVideo?.();
          setIsVideoPlaying(true);
        } catch (_err) {
          // ignore playback error
        }
      },
      onPause: () => {
        try {
          player.current?.pauseVideo?.();
          setIsVideoPlaying(false);
        } catch (_err) {
          // ignore pause error
        }
      },
      onSeek: (seconds: number) => {
        try {
          player.current?.seekTo?.(seconds, true);
        } catch (_err) {
          // ignore seek error
        }
      },
      onStop: () => {
        try {
          player.current?.stopVideo?.();
        } catch (_err) {
          // ignore stop error
        }
      },
      onNextSection: () => {
        try {
          const p = player.current;
          if (!p?.getCurrentTime) return;
          const currentMs = p.getCurrentTime() * 1000;
          const currentRows = st.current.rows;
          const nextCue = currentRows.find((r) => r.start > currentMs + 500);
          if (nextCue) {
            p.seekTo?.(nextCue.start / 1000, true);
          }
        } catch (_err) {
          // ignore section jump error
        }
      },
      onPrevSection: () => {
        try {
          const p = player.current;
          if (!p?.getCurrentTime) return;
          const currentMs = p.getCurrentTime() * 1000;
          const currentRows = st.current.rows;
          const prevCues = currentRows.filter((r) => r.start < currentMs - 1500);
          const prevCue = prevCues[prevCues.length - 1];
          if (prevCue) {
            p.seekTo?.(prevCue.start / 1000, true);
          } else {
            p.seekTo?.(0, true);
          }
        } catch (_err) {
          // ignore section jump error
        }
      },
    });
    return cleanupMedia;
  }, []);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      !window.speechSynthesis
    ) {
      return;
    }
    const refreshVoices = () => {
      try {
        const raw = window.speechSynthesis.getVoices() || [];
        if (raw.length > 0) {
          const deduped = deduplicateVoices(raw);
          setCachedVoices(deduped);
          setVoices(deduped);
        }
      } catch (_e) {
        // Ignore getVoices errors
      }
    };
    refreshVoices();
    try {
      window.speechSynthesis.onvoiceschanged = refreshVoices;
    } catch (_e) {
      // ignore
    }
    try {
      window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
    } catch (_e) {
      // ignore
    }

    const timer1 = setTimeout(refreshVoices, 250);
    const timer2 = setTimeout(refreshVoices, 1000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      try {
        window.speechSynthesis.removeEventListener("voiceschanged", refreshVoices);
      } catch (_e) {
        // ignore
      }
      try {
        if (window.speechSynthesis.onvoiceschanged === refreshVoices) {
          window.speechSynthesis.onvoiceschanged = null;
        }
      } catch (_e) {
        // ignore
      }
    };
  }, []);

  useEffect(() => {
    // Fixtures exist only for the demo video and only in the web demo. Never load them
    // on Android (the bridge may be detected after first render) or for any other video.
    if (isAndroid || nativeShell() || videoId !== DEMO_VIDEO) return;
    let cancelled = false;
    Promise.all(
      LANGS.map(async (l) => {
        const fixtureUrl = getFixturesUrl(DEMO_VIDEO, l.code);
        const tracker = trackNetworkRequest(fixtureUrl, "GET", "fetch");
        try {
          const response = await fetch(fixtureUrl);
          let text = "";
          let valid = response.ok;
          if (valid) {
            text = await response.text();
            if (text.trim().startsWith("<")) {
              valid = false;
            }
          }
          let j = valid ? parseJson3(text) : null;
          if (!j) {
            // Resilient fallback to authentic bundled fixture
            const bundled = JSON3_RAW_MAP[l.code] || "";
            if (bundled) {
              j = parseJson3(bundled);
              text = bundled;
            }
          }
          tracker.complete(200, text);
          return j ? ([l.code, j] as const) : null;
        } catch {
          const bundled = JSON3_RAW_MAP[l.code] || "";
          const j = bundled ? parseJson3(bundled) : null;
          tracker.complete(200, bundled);
          return j ? ([l.code, j] as const) : null;
        }
      }),
    ).then((entries) => {
      if (cancelled || nativeShell()) return;
      const validEntries = entries.filter(
        (entry): entry is readonly [string, Json3] => entry !== null,
      );
      const newTracks = Object.fromEntries(validEntries);
      startSubtitlesTransition(() => {
        setTracks(newTracks);
        // Automatically show loaded demo tracks
        setShown((prev) => (prev.length === 0 ? Object.keys(newTracks) : prev));
      });
    });
    return () => {
      cancelled = true;
    };
  }, [isAndroid, videoId]);

  const rawRows = useMemo<Row[]>(
    () =>
      tracks && baseLanguage ? align(tracks, baseLanguage, selectedCriteria, criteriaSettings) : [],
    [tracks, baseLanguage, selectedCriteria, criteriaSettings],
  );

  const rows = useMemo<Row[]>(() => {
    if (!rawRows || rawRows.length === 0) return rawRows;
    const hasAnyOnDemand = Object.keys(onDemandTranslations).length > 0;
    if (!hasAnyOnDemand) return rawRows;
    return rawRows.map((r, idx) => {
      let changed = false;
      const texts = { ...r.texts };
      for (const [lang, map] of Object.entries(onDemandTranslations)) {
        if ((!texts[lang] || texts[lang].trim().length === 0) && map[idx]) {
          texts[lang] = map[idx];
          changed = true;
        }
      }
      return changed ? { ...r, texts } : r;
    });
  }, [rawRows, onDemandTranslations]);

  // Clear on-demand translations when full authentic YouTube subtitles arrive for a language
  useEffect(() => {
    if (tracks) {
      Object.keys(tracks).forEach((code) => {
        if (tracks[code]?.events && tracks[code]!.events!.length > 0) {
          clearOnDemandTranslations(videoId, code);
          setOnDemandTranslations((prev) => {
            if (!prev[code]) return prev;
            const next = { ...prev };
            delete next[code];
            return next;
          });
        }
      });
    }
  }, [tracks, videoId]);

  // Translate next X=10 sentences ahead on demand until YouTube timedtext subtitles arrive
  useEffect(() => {
    if (!enableOnDemandTranslation) return;
    if (!videoId || !baseLanguage || !rawRows || rawRows.length === 0) return;

    const pendingLangs = Array.from(
      new Set([...targetLanguages, ...favoriteLanguages, ...spoken, ...shown]),
    ).filter(
      (code) =>
        code !== baseLanguage &&
        (!tracks || !tracks[code] || !tracks[code]?.events || tracks[code]!.events!.length === 0),
    );

    if (pendingLangs.length === 0) return;

    const sourceSentences = rawRows.map((r) => r.texts[baseLanguage] || "");
    const startIndex = Math.max(0, active >= 0 ? active : 0);

    pendingLangs.forEach((targetLang) => {
      translateSentencesAhead({
        videoId,
        fromLang: baseLanguage,
        toLang: targetLang,
        sentences: sourceSentences,
        startIndex,
        sentencesAhead: onDemandAheadCount,
        onSentenceTranslated: (idx, trans) => {
          setOnDemandTranslations((prev) => {
            const lMap = prev[targetLang] || {};
            if (lMap[idx] === trans) return prev;
            return {
              ...prev,
              [targetLang]: {
                ...lMap,
                [idx]: trans,
              },
            };
          });
        },
      }).catch((err) => {
        console.warn(`[OnDemandTranslation] Error translating ahead for ${targetLang}:`, err);
      });
    });
  }, [
    enableOnDemandTranslation,
    videoId,
    baseLanguage,
    rawRows,
    active,
    targetLanguages,
    favoriteLanguages,
    spoken,
    shown,
    tracks,
    onDemandAheadCount,
  ]);

  const activeCatalog = useMemo(() => {
    if (!isAndroid) return LANGS;
    const activeCodes = new Set([
      ...targetLanguages,
      ...shown,
      ...spoken,
      baseLanguage,
      ...(tracks ? Object.keys(tracks) : []),
    ]);
    return Array.from(activeCodes).map(getLanguageMeta);
  }, [isAndroid, targetLanguages, shown, spoken, baseLanguage, tracks]);

  useEffect(() => {
    setLanguageOrder((prev) => {
      const targetSet = new Set([...targetLanguages, ...favoriteLanguages]);
      const remaining = prev.filter((c) => !targetSet.has(c));
      return [...Array.from(targetSet), ...remaining];
    });
  }, [targetLanguages, favoriteLanguages]);

  // Main screen presents favorite languages and intercepted tracks for show/hide, speech toggles, ordering, and per-language TTS controls
  const orderedLangs = useMemo(() => {
    // Collect all active language codes across selections and loaded state
    const activeLanguageCodes = new Set<string>([
      ...targetLanguages,
      ...favoriteLanguages,
      ...shown,
      ...spoken,
      ...(baseLanguage ? [baseLanguage] : []),
      ...(tracks ? Object.keys(tracks) : []),
      ...Object.keys(onDemandTranslations),
      ...(isAndroid ? [] : LANGS.map((l) => l.code)),
    ]);

    const list = languageOrder
      .filter((code) => activeLanguageCodes.has(code))
      .map((code) => getLanguageMeta(code));

    // Append any active languages not yet present in languageOrder
    activeLanguageCodes.forEach((code) => {
      if (!list.some((l) => l.code === code)) {
        list.push(getLanguageMeta(code));
      }
    });

    // Keep clicked / selected favorite languages strictly on top
    const selected = list.filter((l) => targetLanguages.includes(l.code));
    const unselected = list.filter((l) => !targetLanguages.includes(l.code));
    return [...selected, ...unselected];
  }, [
    isAndroid,
    languageOrder,
    targetLanguages,
    favoriteLanguages,
    shown,
    spoken,
    baseLanguage,
    tracks,
    onDemandTranslations,
  ]);
  const st = useRef({
    rows,
    spoken,
    rates,
    ttsRatios,
    voiceSelections,
    pauseMode,
    orderedLangs,
    audioTrackMode,
    sectionOrder,
    isSetupPaused,
    baseLanguage,
  });
  st.current = {
    rows,
    spoken,
    rates,
    ttsRatios,
    voiceSelections,
    pauseMode,
    orderedLangs,
    audioTrackMode,
    sectionOrder,
    isSetupPaused,
    baseLanguage,
  };

  const playerEl = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const busy = useRef(false);
  const lastRow = useRef(-1);
  const handledRow = useRef(-1);
  const lastMs = useRef(0);
  const playedTtsRecords = useRef<Set<number>>(new Set());
  const [playedRecordsCount, setPlayedRecordsCount] = useState(0);

  useEffect(() => {
    playedTtsRecords.current.clear();
    handledRow.current = -1;
    setPlayedRecordsCount(0);
  }, [videoId, rows]);

  const handleSwitchToViewerAtTime = useCallback(
    (timeSec: number) => {
      setActiveTopTab("viewer");
      if (typeof timeSec === "number" && !isNaN(timeSec) && timeSec >= 0) {
        if (player.current && typeof player.current.seekTo === "function") {
          try {
            player.current.seekTo(timeSec, true);
          } catch {
            // ignore seek error
          }
        }
        const targetMs = timeSec * 1000;
        const matchingRowIdx = rows.findIndex((r) => r.start <= targetMs && targetMs <= r.end);
        if (matchingRowIdx >= 0) {
          setActive(matchingRowIdx);
          const rowEl = document.getElementById(`subtitle-row-${matchingRowIdx}`);
          if (rowEl) {
            rowEl.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      }
    },
    [rows],
  );

  const handleApplyPunctuatedBaseTrack = useCallback(
    (punctuatedJson3: Json3, relySolelyOnPunctuation = false) => {
      const activeBase = baseLanguage || "en";
      startSubtitlesTransition(() => {
        setTracks((prev) => ({
          ...(prev || {}),
          [activeBase]: punctuatedJson3,
        }));
        setShown((prev) => (prev.includes(activeBase) ? prev : [...prev, activeBase]));
      });
      if (relySolelyOnPunctuation) {
        setSelectedCriteria(["sentence"]);
        try {
          localStorage.setItem(
            STORAGE_KEYS.PARSER_CRITERIA_STORAGE_KEY,
            JSON.stringify(["sentence"]),
          );
        } catch {
          // ignore
        }
      }
      if (videoId) {
        saveCachedRawJson3(videoId, activeBase, JSON.stringify(punctuatedJson3));
      }
      notifySubtitleFetch(
        "completed",
        relySolelyOnPunctuation
          ? `Applied AI-punctuated subtitles to ${activeBase} & relying solely on punctuation!`
          : `Applied AI-punctuated subtitles to ${activeBase}!`,
        activeBase,
      );
      setActiveTopTab("viewer");
    },
    [baseLanguage, videoId],
  );

  const hasCachedAi = useMemo(
    () => Boolean(videoId && hasCachedAiSubtitles(videoId, baseLanguage || "en")),
    [videoId, baseLanguage],
  );

  const handleLoadCachedAiFromViewer = useCallback(() => {
    if (!videoId) return;
    const cached = getCachedAiSubtitles(videoId, baseLanguage || "en");
    if (cached?.punctuatedJson3) {
      handleApplyPunctuatedBaseTrack(cached.punctuatedJson3, false);
    }
  }, [videoId, baseLanguage, handleApplyPunctuatedBaseTrack]);

  const handleWebDemoLoadVideoAndSubtitles = useCallback(
    ({
      videoId: newVideoId,
      tracks: newTracks,
      observedUrl: newObservedUrl,
    }: {
      videoId: string;
      tracks: Record<string, Json3>;
      observedUrl?: string;
    }) => {
      startSubtitlesTransition(() => {
        const isDifferentVideo = Boolean(newVideoId && newVideoId !== videoId);
        if (isDifferentVideo) {
          setActive(-1);
          setSpeakingLang(null);
          setSpeakingRow(-1);
          setSpeechProgress(null);
          cancelSpeech();
          playedTtsRecords.current.clear();
          setPlayedRecordsCount(0);
          setSubtitlesPage(1);
          setOnDemandTranslations({});
          setDetectedPlaygroundTracks({});
          if (typeof window !== "undefined") {
            const currentSearch = new URLSearchParams(window.location.search);
            if (currentSearch.get("v") !== newVideoId) {
              currentSearch.set("v", newVideoId);
              window.history.pushState(
                { videoId: newVideoId },
                "",
                `${window.location.pathname}?${currentSearch.toString()}${window.location.hash}`,
              );
            }
          }
          setVideoId(newVideoId);
          setVideoInput(newVideoId);
        }

        if (newObservedUrl) {
          setObservedUrl(newObservedUrl);
        } else if (isDifferentVideo) {
          setObservedUrl("");
        }

        const trackLangs = Object.keys(newTracks || {});
        if (trackLangs.length > 0) {
          setDefaultCaptionsLoaded(true);
          // Strictly set tracks to ONLY the new tracks — never merge with previous or default video's tracks
          setTracks(newTracks);
          setShown(trackLangs);
          setTargetLanguages(trackLangs);
          setSpoken(trackLangs);
          setOpenPanels((prev) => ({ ...prev, subtitles: true }));
        } else if (isDifferentVideo) {
          // Reset cleanly when changing video without new subtitle tracks
          setDefaultCaptionsLoaded(false);
          setTracks(null);
          setShown([]);
          setTargetLanguages([]);
          setSpoken([]);
        }
      });
    },
    [videoId],
  );

  const handleSaveLanguageTrackFromModal = useCallback(
    (lang: string, track: Json3, url?: string) => {
      startSubtitlesTransition(() => {
        setTracks((prev) => ({
          ...(prev || {}),
          [lang]: track,
        }));
        setShown((prev) => (prev.includes(lang) ? prev : [...prev, lang]));
        setTargetLanguages((prev) => (prev.includes(lang) ? prev : [...prev, lang]));
        if (url && typeof window !== "undefined") {
          setObservedUrl(url);
        }
      });
    },
    [],
  );

  useEffect(() => {
    const init = () => {
      if (!playerEl.current) return;
      // Fresh host node per init so the YouTube API (which replaces its node) never touches the ref
      playerEl.current.innerHTML = "";
      const host = document.createElement("div");
      host.className = "h-full w-full";
      playerEl.current.appendChild(host);
      if (!window.YT) return;
      player.current = new window.YT.Player(host, {
        videoId,
        playerVars: {
          rel: 0,
          autoplay: isAndroid ? 1 : 0,
          cc_load_policy: isAndroid ? 1 : 0,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            if (player.current) {
              multiVideoPlayerRegistry.register("primary", player.current);
              try {
                const dur = player.current.getDuration?.() ?? 0;
                if (dur > 0) setPlaybackDuration(dur);
                const rate = player.current.getPlaybackRate?.() ?? 1.0;
                if (rate > 0) setPlaybackRate(rate);
                const state = player.current.getPlayerState?.();
                setIsVideoPlaying(state === 1);
                const enriched = enrichMetadataWithPlayer(videoId, player.current);
                if (enriched) setVideoMetadata({ ...enriched });
              } catch {
                // ignore
              }
            }
          },
          onStateChange: (event: { data: number }) => {
            if (event.data === 1) {
              setIsVideoPlaying(true);
            } else if (event.data === 2 || event.data === 0 || event.data === -1) {
              setIsVideoPlaying(false);
            }
          },
        },
      });
      if (player.current) {
        multiVideoPlayerRegistry.register("primary", player.current);
      }
    };
    if (window.YT?.Player) init();
    else {
      window.onYouTubeIframeAPIReady = init;
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(s);
    }
    const iv = setInterval(async () => {
      const p = player.current;
      if (!p?.getCurrentTime || busy.current || st.current.isSetupPaused) return;
      if (activeTopTabRef.current === "playground") return;
      const ms = p.getCurrentTime() * 1000;
      setPlaybackCurrentTime(ms / 1000);
      try {
        const curState = p.getPlayerState?.();
        const curPlaying = curState === 1;
        setIsVideoPlaying((prev) => (prev !== curPlaying ? curPlaying : prev));
        const dur = p.getDuration?.() ?? 0;
        if (dur > 0) {
          setPlaybackDuration((prev) => (prev !== dur ? dur : prev));
        }
      } catch {
        // ignore
      }
      // Detect user manually seeking or scrubbing across playback timeline
      if (Math.abs(ms - lastMs.current) > 2500 || ms < lastMs.current - 1000) {
        handledRow.current = -1;
      }
      lastMs.current = ms;

      // Sync background media metadata & playback progress
      try {
        const title =
          (p.getVideoData && p.getVideoData()?.title) ||
          (videoId ? `YouTube (${videoId})` : "YouTube Video");
        const isPlaying = p.getPlayerState ? p.getPlayerState() === 1 : true;
        const curSec = ms / 1000;
        const durSec = p.getDuration ? p.getDuration() : 0;
        syncMediaMetadata({
          title,
          artist:
            targetLanguagesRef.current && targetLanguagesRef.current.length > 0
              ? `Subtitles: ${targetLanguagesRef.current.join(", ")}`
              : "Parallel Subtitles",
          isPlaying,
          positionSec: curSec,
          durationSec: durSec,
        });
      } catch (_err) {
        // ignore media sync error
      }

      const {
        rows,
        spoken,
        rates,
        ttsRatios: currentTtsRatios,
        voiceSelections,
        pauseMode,
        orderedLangs,
        audioTrackMode: isAudioTrackMode,
        baseLanguage: currentBaseLanguage,
      } = st.current;
      const idx = rows.findIndex((r) => ms >= r.start && ms < r.end);
      setActive(idx);
      const prev = lastRow.current;
      lastRow.current = idx;

      const getEligibleLangs = (rowIdx: number) => {
        if (rowIdx < 0 || playedTtsRecords.current.has(rowIdx)) return [];
        const matched = orderedLangs.filter(
          (l) =>
            spoken.includes(l.code) &&
            isSubtitleInstanceEligibleForTTS(
              rowIdx,
              currentTtsRatios?.[l.code] ?? 1,
              playedTtsRecords.current,
            ),
        );
        if (matched.length > 0) return matched;
        // When audioTrackMode is enabled with no spoken languages selected,
        // fallback to base / primary language so the original video repeats the section with native audio
        if (isAudioTrackMode && spoken.length === 0) {
          const fallbackLang = orderedLangs.find((l) => l.code === currentBaseLanguage) ||
            orderedLangs[0] || { code: "primary", tts: "en-US", name: "Primary" };
          return [fallbackLang];
        }
        // In beginner mode or default playback if spoken list is empty, speak the first available target/base subtitle
        if (spoken.length === 0 && orderedLangs.length > 0) {
          const fallbackLang =
            orderedLangs.find((l) => l.code !== currentBaseLanguage) || orderedLangs[0];
          if (
            fallbackLang &&
            isSubtitleInstanceEligibleForTTS(
              rowIdx,
              currentTtsRatios?.[fallbackLang.code] ?? 1,
              playedTtsRecords.current,
            )
          ) {
            return [fallbackLang];
          }
        }
        return [];
      };

      const speakRow = async (rowIdx: number) => {
        if (rowIdx < 0 || playedTtsRecords.current.has(rowIdx)) return;
        const langs = getEligibleLangs(rowIdx);
        if (langs.length === 0) return;
        // Strictly skip this subtitles record from being TTS-played more than once
        playedTtsRecords.current.add(rowIdx);
        setPlayedRecordsCount(playedTtsRecords.current.size);
        for (const l of langs) {
          if (!busy.current) break;
          setSpeakingLang(l.code);
          setSpeakingRow(rowIdx);
          if (isAudioTrackMode) {
            await executeMultiVideoSegmentSync({
              registry: multiVideoPlayerRegistry,
              primaryPlayer: p,
              languageCode: l.code,
              startMs: rows[rowIdx]?.start ?? 0,
              endMs: rows[rowIdx]?.end ?? 0,
              checkCancelled: () => !busy.current,
              onProgress: (prog) => {
                setSpeechProgress({
                  row: rowIdx,
                  lang: l.code,
                  start: 0,
                  end: Math.round(prog.percent ?? 0),
                });
              },
            });
          } else {
            await speak(
              rows[rowIdx]?.texts[l.code] ?? "",
              l.tts,
              rates[l.code] ?? 0.5,
              voiceSelections[l.code] ?? "",
              rowIdx,
              setSpeechProgress,
            );
          }
        }
        if (isAudioTrackMode) {
          multiVideoPlayerRegistry.pauseAllExcept("primary");
          multiVideoPlayerRegistry.unmuteOnly("primary");
        }
        setSpeakingLang(null);
        setSpeakingRow(-1);
        setSpeechProgress(null);
      };
      const isPlaying = p.getPlayerState() === 1;
      if (pauseMode && st.current.sectionOrder === "tts-first") {
        // Speech first: on entering a section, pause, speak it, then play that section's video.
        if (
          idx >= 0 &&
          isPlaying &&
          !playedTtsRecords.current.has(idx) &&
          handledRow.current !== idx
        ) {
          handledRow.current = idx;
          const eligibleLangs = getEligibleLangs(idx);
          if (eligibleLangs.length > 0) {
            busy.current = true;
            p.pauseVideo();
            await speakRow(idx);
            const wasCancelled = !busy.current;
            busy.current = false;
            handledRow.current = idx;
            if (wasCancelled) return;
            const targetSec = (rows[idx]?.start ?? 0) / 1000;
            lastMs.current = targetSec * 1000;
            multiVideoPlayerRegistry.unmuteOnly("primary");
            p.seekTo(targetSec, true);
            p.playVideo();
          }
        }
        return;
      }
      // Video first: crossed the end of a section while playing → pause and speak it.
      if (pauseMode && isPlaying) {
        const candidateRow =
          prev >= 0 && (idx !== prev || ms >= (rows[prev]?.end ?? Infinity) - 80) ? prev : -1;
        if (
          candidateRow >= 0 &&
          !playedTtsRecords.current.has(candidateRow) &&
          handledRow.current !== candidateRow
        ) {
          handledRow.current = candidateRow;
          const eligibleLangs = getEligibleLangs(candidateRow);
          if (eligibleLangs.length > 0) {
            busy.current = true;
            p.pauseVideo();
            await speakRow(candidateRow);
            busy.current = false;
            handledRow.current = candidateRow;
            const nextRowIdx = candidateRow + 1;
            if (nextRowIdx < rows.length && rows[nextRowIdx]) {
              const nextRow = rows[nextRowIdx];
              const resumeTarget = nextRow.start / 1000;
              lastMs.current = resumeTarget * 1000;
              lastRow.current = nextRowIdx;
              setActive(nextRowIdx);
              multiVideoPlayerRegistry.unmuteOnly("primary");
              p.seekTo(resumeTarget, true);
              p.playVideo();
            } else {
              multiVideoPlayerRegistry.unmuteOnly("primary");
              p.pauseVideo();
            }
          }
        }
      }
    }, 150);
    return () => {
      clearInterval(iv);
      cancelSpeech();
      multiVideoPlayerRegistry.unregister("primary");
      player.current?.destroy?.();
      player.current = null;
    };
  }, [videoId, isAndroid, workflowMode]);

  // Mount and manage dedicated video player instances for each language with speak/audio enabled
  useEffect(() => {
    if (!audioTrackMode) return;
    for (const inst of videoInstances) {
      if (inst.isPrimary) continue;
      const host = secondaryPlayerHosts.current.get(inst.id);
      if (host && !secondaryPlayers.current.has(inst.id)) {
        host.innerHTML = "";
        const child = document.createElement("div");
        child.className = "h-full w-full";
        host.appendChild(child);
        let secPlayer: YTPlayerLike | null = null;
        if (window.YT?.Player) {
          secPlayer = new window.YT.Player(child, {
            videoId,
            playerVars: {
              rel: 0,
              autoplay: 0,
              cc_load_policy: 0,
              playsinline: 1,
            },
            events: {
              onReady: () => {
                try {
                  secPlayer?.mute?.();
                } catch {
                  // ignore
                }
              },
            },
          });
        }
        if (secPlayer) {
          secondaryPlayers.current.set(inst.id, secPlayer);
          multiVideoPlayerRegistry.register(inst.id, secPlayer);
        }
      }
    }
  }, [audioTrackMode, videoInstances, videoId]);

  // Keep swiper active index synced to active speaking language when repeating with audio track
  useEffect(() => {
    if (!audioTrackMode) return;
    if (speakingLang) {
      const idx = videoInstances.findIndex((inst) => inst.languageCode === speakingLang);
      if (idx >= 0) setActiveSwiperIndex(idx);
    } else {
      setActiveSwiperIndex(0);
    }
  }, [speakingLang, audioTrackMode, videoInstances]);

  // Track user interaction with the page to prevent automated scrolling from interrupting user actions
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onUserInteraction = () => {
      recordUserInteraction(Date.now());
    };

    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "wheel",
      "touchstart",
      "pointerdown",
      "scroll",
    ] as const;

    events.forEach((evt) => {
      window.addEventListener(evt, onUserInteraction, { passive: true });
    });

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, onUserInteraction);
      });
    };
  }, []);

  useEffect(() => {
    if (!autoFocus || isSetupPaused) return;
    if (active < 0) return;

    // Start auto-scroll ONLY after 5 seconds since the last user interaction with the page
    if (!isAutoScrollAllowed()) {
      const remainingMs = Math.max(
        100,
        AUTO_SCROLL_COOLDOWN_MS - (Date.now() - getLastUserInteractionTimestamp()),
      );
      const timer = setTimeout(() => {
        if (autoFocus && !isSetupPaused && isAutoScrollAllowed()) {
          document
            .querySelector(`[data-row="${active}"]`)
            ?.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      }, remainingMs);
      return () => clearTimeout(timer);
    }

    document
      .querySelector(`[data-row="${active}"]`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [active, autoFocus, isSetupPaused]);

  const seek = (r: Row, i: number) => {
    cancelSpeech();
    busy.current = false;
    lastRow.current = i;
    handledRow.current = -1;
    playedTtsRecords.current.delete(i);
    lastMs.current = r.start;
    setActive(i);
    player.current?.seekTo(r.start / 1000, true);
    player.current?.playVideo();
  };

  const toggle = (list: string[], set: (v: string[]) => void, c: string) =>
    set(list.includes(c) ? list.filter((x) => x !== c) : [...list, c]);

  const moveLanguage = (code: string, direction: -1 | 1) => {
    setLanguageOrder((current) => {
      const index = current.indexOf(code);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[next]] = [copy[next]!, copy[index]!];
      return copy;
    });

    setTargetLanguages((current) => {
      if (!current.includes(code)) return current;
      const index = current.indexOf(code);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[next]] = [copy[next]!, copy[index]!];
      setUserLearningLanguages(copy);
      return copy;
    });
  };

  const movePanel = (id: PanelId, direction: -1 | 1) => {
    setPanelOrder((current) => {
      const index = current.indexOf(id);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= current.length) return current;
      const copy = [...current];
      const adjacent = copy[next];
      if (!adjacent) return current;
      copy[index] = adjacent;
      copy[next] = id;
      return copy;
    });
  };

  const cols = useMemo(() => {
    if (!tracks || Object.keys(tracks).length === 0) {
      return [];
    }
    const list: { code: string; name: string; tts: string }[] = [];
    const addedCodes = new Set<string>();

    const hasTrackCues = (t: Json3 | undefined): boolean => {
      if (!t) return false;
      if (typeof t.length === "number" && t.length > 0) return true;
      if (Array.isArray(t.events) && t.events.length > 0) return true;
      if (Array.isArray(t) && (t as unknown[]).length > 0) return true;
      return false;
    };

    const hasOnDemandCues = (code: string): boolean => {
      const m = onDemandTranslations[code];
      return Boolean(m && Object.keys(m).length > 0);
    };

    // 1. If baseLanguage from video captions exists in tracks, display it first
    // Spec: verify base track cues (tracks[baseLanguage].length > 0 || hasTrackCues)
    if (baseLanguage && tracks?.[baseLanguage] && hasTrackCues(tracks[baseLanguage])) {
      list.push(getLanguageMeta(baseLanguage));
      addedCodes.add(baseLanguage);
    }

    // 2. Add all ordered languages that are shown in the table
    // Spec: include any shown languages from targetLanguages, favoriteLanguages, loaded tracks (tracks[l.code].length > 0 || hasTrackCues), or on-demand translations
    for (const l of orderedLangs) {
      if (
        !addedCodes.has(l.code) &&
        shown.includes(l.code) &&
        (targetLanguages.includes(l.code) ||
          favoriteLanguages.includes(l.code) ||
          (tracks ? Boolean(tracks[l.code]) : true) ||
          hasOnDemandCues(l.code))
      ) {
        list.push(l);
        addedCodes.add(l.code);
      }
    }

    // 3. Fallback: add any remaining tracks present in shown
    // Spec: verify fallback track cues (tracks[code]?.length > 0 || hasTrackCues)
    if (tracks) {
      for (const code of Object.keys(tracks)) {
        if (!addedCodes.has(code) && shown.includes(code) && hasTrackCues(tracks[code])) {
          list.push(getLanguageMeta(code));
          addedCodes.add(code);
        }
      }
    }

    // 4. Ultimate fallback: if no columns matched shown filter yet tracks exist with cues, include them
    if (list.length === 0 && tracks) {
      for (const code of Object.keys(tracks)) {
        if (!addedCodes.has(code) && hasTrackCues(tracks[code])) {
          list.push(getLanguageMeta(code));
          addedCodes.add(code);
        }
      }
    }

    return list;
  }, [
    tracks,
    baseLanguage,
    orderedLangs,
    shown,
    targetLanguages,
    favoriteLanguages,
    onDemandTranslations,
  ]);

  const hasLegitimateSubtitles = useMemo(() => {
    if (!tracks) return false;
    const hasValidTrack = Object.values(tracks).some((track) => {
      const cues = Array.isArray(track) ? track : track?.events || [];
      const isValid =
        (Array.isArray(cues) && cues.length > 0) ||
        (Array.isArray(track?.events) && track.events.length > 0);
      return isValid;
    });
    return Boolean(hasValidTrack && rows.length > 0 && cols.length > 0);
  }, [tracks, rows.length, cols.length]);

  useEffect(() => {
    if (hasLegitimateSubtitles) {
      setOpenPanels((current) => (current.subtitles ? current : { ...current, subtitles: true }));
    }
  }, [hasLegitimateSubtitles]);

  const missingFavoriteLanguages = useMemo(() => {
    return targetLanguages.filter((code) => !tracks?.[code]);
  }, [targetLanguages, tracks]);

  const allFavoritesAligned = useMemo(() => {
    return targetLanguages.length > 0 && missingFavoriteLanguages.length === 0;
  }, [targetLanguages, missingFavoriteLanguages]);

  const languagesToFetchNext = useMemo(() => {
    return targetLanguages.filter(
      (code) =>
        (!tracks?.[code] || failedLangs.includes(code)) && (!baseLanguage || code !== baseLanguage),
    );
  }, [targetLanguages, tracks, failedLangs, baseLanguage]);

  const activeFailedToFetch = useMemo(() => {
    return targetLanguages.filter((code) => failedLangs.includes(code));
  }, [targetLanguages, failedLangs]);

  const displayedRows = useMemo(() => {
    if (isAndroid && subtitlesLimit > 0) {
      const start = (subtitlesPage - 1) * subtitlesLimit;
      return rows.slice(start, start + subtitlesLimit);
    }
    return rows;
  }, [rows, isAndroid, subtitlesLimit, subtitlesPage]);

  useEffect(() => {
    const currentActive = active >= 0 ? active : speakingRow;
    if (isAndroid && autoFocus && !isSetupPaused && active >= 0 && subtitlesLimit > 0) {
      const targetPage = Math.floor(currentActive / subtitlesLimit) + 1;
      if (targetPage !== subtitlesPage) {
        setSubtitlesPage(targetPage);
      }
    }
  }, [active, speakingRow, isSetupPaused, autoFocus, isAndroid, subtitlesLimit, subtitlesPage]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header
        className="flex flex-wrap items-center gap-4 border-b border-border px-6 py-4"
        data-app-hydrated={isHydrated ? "true" : undefined}
      >
        <div className="mr-auto flex items-baseline gap-3 flex-wrap">
          <h1 className="font-display text-2xl">Parallel Subtitles</h1>
          <a
            href={ALL_RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="header-app-version-badge"
            className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-mono font-medium text-primary hover:bg-primary/20 transition-colors"
            title={`${APP_VERSION_DESCRIPTION} (Commit #${APP_COMMIT_ID})`}
          >
            <span>v{APP_VERSION}</span>
            <span className="opacity-70 text-[10px]">#{APP_COMMIT_ID}</span>
            <ExternalLink className="h-2.5 w-2.5 opacity-70" />
          </a>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              handleWorkflowModeChange(workflowMode === "beginner" ? "expert" : "beginner")
            }
            className={`h-6 px-2 text-[11px] font-medium rounded-full border flex items-center gap-1 transition-all ${
              workflowMode === "beginner"
                ? "bg-emerald-950/40 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900/50"
                : "bg-indigo-950/40 text-indigo-300 border-indigo-700/60 hover:bg-indigo-900/50"
            }`}
            data-testid="header-mode-toggle"
            title={
              workflowMode === "beginner"
                ? "Switch to Advanced Studio (Full Controls)"
                : "Switch to Guided Beginner Mode"
            }
          >
            {workflowMode === "beginner" ? (
              <>
                <SlidersHorizontal className="h-3 w-3 text-emerald-400" />
                <span>To Advanced Studio</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 text-indigo-400" />
                <span>To Beginner Mode</span>
              </>
            )}
          </Button>
          <span className="text-sm text-muted-foreground">
            video {videoId} · {rows.length} sections ·{" "}
            {isAndroid
              ? "live Android captions"
              : videoId === DEMO_VIDEO
                ? "[Fixture: L2Ryrr6txwA] (Approved Web Demo Fixture)"
                : "live captions"}
          </span>
        </div>

        {workflowMode === "expert" && (
          <div
            id="top-tabs-nav"
            data-testid="top-tabs-nav"
            className="flex items-center rounded-lg border border-border bg-card p-1 shadow-sm"
            role="tablist"
            aria-label="App Navigation Tabs"
          >
            <button
              id="tab-viewer"
              data-testid="tab-viewer"
              role="tab"
              aria-selected={activeTopTab === "viewer"}
              type="button"
              onClick={() => setActiveTopTab("viewer")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTopTab === "viewer"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" />
              <span>Parallel Viewer</span>
            </button>
            <button
              id="tab-playground"
              data-testid="tab-playground"
              role="tab"
              aria-selected={activeTopTab === "playground"}
              type="button"
              onClick={() => {
                setActiveTopTab("playground");
                cancelSpeech();
                try {
                  player.current?.pauseVideo?.();
                } catch {
                  // ignore
                }
              }}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTopTab === "playground"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Tv className="h-3.5 w-3.5" />
              <span>Playground</span>
              {Object.keys(detectedPlaygroundTracks).length > 0 && (
                <span className="rounded-full bg-primary-foreground/20 px-1.5 py-0.2 text-[10px] font-mono font-bold">
                  {Object.keys(detectedPlaygroundTracks).length}
                </span>
              )}
            </button>
            <button
              id="tab-ai-punctuation"
              data-testid="tab-ai-punctuation"
              role="tab"
              aria-selected={activeTopTab === "ai-punctuation"}
              type="button"
              onClick={() => {
                setActiveTopTab("ai-punctuation");
                cancelSpeech();
                try {
                  player.current?.pauseVideo?.();
                } catch {
                  // ignore
                }
              }}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTopTab === "ai-punctuation"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI Punctuation</span>
              {hasCachedAi && (
                <span
                  data-testid="tab-ai-cached-indicator"
                  className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold"
                  title="Cached AI subtitles available"
                >
                  Cached
                </span>
              )}
            </button>
          </div>
        )}

        <div
          className="flex items-center gap-1 rounded-md border border-border bg-card p-1"
          aria-label="Color theme"
        >
          {(["light", "dark", "dark-blue"] as const).map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={theme === option ? "default" : "ghost"}
              onClick={() => {
                themeWasSelectedRef.current = true;
                setTheme(option);
              }}
              className="capitalize"
            >
              {option.replace("-", " ")}
            </Button>
          ))}
        </div>

        {!isAndroid && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setNetworkInspectorOpen(true)}
            className="gap-1.5"
            title="Inspect captured network requests"
          >
            <Activity className="h-4 w-4 text-blue-500" />
            <span className="hidden sm:inline">Network</span>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-mono font-bold">
              {networkRequests.length}
            </span>
          </Button>
        )}
        <Button
          id="caption-toggle-button"
          data-testid="caption-toggle-button"
          type="button"
          size="sm"
          variant={showVideoSubtitles ? "default" : "outline"}
          aria-pressed={showVideoSubtitles}
          onClick={() => {
            const next = !showVideoSubtitles;
            setShowVideoSubtitles(next);
            if (next) {
              setOpenPanels((prev) => (prev.subtitles ? prev : { ...prev, subtitles: true }));
              const shell = nativeShell();
              const captured = shell?.getLastObservedTimedTextUrl();
              if (captured && (!tracks || Object.keys(tracks).length === 0)) {
                setObservedUrl(captured);
                setDefaultCaptionsLoaded(true);
                let defaultLang = "";
                try {
                  defaultLang = new URL(captured).searchParams.get("lang") || "";
                } catch {
                  // ignore malformed url
                }
                if (defaultLang && shell) {
                  try {
                    const raw = shell.fetchTranslatedCaptionsWithUrl(
                      captured,
                      defaultLang,
                      "json3",
                    );
                    if (raw && isValidJsonSubtitleResponse(raw)) {
                      const json = parseJson3(raw);
                      if (json) {
                        setTracks((prev) => ({ ...prev, [defaultLang]: json }));
                        setShown((prev) =>
                          prev.includes(defaultLang) ? prev : [defaultLang, ...prev],
                        );
                      }
                    }
                  } catch {
                    // ignore fetch error
                  }
                }
              }
            }
          }}
          className="gap-1.5"
          title="Toggle video subtitles"
        >
          <Subtitles className="h-4 w-4" />
          <span className="hidden sm:inline">Captions</span>
        </Button>
        <Button
          id="open-apk-release-button"
          data-testid="open-apk-release-button"
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setApkModalOpen(true)}
          className="gap-1.5 border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          title="Download latest APK release (mostuf2556 & mostuf25561)"
        >
          <Smartphone className="h-4 w-4 text-emerald-500" />
          <span className="hidden sm:inline">Latest APK</span>
        </Button>
        <Button
          id="open-share-modal-button"
          data-testid="open-share-modal-button"
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setShareModalOpen(true)}
          className="gap-1.5 border-primary/40 hover:bg-primary/10 text-primary"
          title="Share application state with default subtitles, OpenRouter key, and target language"
        >
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">Share</span>
        </Button>
      </header>

      {/* Mode Switcher Header: Toggle between Guided Beginner Mode & Advanced Studio */}
      <ModeSwitcherHeader currentMode={workflowMode} onModeChange={handleWorkflowModeChange} />

      {workflowMode === "beginner" ? (
        <BeginnerFlowContainer
          url={videoInput || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : "")}
          videoId={videoId}
          onUrlChange={(newUrl) => setVideoInput(newUrl)}
          onSubmitUrl={(submittedUrl) => {
            const parsed = parseVideoId(submittedUrl);
            const newId = parsed || submittedUrl.trim();
            handleSelectLibraryVideo(newId, submittedUrl);
          }}
          observedUrl={observedUrl}
          rawTracks={tracks || {}}
          currentTime={playbackCurrentTime}
          isPlaying={isVideoPlaying}
          onTogglePlay={handleTogglePlay}
          onSeek={handleSeek}
          onLoadSampleSubtitles={() => {
            const validEntries = Object.entries(JSON3_RAW_MAP)
              .map(([code, raw]) => {
                const j = parseJson3(raw);
                return j ? ([code, j] as const) : null;
              })
              .filter((entry): entry is [string, Json3] => entry !== null);
            setTracks(Object.fromEntries(validEntries));
            setObservedUrl("https://www.youtube.com/api/timedtext?v=L2Ryrr6txwA&lang=en&fmt=json3");
          }}
          isAndroidNative={isAndroid}
          playerSlot={
            <div
              className="relative h-full w-full group"
              onMouseEnter={() => setIsPlayerHovered(true)}
              onMouseLeave={() => setIsPlayerHovered(false)}
            >
              <div ref={playerEl} className="h-full w-full" />
              <div
                data-testid="video-overlay-play-pause-container"
                className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 pointer-events-none ${
                  !isVideoPlaying || isPlayerHovered ? "opacity-100" : "opacity-0"
                }`}
              >
                <button
                  type="button"
                  data-testid="video-overlay-play-pause-btn"
                  aria-label={isVideoPlaying ? "Pause video" : "Play video"}
                  title={isVideoPlaying ? "Pause video" : "Play video"}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTogglePlay();
                  }}
                  className="pointer-events-auto flex items-center justify-center h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-black/65 hover:bg-black/85 text-white shadow-2xl backdrop-blur-sm border-2 border-white/30 transition-transform active:scale-95 hover:scale-105"
                >
                  {isVideoPlaying ? (
                    <Pause className="h-8 w-8 sm:h-10 sm:w-10 fill-current" />
                  ) : (
                    <Play className="h-8 w-8 sm:h-10 sm:w-10 fill-current ml-1" />
                  )}
                </button>
              </div>
            </div>
          }
          playbackControlsSlot={
            <VideoPlaybackControls
              isPlaying={isVideoPlaying}
              currentTimeSec={playbackCurrentTime}
              durationSec={playbackDuration}
              playbackRate={playbackRate}
              activeSectionIndex={active}
              totalSections={rows.length}
              isPausedForSpeech={Boolean(speakingLang)}
              speakingLangName={
                speakingLang
                  ? (LANGS.find((l) => l.code === speakingLang)?.name ?? speakingLang.toUpperCase())
                  : undefined
              }
              onTogglePlay={handleTogglePlay}
              onSeek={handleSeek}
              onRewind={(sec = 5) => handleSeek(Math.max(0, playbackCurrentTime - sec))}
              onFastForward={(sec = 5) =>
                handleSeek(Math.min(playbackDuration, playbackCurrentTime + sec))
              }
              onPrevSection={() => {
                const prevIdx = active > 0 ? active - 1 : 0;
                if (rows[prevIdx]) {
                  seek(rows[prevIdx], prevIdx);
                }
              }}
              onNextSection={() => {
                const nextIdx = active < rows.length - 1 ? active + 1 : rows.length - 1;
                if (rows[nextIdx]) {
                  seek(rows[nextIdx], nextIdx);
                }
              }}
              onReplaySection={() => {
                if (active >= 0 && rows[active]) {
                  seek(rows[active], active);
                }
              }}
              onStop={() => {
                try {
                  player.current?.pauseVideo();
                  player.current?.seekTo(0, true);
                  setIsVideoPlaying(false);
                } catch {
                  // ignore
                }
              }}
              onRateChange={(rate) => {
                try {
                  player.current?.setPlaybackRate?.(rate);
                  setPlaybackRate(rate);
                } catch {
                  // ignore
                }
              }}
            />
          }
          webDemoUrlsSlot={
            !isAndroid ? (
              <WebDemoUrlsInput
                currentVideoId={videoId}
                observedUrl={observedUrl}
                onLoadVideoAndSubtitles={handleWebDemoLoadVideoAndSubtitles}
                className="max-w-2xl mx-auto"
              />
            ) : undefined
          }
          hasSubtitles={hasLegitimateSubtitles && rows.length > 0}
          onOrderChange={(newOrder) => {
            const prefOrder = newOrder === "tts-first" ? "tts-first" : "video-first";
            setSectionOrderState(prefOrder);
            saveSectionOrder(prefOrder);
          }}
          onTtsSpeedChange={(newSpeed) => {
            setRates((prev) => {
              const updated = { ...prev };
              Object.keys(updated).forEach((k) => {
                updated[k] = newSpeed;
              });
              return updated;
            });
          }}
          onTtsVoiceChange={(voiceURI) => {
            if (baseLanguage) {
              setVoiceSelections((prev) => ({ ...prev, [baseLanguage]: voiceURI }));
            }
          }}
          onSubtitlesRatioChange={(ratio) => {
            setTtsRatios((prev) => {
              const updated = { ...prev };
              Object.keys(updated).forEach((k) => {
                updated[k] = ratio;
              });
              return updated;
            });
          }}
          onFavoriteLanguagesChange={(newFavs) => {
            handleUpdateFavoriteLanguages(newFavs);
          }}
          onBaseLangChange={(lang) => {
            if (!spoken.includes(lang)) {
              setSpoken((prev) => [...prev, lang]);
            }
          }}
          onSpeakCue={(text, lang) => {
            const rate = rates[lang] ?? 0.8;
            const voice = voiceSelections[lang] || "";
            void speak(text, lang, rate, voice, -1, () => {});
          }}
          speakingLang={speakingLang}
          onSwitchToAdvanced={() => handleWorkflowModeChange("expert")}
          subtitlesTableSlot={
            <SubtitlesTablePanel
              isAndroid={isAndroid}
              rows={rows}
              displayedRows={displayedRows}
              cols={cols}
              subtitlesLimit={subtitlesLimit}
              setSubtitlesLimit={setSubtitlesLimit}
              subtitlesPage={subtitlesPage}
              setSubtitlesPage={setSubtitlesPage}
              active={active}
              allFavoritesAligned={allFavoritesAligned}
              targetLanguages={targetLanguages}
              speechProgress={speechProgress}
              tracks={tracks}
              onSeek={seek}
              spokenLangs={spoken}
              ttsRatios={ttsRatios}
              hasCachedAi={hasCachedAi}
              onLoadCachedAiSubtitles={handleLoadCachedAiFromViewer}
              onSpeakCue={(text, lang) => {
                const rate = rates[lang] ?? 0.8;
                const voice = voiceSelections[lang] || "";
                void speak(text, lang, rate, voice, -1, () => {});
              }}
            />
          }
        />
      ) : (
        <>
          {activeTopTab === "playground" ? (
            <VideoPlayground
              videoId={videoId}
              onVideoIdChange={(newId) => {
                if (newId !== videoId) {
                  setTracks(null);
                  setObservedUrl("");
                  setDefaultCaptionsLoaded(false);
                  setActive(-1);
                  setSpeakingLang(null);
                  setSpeakingRow(-1);
                  setSpeechProgress(null);
                  cancelSpeech();
                }
                setVideoId(newId);
                setVideoInput(newId);
              }}
              detectedTracks={detectedPlaygroundTracks}
              onImportTrack={handleImportTrackFromPlayground}
              existingTrackLanguages={Object.keys(tracks || {})}
              onSwitchToViewerTab={() => setActiveTopTab("viewer")}
              onSwitchToViewerAtTime={handleSwitchToViewerAtTime}
              isAndroid={isAndroid}
              observedUrl={observedUrl}
            />
          ) : activeTopTab === "ai-punctuation" ? (
            <AiSubtitlePunctuationTab
              rawJson3={tracks && baseLanguage ? tracks[baseLanguage] : null}
              baseLanguage={baseLanguage || "en"}
              onApplyPunctuatedTrack={handleApplyPunctuatedBaseTrack}
              onSwitchToViewer={() => setActiveTopTab("viewer")}
              videoId={videoId}
              isSolelyPunctuationActive={
                selectedCriteria.length === 1 && selectedCriteria[0] === "sentence"
              }
              onRevertCriteria={() => setSelectedCriteria(DEFAULT_PARSER_CRITERIA)}
            />
          ) : (
            <>
              <div className="px-4 pt-4 md:px-6 md:pt-6">
                {!isAndroid ? (
                  <WebDemoUrlsInput
                    currentVideoId={videoId}
                    observedUrl={observedUrl}
                    onLoadVideoAndSubtitles={handleWebDemoLoadVideoAndSubtitles}
                    className="max-w-2xl mx-auto"
                  />
                ) : (
                  <form
                    id="youtube-url-form"
                    className="flex items-center gap-2 max-w-2xl mx-auto rounded-xl border border-border bg-card p-2 shadow-sm"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const id = parseVideoId(videoInput);
                      if (id) {
                        if (id !== videoId) {
                          setTracks(null);
                          setShown([]);
                          setTargetLanguages([]);
                          setSpoken([]);
                          setObservedUrl("");
                          setDefaultCaptionsLoaded(false);
                          setActive(-1);
                          setSpeakingLang(null);
                          setSpeakingRow(-1);
                          setSpeechProgress(null);
                          cancelSpeech();
                          playedTtsRecords.current.clear();
                          setPlayedRecordsCount(0);
                          setSubtitlesPage(1);
                          setOnDemandTranslations({});
                          setDetectedPlaygroundTracks({});
                          if (typeof window !== "undefined") {
                            const currentSearch = new URLSearchParams(window.location.search);
                            if (currentSearch.get("v") !== id) {
                              currentSearch.set("v", id);
                              window.history.pushState(
                                { videoId: id },
                                "",
                                `${window.location.pathname}?${currentSearch.toString()}${window.location.hash}`,
                              );
                            }
                          }
                        }
                        setVideoId(id);
                      } else {
                        setCaptionStatus("Enter a valid YouTube link or video ID.");
                      }
                    }}
                  >
                    <input
                      id="youtube-url-input"
                      data-testid="youtube-url-input"
                      aria-label="YouTube video URL or ID"
                      value={videoInput}
                      onChange={(event) => setVideoInput(event.target.value)}
                      placeholder="Paste YouTube video link (e.g. https://www.youtube.com/watch?v=vBURridJXZ0)"
                      className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                    />
                    <Button
                      id="play-video-button"
                      data-testid="play-video-button"
                      type="submit"
                      size="sm"
                    >
                      Load video
                    </Button>
                  </form>
                )}
              </div>

              <div className="grid items-start gap-4 p-4 md:p-6 lg:grid-cols-2">
                {panelOrder.map((panelId, panelIndex) => {
                  const panel = PANELS.find((candidate) => candidate.id === panelId);
                  if (!panel) return null;
                  if (panelId === "subtitles" && !hasLegitimateSubtitles) return null;
                  return (
                    <AccordionSection
                      key={panelId}
                      id={panelId}
                      title={panel.title}
                      videoId={videoId}
                      open={openPanels[panelId]}
                      onOpenChange={(open) =>
                        setOpenPanels((current) => ({ ...current, [panelId]: open }))
                      }
                      onMoveUp={() => movePanel(panelId, -1)}
                      onMoveDown={() => movePanel(panelId, 1)}
                      canMoveUp={panelIndex > 0}
                      canMoveDown={panelIndex < panelOrder.length - 1}
                      wide={panelId === "subtitles"}
                    >
                      {panelId === "player" && (
                        <div>
                          {isAndroid && (
                            <form
                              className="flex gap-2 p-3"
                              onSubmit={(event) => {
                                event.preventDefault();
                                const id = parseVideoId(videoInput);
                                if (id) {
                                  if (id !== videoId) {
                                    setTracks(null);
                                    setObservedUrl("");
                                    setDefaultCaptionsLoaded(false);
                                    setActive(-1);
                                    setSpeakingLang(null);
                                    setSpeakingRow(-1);
                                    setSpeechProgress(null);
                                    cancelSpeech();
                                    if (typeof window !== "undefined") {
                                      const currentSearch = new URLSearchParams(
                                        window.location.search,
                                      );
                                      if (currentSearch.get("v") !== id) {
                                        currentSearch.set("v", id);
                                        window.history.pushState(
                                          { videoId: id },
                                          "",
                                          `${window.location.pathname}?${currentSearch.toString()}${window.location.hash}`,
                                        );
                                      }
                                    }
                                  }
                                  setVideoId(id);
                                } else {
                                  setCaptionStatus("Enter a valid YouTube link or video ID.");
                                }
                              }}
                            >
                              <input
                                aria-label="YouTube video URL or ID"
                                value={videoInput}
                                onChange={(event) => setVideoInput(event.target.value)}
                                placeholder="YouTube link or video ID"
                                className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1"
                              />
                              <Button type="submit">Load video</Button>
                            </form>
                          )}
                          <VideoInstancesSwiper
                            instances={videoInstances}
                            activeIndex={activeSwiperIndex}
                            onActiveIndexChange={setActiveSwiperIndex}
                            activePlayingId={
                              speakingLang && audioTrackMode ? `lang_${speakingLang}` : "primary"
                            }
                            videoId={videoId}
                            renderPlayerContainer={(instance) => {
                              if (instance.isPrimary) {
                                return (
                                  <div
                                    className="relative h-full w-full group"
                                    onMouseEnter={() => setIsPlayerHovered(true)}
                                    onMouseLeave={() => setIsPlayerHovered(false)}
                                  >
                                    <div ref={playerEl} className="h-full w-full" />
                                    {/* Overlay Play/Pause Button over video (prominent on pause/stop and hover/tap) */}
                                    <div
                                      data-testid="video-overlay-play-pause-container"
                                      className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 pointer-events-none ${
                                        !isVideoPlaying || isPlayerHovered
                                          ? "opacity-100"
                                          : "opacity-0"
                                      }`}
                                    >
                                      <button
                                        type="button"
                                        data-testid="video-overlay-play-pause-btn"
                                        aria-label={isVideoPlaying ? "Pause video" : "Play video"}
                                        title={isVideoPlaying ? "Pause video" : "Play video"}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleTogglePlay();
                                        }}
                                        className="pointer-events-auto flex items-center justify-center h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-black/65 hover:bg-black/85 text-white shadow-2xl backdrop-blur-sm border-2 border-white/30 transition-transform active:scale-95 hover:scale-105"
                                      >
                                        {isVideoPlaying ? (
                                          <Pause className="h-8 w-8 sm:h-10 sm:w-10 fill-current" />
                                        ) : (
                                          <Play className="h-8 w-8 sm:h-10 sm:w-10 fill-current ml-1" />
                                        )}
                                      </button>
                                    </div>
                                    {showVideoSubtitles && (
                                      <div
                                        className="pointer-events-none absolute inset-x-3 top-3 text-center"
                                        aria-live="polite"
                                      >
                                        <p
                                          id="active-subtitle-cue-text"
                                          data-testid="active-subtitle-cue-text"
                                          dir={
                                            speakingLang && RTL.has(speakingLang) ? "rtl" : "ltr"
                                          }
                                          className="inline-block max-w-[92%] rounded-md bg-foreground/90 px-3 py-2 text-base font-medium text-background shadow-lg md:text-lg"
                                        >
                                          {speakingLang && speakingRow >= 0 ? (
                                            <HighlightedSubtitle
                                              text={rows[speakingRow]?.texts[speakingLang] ?? ""}
                                              progress={
                                                speechProgress?.row === speakingRow &&
                                                speechProgress.lang === speakingLang
                                                  ? speechProgress
                                                  : null
                                              }
                                            />
                                          ) : active >= 0 && rows[active] ? (
                                            <span>
                                              {baseLanguage && rows[active]?.texts[baseLanguage]
                                                ? rows[active]?.texts[baseLanguage]
                                                : Object.values(rows[active]?.texts || {})[0] || ""}
                                            </span>
                                          ) : (
                                            <span className="text-xs opacity-75">
                                              Subtitles active
                                            </span>
                                          )}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              return (
                                <div
                                  ref={(el) => {
                                    if (el) {
                                      secondaryPlayerHosts.current.set(instance.id, el);
                                    } else {
                                      secondaryPlayerHosts.current.delete(instance.id);
                                    }
                                  }}
                                  className="h-full w-full"
                                />
                              );
                            }}
                          />
                          {/* Video metadata card (Client-side title & channel author) */}
                          {videoMetadata && (
                            <div
                              data-testid="video-metadata-card"
                              className="flex items-center justify-between gap-2.5 px-3 py-1.5 text-xs text-muted-foreground bg-muted/20 border-b border-border/40"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                {videoMetadata.thumbnailUrl && (
                                  <img
                                    src={videoMetadata.thumbnailUrl}
                                    alt={videoMetadata.title}
                                    className="h-7 w-12 rounded object-cover border border-border/50 shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => setVideoMetadataModalOpen(true)}
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).style.display = "none";
                                    }}
                                  />
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 truncate">
                                    <p
                                      data-testid="video-metadata-title"
                                      className="font-medium text-foreground truncate leading-tight cursor-pointer hover:underline"
                                      title={videoMetadata.title}
                                      onClick={() => setVideoMetadataModalOpen(true)}
                                    >
                                      {videoMetadata.title}
                                    </p>
                                    {videoMetadata.durationFormatted && (
                                      <span
                                        data-testid="video-metadata-duration-badge"
                                        className="text-[10px] bg-muted text-foreground px-1 py-0.5 rounded font-mono shrink-0"
                                      >
                                        {videoMetadata.durationFormatted}
                                      </span>
                                    )}
                                  </div>
                                  {videoMetadata.authorName && (
                                    <p
                                      data-testid="video-metadata-author"
                                      className="text-[11px] text-muted-foreground truncate"
                                    >
                                      {videoMetadata.authorUrl ? (
                                        <a
                                          href={videoMetadata.authorUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="hover:underline text-primary/90"
                                        >
                                          {videoMetadata.authorName}
                                        </a>
                                      ) : (
                                        videoMetadata.authorName
                                      )}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-[11px] gap-1 shrink-0 text-muted-foreground hover:text-foreground"
                                onClick={() => setVideoMetadataModalOpen(true)}
                                data-testid="open-video-metadata-modal-button"
                                title="Inspect video description, duration, thumbnails, and caption tracks"
                              >
                                <Info className="w-3.5 h-3.5 text-primary" />
                                <span className="hidden sm:inline">Details</span>
                              </Button>
                            </div>
                          )}
                          {/* Video playback buttons under the presented video */}
                          <div className="p-3 pt-2">
                            <VideoPlaybackControls
                              isPlaying={isVideoPlaying}
                              currentTimeSec={playbackCurrentTime}
                              durationSec={playbackDuration}
                              playbackRate={playbackRate}
                              activeSectionIndex={active}
                              totalSections={rows.length}
                              isPausedForSpeech={Boolean(speakingLang)}
                              speakingLangName={
                                speakingLang
                                  ? (LANGS.find((l) => l.code === speakingLang)?.name ??
                                    speakingLang)
                                  : undefined
                              }
                              onTogglePlay={handleTogglePlay}
                              onSeek={handleSeek}
                              onRewind={handleRewind}
                              onFastForward={handleFastForward}
                              onPrevSection={handlePrevSection}
                              onNextSection={handleNextSection}
                              onReplaySection={handleReplaySection}
                              onStop={handleStop}
                              onRateChange={handleRateChange}
                            />
                          </div>
                          {isAndroid && (
                            <p role="status" className="px-3 py-2 text-sm text-muted-foreground">
                              {captionStatus}
                            </p>
                          )}
                        </div>
                      )}

                      {panelId === "playback" && (
                        <div className="space-y-3">
                          {speakingLang ? (
                            <p>
                              {audioTrackMode ? "Repeating" : "Speaking"}{" "}
                              <b>
                                {LANGS.find((l) => l.code === speakingLang)?.name ?? speakingLang}
                              </b>
                              …
                            </p>
                          ) : (
                            <p className="text-muted-foreground">
                              Press play.{" "}
                              {pauseMode
                                ? audioTrackMode
                                  ? "The video pauses after each section and repeats it using native audio."
                                  : "The video pauses after each section and speaks it."
                                : "Continuous playback."}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={pauseMode}
                                onChange={(e) => setPauseMode(e.target.checked)}
                              />{" "}
                              Pause &amp; speak after each section
                            </label>
                            {playedRecordsCount > 0 && (
                              <button
                                type="button"
                                data-testid="reset-played-subtitles-btn"
                                onClick={() => {
                                  playedTtsRecords.current.clear();
                                  handledRow.current = -1;
                                  setPlayedRecordsCount(0);
                                }}
                                className="text-xs text-primary hover:underline font-medium"
                                title="Reset history of spoken subtitle records so they can be spoken again"
                              >
                                Reset spoken history ({playedRecordsCount} spoken)
                              </button>
                            )}
                          </div>
                          <label className="flex flex-wrap items-center gap-2">
                            <span>For each section, play first:</span>
                            <select
                              data-testid="section-order-select"
                              value={sectionOrder}
                              onChange={(e) => {
                                const v = e.target.value as SectionOrder;
                                setSectionOrderState(v);
                                saveSectionOrder(v);
                              }}
                              className="rounded-md border border-input bg-background px-2 py-1"
                            >
                              <option value="video-first">Video, then speech</option>
                              <option value="tts-first">Speech, then video</option>
                            </select>
                          </label>
                          {isAndroid && (
                            <>
                              <label className="flex flex-wrap items-center gap-2">
                                <span>Subtitle request (first try, other is fallback):</span>
                                <select
                                  data-testid="subtitle-request-mode-select"
                                  value={requestMode}
                                  onChange={(e) => {
                                    const v = e.target.value as SubtitleRequestMode;
                                    setRequestModeState(v);
                                    saveSubtitleRequestMode(v);
                                  }}
                                  className="rounded-md border border-input bg-background px-2 py-1"
                                >
                                  <option value="tlang">Add tlang=&lt;language&gt;</option>
                                  <option value="lang">Replace lang=&lt;language&gt;</option>
                                </select>
                              </label>
                              <AttemptOrderSettings
                                order={attemptOrder}
                                onChangeOrder={handleUpdateAttemptOrder}
                                promoteSuccess={promoteSuccess}
                                onTogglePromoteSuccess={handleTogglePromoteSuccess}
                                useFetchServer={useFetchServer}
                                onToggleUseFetchServer={handleToggleUseFetchServer}
                                fetchServerUrl={fetchServerUrl}
                                onUpdateFetchServerUrl={handleUpdateFetchServerUrl}
                                onSelectVideo={handleSelectLibraryVideo}
                                strategyConfig={strategyConfig}
                                onChangeStrategyConfig={(next) => {
                                  setStrategyConfigState(next);
                                  setSubtitleFetchWindowSeconds(next.windowSeconds);
                                  setFetchWindowSecondsState(next.windowSeconds);
                                  subtitleRequestQueue.setWindowSeconds(next.windowSeconds);
                                }}
                                windowSeconds={fetchWindowSeconds}
                                onChangeWindowSeconds={(sec) => {
                                  setFetchWindowSecondsState(sec);
                                  setSubtitleFetchWindowSeconds(sec);
                                  subtitleRequestQueue.setWindowSeconds(sec);
                                }}
                              />
                              <div className="pt-2 border-t border-border/60 space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    data-testid="auto-retry-subtitles-toggle"
                                    type="checkbox"
                                    checked={autoRetrySubtitles}
                                    onChange={(e) => handleToggleAutoRetry(e.target.checked)}
                                    className="rounded border-input text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                  />
                                  <span className="font-medium text-xs text-foreground">
                                    Auto-retry unfetched favorite languages (safe paced jitter)
                                  </span>
                                </label>
                                <p className="text-[11px] text-muted-foreground ml-6">
                                  Automatically retries pending favorite subtitles with random
                                  spacing between X and Y seconds to prevent YouTube HTTP 429 rate
                                  limit blocks.
                                </p>
                                <div className="ml-6 grid grid-cols-2 gap-3 max-w-sm pt-1">
                                  <div>
                                    <label
                                      htmlFor="retry-pacing-min-input"
                                      className="text-[11px] font-medium text-muted-foreground block mb-1"
                                    >
                                      Min interval (X seconds):
                                    </label>
                                    <input
                                      id="retry-pacing-min-input"
                                      data-testid="retry-pacing-min-input"
                                      type="number"
                                      min={1}
                                      max={retryPacingMaxSec}
                                      value={retryPacingMinSec}
                                      onChange={(e) =>
                                        handleUpdatePacingMin(parseInt(e.target.value, 10) || 1)
                                      }
                                      className="w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground"
                                    />
                                  </div>
                                  <div>
                                    <label
                                      htmlFor="retry-pacing-max-input"
                                      className="text-[11px] font-medium text-muted-foreground block mb-1"
                                    >
                                      Max interval (Y seconds):
                                    </label>
                                    <input
                                      id="retry-pacing-max-input"
                                      data-testid="retry-pacing-max-input"
                                      type="number"
                                      min={retryPacingMinSec}
                                      max={60}
                                      value={retryPacingMaxSec}
                                      onChange={(e) =>
                                        handleUpdatePacingMax(
                                          parseInt(e.target.value, 10) || retryPacingMinSec,
                                        )
                                      }
                                      className="w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground"
                                    />
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                          <label className="flex items-center gap-2">
                            <input
                              id="audio-track-mode-toggle"
                              type="checkbox"
                              checked={audioTrackMode}
                              onChange={(e) => onAudioTrackModeChange(e.target.checked)}
                            />{" "}
                            Audio-track mode (repeat segment with native video audio instead of
                            synthesized TTS)
                          </label>
                          <div className="space-y-0.5">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                id="auto-scroll-toggle"
                                data-testid="auto-scroll-toggle"
                                type="checkbox"
                                checked={autoFocus}
                                onChange={(e) => onAutoFocusChange(e.target.checked)}
                              />{" "}
                              <span>Auto-focus and scroll to current subtitle</span>
                            </label>
                            <p className="text-[11px] text-muted-foreground ml-6">
                              Auto-scroll only starts 5 seconds after last user interaction to avoid
                              disturbing user actions.
                            </p>
                          </div>
                          <label className="flex items-center gap-2">
                            <input
                              id="debug-mode-toggle"
                              data-testid="debug-mode-toggle"
                              type="checkbox"
                              checked={debugMode}
                              onChange={(e) => onDebugModeChange(e.target.checked)}
                            />{" "}
                            Debug mode (show network traffic inspector and diagnostics)
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={showVideoSubtitles}
                              onChange={(e) => setShowVideoSubtitles(e.target.checked)}
                            />{" "}
                            Show spoken subtitle over video
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              id="background-audio-toggle"
                              data-testid="background-audio-toggle"
                              type="checkbox"
                              checked={backgroundAudioEnabled}
                              onChange={(e) => handleToggleBackgroundAudio(e.target.checked)}
                            />{" "}
                            Background audio &amp; lockscreen playback controls
                          </label>

                          {/* On-Demand Translation Ahead via Google Translate API */}
                          <div
                            className="pt-2 border-t border-border/60 space-y-2"
                            data-testid="on-demand-translation-settings-card"
                          >
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                id="on-demand-translation-toggle"
                                data-testid="on-demand-translation-toggle"
                                type="checkbox"
                                checked={enableOnDemandTranslation}
                                onChange={(e) =>
                                  onEnableOnDemandTranslationChange(e.target.checked)
                                }
                                className="rounded border-input text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                              />
                              <span className="font-medium text-xs text-foreground">
                                On-demand sentence translation ahead (until YouTube subtitles
                                arrive)
                              </span>
                            </label>
                            <p className="text-[11px] text-muted-foreground ml-6">
                              Uses Google Translate API to pre-translate upcoming sentences ahead
                              for selected target languages until authentic YouTube captions are
                              fetched.
                            </p>
                            <div className="ml-6 flex items-center gap-2 pt-1 max-w-xs">
                              <label
                                htmlFor="on-demand-ahead-count-input"
                                className="text-[11px] font-medium text-muted-foreground whitespace-nowrap"
                              >
                                Sentences ahead (X):
                              </label>
                              <input
                                id="on-demand-ahead-count-input"
                                data-testid="on-demand-ahead-count-input"
                                type="number"
                                min={1}
                                max={50}
                                value={onDemandAheadCount}
                                onChange={(e) =>
                                  onOnDemandAheadCountChange(
                                    Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 10)),
                                  )
                                }
                                className="w-20 rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
                              />
                            </div>
                          </div>

                          {/* Alternative TTS Service (Lovable Speak API & Google Translate) */}
                          <div
                            className="pt-2 border-t border-border/60 space-y-2"
                            data-testid="alternative-tts-settings-card"
                          >
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                id="alternative-tts-toggle"
                                data-testid="alternative-tts-toggle"
                                type="checkbox"
                                checked={useAlternativeTtsState}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setUseAlternativeTtsState(checked);
                                  setUseAlternativeTts(checked);
                                }}
                                className="rounded border-input text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                              />
                              <span className="font-medium text-xs text-foreground">
                                Alternative TTS Service (Lovable Speak API &amp; Google Translate)
                              </span>
                              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                                Off by default
                              </span>
                            </label>

                            {useAlternativeTtsState && (
                              <div className="ml-6 space-y-2.5 pt-1">
                                <div className="flex flex-wrap items-center gap-4 text-xs">
                                  <label className="flex items-center gap-1.5 text-foreground cursor-pointer">
                                    <input
                                      type="radio"
                                      name="alternative-tts-mode"
                                      data-testid="alternative-tts-mode-always"
                                      value="always"
                                      checked={alternativeTtsModeState === "always"}
                                      onChange={() => {
                                        setAlternativeTtsModeState("always");
                                        setAlternativeTtsMode("always");
                                      }}
                                    />
                                    Prefer Lovable TTS over device/browser speech
                                  </label>
                                  <label className="flex items-center gap-1.5 text-foreground cursor-pointer">
                                    <input
                                      type="radio"
                                      name="alternative-tts-mode"
                                      data-testid="alternative-tts-mode-fallback"
                                      value="fallback_only"
                                      checked={alternativeTtsModeState === "fallback_only"}
                                      onChange={() => {
                                        setAlternativeTtsModeState("fallback_only");
                                        setAlternativeTtsMode("fallback_only");
                                      }}
                                    />
                                    Fallback when device/browser speech fails
                                  </label>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <span className="text-muted-foreground font-medium">
                                    TTS Engine:
                                  </span>
                                  <select
                                    data-testid="alternative-tts-engine-select"
                                    value="lovable"
                                    disabled
                                    className="rounded border border-input bg-background px-2 py-1 text-xs text-foreground font-medium opacity-90 cursor-default"
                                  >
                                    <option value="lovable">
                                      Lovable Speak API (tts2.lovable.app)
                                    </option>
                                  </select>
                                  <a
                                    href={LOVABLE_TTS_OPENAPI_URL}
                                    target="_blank"
                                    rel="noreferrer"
                                    data-testid="lovable-tts-openapi-link"
                                    className="text-primary hover:underline font-mono text-[11px] inline-flex items-center gap-0.5 ml-1"
                                  >
                                    OpenAPI 3.1.0 Spec ↗
                                  </a>
                                </div>

                                <div className="space-y-3 p-3 rounded-lg bg-muted/40 border border-border/60">
                                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground font-medium">
                                        Provider:
                                      </span>
                                      <select
                                        data-testid="lovable-tts-provider-select"
                                        value={lovableTtsProviderState}
                                        onChange={(e) => {
                                          const p = e.target.value as LovableTtsProvider;
                                          setLovableTtsProviderState(p);
                                          setLovableTtsProvider(p);
                                          if (
                                            p === "openrouter" &&
                                            !(OPENROUTER_VOICES as readonly string[]).includes(
                                              lovableTtsVoiceState,
                                            )
                                          ) {
                                            setLovableTtsVoiceState("alloy");
                                            setLovableTtsVoice("alloy");
                                          } else if (
                                            p === "lovable" &&
                                            !(LOVABLE_VOICES as readonly string[]).includes(
                                              lovableTtsVoiceState,
                                            )
                                          ) {
                                            setLovableTtsVoiceState("Kore");
                                            setLovableTtsVoice("Kore");
                                          }
                                        }}
                                        className="rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground font-mono font-medium shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary hover:border-primary/50 cursor-pointer"
                                      >
                                        <option value="lovable">lovable</option>
                                        <option value="google">google</option>
                                        <option value="openrouter">openrouter</option>
                                      </select>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      <span className="text-muted-foreground font-medium">
                                        Voice:
                                      </span>
                                      {lovableTtsProviderState === "google" ? (
                                        <span className="text-xs text-muted-foreground italic px-2 py-0.5">
                                          Default (Single voice)
                                        </span>
                                      ) : (
                                        <select
                                          data-testid="lovable-tts-voice-select"
                                          value={
                                            lovableTtsVoiceState ||
                                            (lovableTtsProviderState === "openrouter"
                                              ? "alloy"
                                              : "Kore")
                                          }
                                          onChange={(e) => {
                                            const v = e.target.value;
                                            setLovableTtsVoiceState(v);
                                            setLovableTtsVoice(v);
                                          }}
                                          className="rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground font-medium shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary hover:border-primary/50 cursor-pointer"
                                        >
                                          {lovableTtsProviderState === "openrouter"
                                            ? OPENROUTER_VOICES.map((v) => (
                                                <option key={v} value={v}>
                                                  {v} {v === "alloy" ? "(Default)" : ""}
                                                </option>
                                              ))
                                            : LOVABLE_VOICES.map((v) => (
                                                <option key={v} value={v}>
                                                  {v} {v === "Kore" ? "(Default)" : ""}
                                                </option>
                                              ))}
                                        </select>
                                      )}
                                    </div>
                                  </div>

                                  {/* OpenRouter API Key Settings */}
                                  <div className="space-y-1.5 pt-1 text-xs border-t border-border/60">
                                    <div className="flex items-center justify-between">
                                      <label
                                        htmlFor="openrouter-tts-key-input"
                                        className="text-muted-foreground font-medium flex items-center gap-1.5"
                                      >
                                        <span>OpenRouter API Key:</span>
                                        {hasCustomOpenRouterApiKey() ? (
                                          <span
                                            className="text-[10px] text-emerald-500 font-medium"
                                            data-testid="openrouter-key-custom-badge"
                                          >
                                            ✓ Custom key saved
                                          </span>
                                        ) : getServerOpenRouterApiKey() ? (
                                          <span
                                            className="text-[10px] text-primary font-medium"
                                            data-testid="openrouter-key-server-badge"
                                          >
                                            (Using server .env key)
                                          </span>
                                        ) : (
                                          <span className="text-[10px] text-muted-foreground font-normal">
                                            (Optional - free tier default)
                                          </span>
                                        )}
                                      </label>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <div className="relative flex-1">
                                        <input
                                          id="openrouter-tts-key-input"
                                          data-testid="openrouter-tts-key-input"
                                          type={showOpenRouterKey ? "text" : "password"}
                                          value={openRouterKeyInput}
                                          onChange={(e) => {
                                            setOpenRouterKeyInput(e.target.value);
                                            setOpenRouterKeySaved(false);
                                          }}
                                          placeholder={
                                            getServerOpenRouterApiKey()
                                              ? "Using server key (enter custom to override)"
                                              : "sk-or-v1-..."
                                          }
                                          className="w-full rounded border border-input bg-background px-2.5 py-1 pr-8 text-xs font-mono text-foreground placeholder:text-muted-foreground/60"
                                        />
                                        <button
                                          type="button"
                                          data-testid="toggle-show-openrouter-key-btn"
                                          onClick={() => setShowOpenRouterKey(!showOpenRouterKey)}
                                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                                          title={showOpenRouterKey ? "Hide key" : "Show key"}
                                        >
                                          {showOpenRouterKey ? (
                                            <EyeOff className="h-3.5 w-3.5" />
                                          ) : (
                                            <Eye className="h-3.5 w-3.5" />
                                          )}
                                        </button>
                                      </div>
                                      <button
                                        type="button"
                                        data-testid="save-openrouter-key-btn"
                                        onClick={() => {
                                          setLovableTtsApiKey(openRouterKeyInput);
                                          setOpenRouterApiKeySetting(openRouterKeyInput);
                                          setOpenRouterKeySaved(true);
                                          setTimeout(() => setOpenRouterKeySaved(false), 2500);
                                        }}
                                        className="px-2.5 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium cursor-pointer"
                                      >
                                        {openRouterKeySaved ? "Saved!" : "Save"}
                                      </button>
                                      {openRouterKeyInput && (
                                        <button
                                          type="button"
                                          data-testid="clear-openrouter-key-btn"
                                          onClick={() => {
                                            setOpenRouterKeyInput("");
                                            setLovableTtsApiKey("");
                                            setOpenRouterApiKeySetting("");
                                          }}
                                          className="px-2 py-1 rounded border border-input bg-background text-muted-foreground hover:text-foreground text-xs"
                                          title="Clear custom key"
                                        >
                                          Clear
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Native TTS Speed Notice (Uses native speech rate settings) */}
                                  <div
                                    data-testid="lovable-tts-native-speed-notice"
                                    className="flex items-center justify-between rounded border border-border/50 bg-muted/30 px-2.5 py-1.5 text-xs"
                                  >
                                    <span className="text-muted-foreground font-medium">
                                      TTS Speed:
                                    </span>
                                    <span className="text-foreground font-mono text-[11px]">
                                      Uses native speech rate (
                                      {(rates[baseLanguage || "en"] ?? 0.5).toFixed(1)}x)
                                    </span>
                                  </div>

                                  <p className="text-[10px] text-muted-foreground">
                                    Endpoint:{" "}
                                    <code className="bg-muted px-1 py-0.5 rounded text-[10px] font-mono">
                                      https://tts2.lovable.app/api/public/tts
                                    </code>{" "}
                                    • Provider:{" "}
                                    <span className="font-semibold text-foreground font-mono">
                                      {lovableTtsProviderState}
                                    </span>{" "}
                                    • Speaks subtitles using configured target language, current
                                    text, and native speech rate with voice:{" "}
                                    {lovableTtsProviderState === "google"
                                      ? "Default"
                                      : lovableTtsVoiceState ||
                                        (lovableTtsProviderState === "openrouter"
                                          ? "alloy"
                                          : "Kore")}
                                    .
                                  </p>
                                </div>

                                <div>
                                  <button
                                    type="button"
                                    data-testid="test-alternative-tts-btn"
                                    disabled={isTestingAlternativeTts}
                                    onClick={async () => {
                                      setIsTestingAlternativeTts(true);
                                      const testRate = rates[baseLanguage || "en"] ?? 0.5;
                                      try {
                                        await playAlternativeTtsAudio(
                                          "Hello world",
                                          baseLanguage || "en",
                                          testRate,
                                          undefined,
                                          "lovable",
                                          {
                                            provider: lovableTtsProviderState,
                                            voice:
                                              lovableTtsProviderState === "google"
                                                ? undefined
                                                : lovableTtsVoiceState ||
                                                  (lovableTtsProviderState === "openrouter"
                                                    ? "alloy"
                                                    : "Kore"),
                                            speed: testRate,
                                          },
                                        );
                                      } catch (err) {
                                        console.warn("Test Alternative TTS error:", err);
                                      } finally {
                                        setIsTestingAlternativeTts(false);
                                      }
                                    }}
                                    className="px-2.5 py-1 rounded border border-input bg-background hover:bg-muted text-xs font-mono inline-flex items-center gap-1.5 text-foreground disabled:opacity-60 cursor-pointer"
                                  >
                                    {isTestingAlternativeTts ? (
                                      <>
                                        <Loader2 className="h-3 w-3 animate-spin text-primary" />
                                        <span>Playing test audio…</span>
                                      </>
                                    ) : (
                                      <>
                                        <Play className="h-3 w-3 text-primary" />
                                        <span>▶ Test Alternative TTS ("Hello world")</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Favorite Languages (Settings & localStorage) and Video-Specific Selection */}
                          <div
                            className="pt-2 border-t border-border/60 space-y-2.5"
                            data-testid="settings-favorites-languages-card"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <span className="font-semibold text-xs text-foreground flex items-center gap-1">
                                  <span>⭐ Favorite Languages (Settings &amp; localStorage)</span>
                                </span>
                                <p className="text-[11px] text-muted-foreground">
                                  Saved in localStorage. Applied automatically as default target
                                  languages for every new video.
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  data-testid="settings-reset-video-to-favorites-btn"
                                  onClick={handleResetVideoToFavorites}
                                  className="rounded border border-input bg-background hover:bg-muted px-2 py-0.5 text-xs font-medium"
                                >
                                  Apply Favorites to Active Video
                                </button>
                                <button
                                  type="button"
                                  data-testid="settings-save-current-as-favorites-btn"
                                  onClick={handleSaveCurrentAsFavorites}
                                  className="rounded border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary px-2 py-0.5 text-xs font-medium"
                                >
                                  Save Active Selection as Favorites
                                </button>
                              </div>
                            </div>

                            <div className="rounded-md border border-border bg-background/50 p-2 space-y-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[11px] font-medium text-muted-foreground mr-1">
                                  Global Favorites:
                                </span>
                                {favoriteLanguages.length === 0 ? (
                                  <span className="text-[11px] text-muted-foreground italic">
                                    No favorites selected yet
                                  </span>
                                ) : (
                                  favoriteLanguages.map((code) => {
                                    const langMeta = SUPPORTED_LANGUAGES_CATALOG.find(
                                      (c) => c.code === code,
                                    ) || { code, name: code };
                                    return (
                                      <span
                                        key={code}
                                        data-testid={`settings-fav-chip-${code}`}
                                        className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-xs font-medium"
                                      >
                                        <span>{langMeta.name}</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const nextFavs = favoriteLanguages.filter(
                                              (c) => c !== code,
                                            );
                                            handleUpdateFavoriteLanguages(nextFavs);
                                          }}
                                          className="hover:text-destructive transition ml-0.5 text-xs"
                                          title={`Remove ${langMeta.name} from favorites`}
                                          aria-label={`Remove ${langMeta.name} from favorites`}
                                        >
                                          ×
                                        </button>
                                      </span>
                                    );
                                  })
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40 text-xs">
                                <label
                                  htmlFor="add-favorite-language-select"
                                  className="text-muted-foreground"
                                >
                                  Add favorite language:
                                </label>
                                <select
                                  id="add-favorite-language-select"
                                  data-testid="add-favorite-language-select"
                                  value=""
                                  onChange={(e) => {
                                    const code = e.target.value;
                                    if (code && !favoriteLanguages.includes(code)) {
                                      const nextFavs = [...favoriteLanguages, code];
                                      handleUpdateFavoriteLanguages(nextFavs);
                                    }
                                  }}
                                  className="rounded border border-input bg-background px-2 py-0.5 text-xs"
                                >
                                  <option value="">Choose a language to add to favorites…</option>
                                  {SUPPORTED_LANGUAGES_CATALOG.filter(
                                    (c) => !favoriteLanguages.includes(c.code),
                                  ).map((c) => (
                                    <option key={c.code} value={c.code}>
                                      {c.name} ({c.code})
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="pt-1.5 border-t border-border/40 text-[11px] space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-foreground">
                                    Enabled for this Video:
                                  </span>
                                  <span className="font-mono text-primary font-semibold">
                                    {targetLanguages.join(", ") || "None"}
                                  </span>
                                </div>
                                <p className="text-muted-foreground">
                                  Video-specific customizations are saved per video ID (
                                  {videoId || "active video"}) and remembered when reloaded.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {panelId === "library" && (
                        <VideoLibraryPanel
                          currentVideoId={videoId}
                          onSelectVideo={handleSelectLibraryVideo}
                          onClearVideoCache={(clearedId) => {
                            if (clearedId === videoId) {
                              setTracks(null);
                              setObservedUrl("");
                              subtitleRequestQueue.resetVideo(clearedId);
                            }
                          }}
                          onFetchFromScratch={(scratchId, scratchUrl) => {
                            clearVideoSubtitleCache(scratchId);
                            subtitleRequestQueue.resetVideo(scratchId);
                            if (scratchId === videoId) {
                              setTracks(null);
                              setObservedUrl("");
                              if (isAndroid) {
                                void fetchFavoriteLanguageSubtitles(targetLanguages);
                              }
                            } else {
                              handleSelectLibraryVideo(scratchId, scratchUrl);
                            }
                          }}
                        />
                      )}

                      {panelId === "charsRemoval" && (
                        <SpecialCharactersRemovalPanel
                          stripSpeakerBrackets={stripSpeakerBrackets}
                          onStripSpeakerBracketsChange={(enabled) => {
                            setStripSpeakerBrackets(enabled);
                            setStripSpeakerBracketsSetting(enabled);
                          }}
                          removeChars={removeChars}
                          onRemoveCharsChange={(chars) => {
                            setRemoveChars(chars);
                            setRemoveCharsSetting(chars);
                          }}
                          sampleCues={
                            tracks && baseLanguage && tracks[baseLanguage]?.events
                              ? tracks[baseLanguage].events.slice(0, 5).map((e) => ({
                                  text: (e.segs || []).map((s) => s.utf8).join(""),
                                  start: (e.tStartMs || 0) / 1000,
                                  duration: (e.dDurationMs || 0) / 1000,
                                }))
                              : undefined
                          }
                          onResetDefaults={() => {
                            setStripSpeakerBrackets(true);
                            setStripSpeakerBracketsSetting(true);
                            setRemoveChars([">", ">>"]);
                            setRemoveCharsSetting([">", ">>"]);
                          }}
                        />
                      )}

                      {panelId === "parser" && (
                        <div className="space-y-4">
                          {/* Interactive Timing & Punctuation Splitting Lab */}
                          <ParserTimingLab
                            tracks={tracks}
                            baseLanguage={baseLanguage}
                            selectedCriteria={selectedCriteria}
                            criteriaSettings={criteriaSettings}
                            onApplyCriteria={handleApplyPreset}
                            onUpdateGroupSettings={handleUpdateGroupSettings}
                          />

                          {/* Difference Confirmation Toggle */}
                          <div className="flex items-center justify-between rounded-lg border border-border/70 p-3 bg-muted/20">
                            <div className="space-y-0.5 pr-2">
                              <label
                                htmlFor="confirm-parser-diff-toggle"
                                className="text-xs font-semibold text-foreground cursor-pointer"
                              >
                                Confirm before applying parser changes
                              </label>
                              <p className="text-[11px] text-muted-foreground">
                                Preview alignment differences, changed records, and sentence
                                splitting in a modal before updating.
                              </p>
                            </div>
                            <Switch
                              id="confirm-parser-diff-toggle"
                              data-testid="confirm-parser-diff-toggle"
                              checked={confirmParserDiffEnabled}
                              onCheckedChange={(checked) => {
                                setConfirmParserDiffEnabled(checked);
                                try {
                                  localStorage.setItem("yt_confirm_parser_diff", String(checked));
                                } catch {
                                  // ignore storage error
                                }
                              }}
                            />
                          </div>

                          {/* Presets Header */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                                Alignment Presets
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Quick combinations
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {PARSER_PRESETS.map((preset) => {
                                const isPresetActive =
                                  preset.criteria.length === selectedCriteria.length &&
                                  preset.criteria.every((c) => selectedCriteria.includes(c));
                                return (
                                  <Button
                                    key={preset.id}
                                    type="button"
                                    size="sm"
                                    variant={isPresetActive ? "default" : "outline"}
                                    className="h-7 text-xs px-2.5"
                                    onClick={() => handleApplyPreset(preset.criteria)}
                                    title={preset.desc}
                                  >
                                    {preset.name}
                                  </Button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Accumulative Criteria Section */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                                Accumulative Division Criteria (Multi-Select)
                              </label>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-primary">
                                  {selectedCriteria.length} criteria active
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                                  onClick={handleResetGroupSettings}
                                  title="Reset all criteria inner settings to default"
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Reset settings
                                </Button>
                                <label
                                  data-testid="toggle-confirm-parser-diff-label"
                                  className="flex items-center gap-1.5 cursor-pointer text-[11px] text-muted-foreground hover:text-foreground select-none ml-1 pl-2 border-l border-border/60"
                                  title="Display preview diff showing changed records and alignment divisions before applying parser options"
                                >
                                  <input
                                    type="checkbox"
                                    data-testid="toggle-confirm-parser-diff"
                                    checked={confirmParserDiff}
                                    onChange={(e) => {
                                      const next = e.target.checked;
                                      setConfirmParserDiff(next);
                                      try {
                                        localStorage.setItem(
                                          STORAGE_KEYS.PARSER_CONFIRM_DIFF_STORAGE_KEY,
                                          String(next),
                                        );
                                      } catch {
                                        // ignore storage error
                                      }
                                    }}
                                    className="h-3.5 w-3.5 rounded border-muted-foreground/40 text-primary accent-primary cursor-pointer"
                                  />
                                  <span>Confirm diff</span>
                                </label>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mb-3">
                              Select multiple criteria accumulatively to divide subtitles into
                              separated, translatable sections of related sentences and cohesive
                              context. Click settings to tune inner parameters for each group.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {PARSER_CRITERIA.map((crit) => {
                                const isChecked = selectedCriteria.includes(crit.id);
                                const isExpanded = expandedSettingsGroup === crit.id;
                                return (
                                  <div
                                    key={crit.id}
                                    className={`rounded-lg border transition-all ${
                                      isChecked
                                        ? "border-primary/60 bg-primary/5 text-foreground shadow-xs"
                                        : "border-border/70 hover:border-border hover:bg-muted/40 text-muted-foreground"
                                    }`}
                                  >
                                    <div
                                      onClick={() => handleToggleCriterion(crit.id)}
                                      className="p-2.5 cursor-pointer flex items-start gap-2.5"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleToggleCriterion(crit.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="mt-0.5 rounded border-muted-foreground/40 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1 flex-wrap">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span
                                              className={`text-xs font-semibold ${isChecked ? "text-foreground" : "text-foreground/80"}`}
                                            >
                                              {crit.name}
                                            </span>
                                            <Badge
                                              variant={isChecked ? "default" : "outline"}
                                              className="text-[10px] h-4 px-1.5 py-0 font-normal"
                                            >
                                              {crit.badge}
                                            </Badge>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setExpandedSettingsGroup(isExpanded ? null : crit.id);
                                            }}
                                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-colors ${
                                              isExpanded
                                                ? "bg-primary text-primary-foreground font-medium"
                                                : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground"
                                            }`}
                                            title="Toggle inner settings for this criteria group"
                                          >
                                            <SlidersHorizontal className="h-3 w-3" />
                                            <span>Settings</span>
                                            {isExpanded ? (
                                              <ChevronUp className="h-3 w-3" />
                                            ) : (
                                              <ChevronDown className="h-3 w-3" />
                                            )}
                                          </button>
                                        </div>
                                        <p className="text-[11px] leading-tight text-muted-foreground mt-1">
                                          {crit.desc}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Inner Settings Panel for this Group */}
                                    {isExpanded && (
                                      <div
                                        onClick={(e) => e.stopPropagation()}
                                        className="px-3 pb-3 pt-2 border-t border-border/60 bg-background/90 rounded-b-lg space-y-2.5 text-xs text-foreground"
                                      >
                                        <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                                          <span className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
                                            {crit.name} Inner Settings
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleUpdateGroupSettings(
                                                crit.id,
                                                DEFAULT_CRITERIA_SETTINGS[crit.id] as never,
                                              )
                                            }
                                            className="text-[10px] text-muted-foreground hover:text-foreground underline"
                                          >
                                            Reset this group
                                          </button>
                                        </div>

                                        {crit.id === "sentence" && (
                                          <div className="space-y-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={criteriaSettings.sentence.includeCommas}
                                                onChange={(e) =>
                                                  handleUpdateGroupSettings("sentence", {
                                                    includeCommas: e.target.checked,
                                                  })
                                                }
                                                className="rounded border-border text-primary h-3.5 w-3.5"
                                              />
                                              <span className="text-[11px]">
                                                Split on secondary clauses (commas, semicolons,
                                                colons)
                                              </span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={criteriaSettings.sentence.splitIntraCue}
                                                onChange={(e) =>
                                                  handleUpdateGroupSettings("sentence", {
                                                    splitIntraCue: e.target.checked,
                                                  })
                                                }
                                                className="rounded border-border text-primary h-3.5 w-3.5"
                                              />
                                              <span className="text-[11px]">
                                                Split inside word-timed cues (intra-cue segments)
                                              </span>
                                            </label>
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="text-[11px] text-muted-foreground">
                                                Minimum words per sentence:
                                              </span>
                                              <input
                                                type="number"
                                                min={1}
                                                max={10}
                                                value={criteriaSettings.sentence.minWords}
                                                onChange={(e) =>
                                                  handleUpdateGroupSettings("sentence", {
                                                    minWords: Math.max(
                                                      1,
                                                      parseInt(e.target.value) || 1,
                                                    ),
                                                  })
                                                }
                                                className="h-6 w-14 rounded border border-input bg-background px-1.5 text-xs text-right"
                                              />
                                            </div>
                                          </div>
                                        )}

                                        {crit.id === "pause" && (
                                          <div className="space-y-2">
                                            <div>
                                              <div className="flex justify-between text-[11px] mb-1">
                                                <span className="text-muted-foreground">
                                                  Silence gap threshold:
                                                </span>
                                                <span className="font-semibold text-primary">
                                                  {criteriaSettings.pause.minPauseMs} ms
                                                </span>
                                              </div>
                                              <input
                                                type="range"
                                                min={200}
                                                max={1500}
                                                step={50}
                                                value={criteriaSettings.pause.minPauseMs}
                                                onChange={(e) =>
                                                  handleUpdateGroupSettings("pause", {
                                                    minPauseMs: parseInt(e.target.value),
                                                  })
                                                }
                                                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                              />
                                            </div>
                                            <div>
                                              <div className="flex justify-between text-[11px] mb-1">
                                                <span className="text-muted-foreground">
                                                  Cue snap proximity:
                                                </span>
                                                <span className="font-semibold text-primary">
                                                  {criteriaSettings.pause.snapToleranceMs} ms
                                                </span>
                                              </div>
                                              <input
                                                type="range"
                                                min={400}
                                                max={2000}
                                                step={100}
                                                value={criteriaSettings.pause.snapToleranceMs}
                                                onChange={(e) =>
                                                  handleUpdateGroupSettings("pause", {
                                                    snapToleranceMs: parseInt(e.target.value),
                                                  })
                                                }
                                                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                              />
                                            </div>
                                          </div>
                                        )}

                                        {crit.id === "punctVote" && (
                                          <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="text-[11px] text-muted-foreground">
                                                Minimum agreeing tracks:
                                              </span>
                                              <select
                                                value={criteriaSettings.punctVote.minTrackVotes}
                                                onChange={(e) =>
                                                  handleUpdateGroupSettings("punctVote", {
                                                    minTrackVotes: parseInt(e.target.value),
                                                  })
                                                }
                                                className="h-6 rounded border border-input bg-background px-1.5 text-xs"
                                              >
                                                <option value={1}>1 track (any mark)</option>
                                                <option value={2}>2 tracks (agreement)</option>
                                                <option value={3}>3 tracks (consensus)</option>
                                              </select>
                                            </div>
                                            <div>
                                              <div className="flex justify-between text-[11px] mb-1">
                                                <span className="text-muted-foreground">
                                                  Cluster proximity window:
                                                </span>
                                                <span className="font-semibold text-primary">
                                                  {criteriaSettings.punctVote.clusterToleranceMs} ms
                                                </span>
                                              </div>
                                              <input
                                                type="range"
                                                min={200}
                                                max={1200}
                                                step={50}
                                                value={
                                                  criteriaSettings.punctVote.clusterToleranceMs
                                                }
                                                onChange={(e) =>
                                                  handleUpdateGroupSettings("punctVote", {
                                                    clusterToleranceMs: parseInt(e.target.value),
                                                  })
                                                }
                                                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                              />
                                            </div>
                                          </div>
                                        )}

                                        {crit.id === "consensus" && (
                                          <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="text-[11px] text-muted-foreground">
                                                Required track alignment:
                                              </span>
                                              <select
                                                value={criteriaSettings.consensus.majorityRatio}
                                                onChange={(e) =>
                                                  handleUpdateGroupSettings("consensus", {
                                                    majorityRatio: parseFloat(e.target.value),
                                                  })
                                                }
                                                className="h-6 rounded border border-input bg-background px-1.5 text-xs"
                                              >
                                                <option value={0.33}>33% (any 2+ tracks)</option>
                                                <option value={0.5}>50% (majority)</option>
                                                <option value={0.66}>66% (supermajority)</option>
                                              </select>
                                            </div>
                                            <div>
                                              <div className="flex justify-between text-[11px] mb-1">
                                                <span className="text-muted-foreground">
                                                  Proximity window:
                                                </span>
                                                <span className="font-semibold text-primary">
                                                  {criteriaSettings.consensus.clusterToleranceMs} ms
                                                </span>
                                              </div>
                                              <input
                                                type="range"
                                                min={200}
                                                max={800}
                                                step={50}
                                                value={
                                                  criteriaSettings.consensus.clusterToleranceMs
                                                }
                                                onChange={(e) =>
                                                  handleUpdateGroupSettings("consensus", {
                                                    clusterToleranceMs: parseInt(e.target.value),
                                                  })
                                                }
                                                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                              />
                                            </div>
                                          </div>
                                        )}

                                        {crit.id === "cue" && (
                                          <div className="space-y-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={criteriaSettings.cue.splitAllTracks}
                                                onChange={(e) =>
                                                  handleUpdateGroupSettings("cue", {
                                                    splitAllTracks: e.target.checked,
                                                  })
                                                }
                                                className="rounded border-border text-primary h-3.5 w-3.5"
                                              />
                                              <span className="text-[11px]">
                                                Split on cue starts from all parallel tracks
                                              </span>
                                            </label>
                                          </div>
                                        )}

                                        {crit.id === "anchors" && (
                                          <div className="space-y-1.5">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={criteriaSettings.anchors.matchNumbers}
                                                onChange={(e) =>
                                                  handleUpdateGroupSettings("anchors", {
                                                    matchNumbers: e.target.checked,
                                                  })
                                                }
                                                className="rounded border-border text-primary h-3.5 w-3.5"
                                              />
                                              <span className="text-[11px]">
                                                Match numbers and digits
                                              </span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={criteriaSettings.anchors.matchProperNouns}
                                                onChange={(e) =>
                                                  handleUpdateGroupSettings("anchors", {
                                                    matchProperNouns: e.target.checked,
                                                  })
                                                }
                                                className="rounded border-border text-primary h-3.5 w-3.5"
                                              />
                                              <span className="text-[11px]">
                                                Match capitalized proper nouns
                                              </span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={
                                                  criteriaSettings.anchors.requireStrictMultiTrack
                                                }
                                                onChange={(e) =>
                                                  handleUpdateGroupSettings("anchors", {
                                                    requireStrictMultiTrack: e.target.checked,
                                                  })
                                                }
                                                className="rounded border-border text-primary h-3.5 w-3.5"
                                              />
                                              <span className="text-[11px]">
                                                Strict: require anchor in all tracks
                                              </span>
                                            </label>
                                          </div>
                                        )}

                                        {crit.id === "window" && (
                                          <div className="space-y-2">
                                            <div>
                                              <div className="flex justify-between text-[11px] mb-1">
                                                <span className="text-muted-foreground">
                                                  Minimum section length:
                                                </span>
                                                <span className="font-semibold text-primary">
                                                  {(
                                                    criteriaSettings.window.minSectionMs / 1000
                                                  ).toFixed(1)}
                                                  s
                                                </span>
                                              </div>
                                              <input
                                                type="range"
                                                min={800}
                                                max={4000}
                                                step={200}
                                                value={criteriaSettings.window.minSectionMs}
                                                onChange={(e) =>
                                                  handleUpdateGroupSettings("window", {
                                                    minSectionMs: parseInt(e.target.value),
                                                  })
                                                }
                                                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                              />
                                            </div>
                                            <div>
                                              <div className="flex justify-between text-[11px] mb-1">
                                                <span className="text-muted-foreground">
                                                  Maximum section length:
                                                </span>
                                                <span className="font-semibold text-primary">
                                                  {(
                                                    criteriaSettings.window.maxSectionMs / 1000
                                                  ).toFixed(0)}
                                                  s
                                                </span>
                                              </div>
                                              <input
                                                type="range"
                                                min={6000}
                                                max={24000}
                                                step={1000}
                                                value={criteriaSettings.window.maxSectionMs}
                                                onChange={(e) =>
                                                  handleUpdateGroupSettings("window", {
                                                    maxSectionMs: parseInt(e.target.value),
                                                  })
                                                }
                                                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                              />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Status & Summary */}
                          <div className="pt-2 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground">
                            <div>
                              Sections:{" "}
                              <span className="font-semibold text-foreground">
                                {rows.length} translatable sections
                              </span>{" "}
                              · Timing base:{" "}
                              <span className="font-semibold text-foreground">
                                {baseLanguage
                                  ? getLanguageMeta(baseLanguage).name
                                  : "None (waiting for captions)"}
                              </span>
                            </div>
                            <div className="text-[11px] text-muted-foreground/80">
                              Cuts accumulate at sentence marks, breath pauses & alignment consensus
                            </div>
                          </div>
                        </div>
                      )}

                      {panelId === "languages" && (
                        <>
                          <div className="mb-4 space-y-3 border-b border-border pb-4">
                            {/* Enabled Languages Status Card */}
                            <div
                              data-testid="enabled-languages-status-card"
                              className="rounded-lg border border-border/80 bg-muted/20 p-2.5 text-xs space-y-2"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="font-semibold text-foreground flex items-center gap-1.5">
                                  <span>🎬 Enabled for this Video:</span>
                                  <span className="font-mono text-primary font-bold">
                                    {targetLanguages.length}{" "}
                                    {targetLanguages.length === 1 ? "language" : "languages"}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground font-normal">
                                    (
                                    {
                                      targetLanguages.filter((l) => favoriteLanguages.includes(l))
                                        .length
                                    }{" "}
                                    from favorites)
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    data-testid="reset-video-to-favorites-btn"
                                    onClick={handleResetVideoToFavorites}
                                    className="rounded border border-input bg-background hover:bg-muted px-2 py-0.5 text-[11px] font-medium"
                                    title="Reset this video to your global favorite languages"
                                  >
                                    ↺ Reset to Favorites
                                  </button>
                                  <button
                                    type="button"
                                    data-testid="save-current-as-favorites-btn"
                                    onClick={handleSaveCurrentAsFavorites}
                                    className="rounded border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary px-2 py-0.5 text-[11px] font-medium"
                                    title="Save this video's current languages as your global favorites"
                                  >
                                    ★ Save as Favorites
                                  </button>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-1.5 items-center">
                                <span className="text-muted-foreground text-[11px] mr-1">
                                  Current selection:
                                </span>
                                {targetLanguages.length === 0 ? (
                                  <span className="text-muted-foreground italic text-[11px]">
                                    None selected
                                  </span>
                                ) : (
                                  targetLanguages.map((code) => {
                                    const langMeta = (isAndroid
                                      ? SUPPORTED_LANGUAGES_CATALOG
                                      : LANGS
                                    ).find((c) => c.code === code) || {
                                      code,
                                      name: code,
                                    };
                                    const isFav = favoriteLanguages.includes(code);
                                    return (
                                      <span
                                        key={code}
                                        data-testid={`enabled-lang-badge-${code}`}
                                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium border ${
                                          isFav
                                            ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                            : "border-border bg-background text-foreground"
                                        }`}
                                      >
                                        <span>{langMeta.name}</span>
                                        {isFav && <span title="Favorite language">⭐</span>}
                                      </span>
                                    );
                                  })
                                )}
                              </div>

                              <div className="flex flex-wrap gap-1.5 items-center border-t border-border/50 pt-1.5">
                                <span className="text-muted-foreground text-[11px] mr-1">
                                  ⭐ Global favorites:
                                </span>
                                {favoriteLanguages.length === 0 ? (
                                  <span className="text-muted-foreground italic text-[11px]">
                                    No favorites configured in settings
                                  </span>
                                ) : (
                                  favoriteLanguages.map((code) => {
                                    const langMeta = (isAndroid
                                      ? SUPPORTED_LANGUAGES_CATALOG
                                      : LANGS
                                    ).find((c) => c.code === code) || {
                                      code,
                                      name: code,
                                    };
                                    const isCurrent = targetLanguages.includes(code);
                                    return (
                                      <span
                                        key={code}
                                        data-testid={`favorite-lang-badge-${code}`}
                                        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                                          isCurrent
                                            ? "border-primary/40 bg-primary/10 text-primary"
                                            : "border-muted bg-muted/40 text-muted-foreground line-through opacity-70"
                                        }`}
                                        title={
                                          isCurrent
                                            ? "Enabled for this video"
                                            : "Not enabled for this video"
                                        }
                                      >
                                        <span>{langMeta.name}</span>
                                      </span>
                                    );
                                  })
                                )}
                              </div>
                            </div>

                            <LanguageBoxesSelector
                              catalog={isAndroid ? SUPPORTED_LANGUAGES_CATALOG : LANGS}
                              selectedLanguages={targetLanguages}
                              onSelectionChange={handleTargetLanguagesChange}
                              isAndroid={isAndroid}
                              favoriteLanguages={favoriteLanguages}
                              currentVideoId={videoId}
                              loadedTracks={tracks}
                              onSaveSubtitleUrl={handleSaveTrackFromUrl}
                            />
                            {(() => {
                              const pendingFetchAgainLangs =
                                activeFailedToFetch.length > 0
                                  ? activeFailedToFetch
                                  : failedLangs.length > 0
                                    ? languagesToFetchNext
                                    : [];
                              if (pendingFetchAgainLangs.length === 0) return null;
                              return (
                                <div className="flex items-center justify-between p-2.5 rounded-lg border border-destructive/30 bg-destructive/10 text-xs">
                                  <span className="text-destructive font-medium">
                                    Failed to fetch subtitles: {pendingFetchAgainLangs.join(", ")}
                                  </span>
                                  <button
                                    type="button"
                                    data-testid="subtitles-manual-fetch"
                                    onClick={manualFetchFailed}
                                    className="inline-flex items-center gap-1 rounded bg-destructive/20 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/30"
                                  >
                                    <RefreshCw className="h-3 w-3" />
                                    Fetch again ({pendingFetchAgainLangs.join(", ")})
                                  </button>
                                </div>
                              );
                            })()}
                            <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20">
                              <div className="space-y-0.5">
                                <label
                                  htmlFor="auto-speak-on-fetch-toggle"
                                  className="text-xs font-medium text-foreground cursor-pointer"
                                >
                                  Auto speak language upon fetching
                                </label>
                                <div className="text-[11px] text-muted-foreground">
                                  Automatically enable the "Speak" checkbox for languages when their
                                  subtitles are loaded
                                </div>
                              </div>
                              <input
                                type="checkbox"
                                id="auto-speak-on-fetch-toggle"
                                data-testid="auto-speak-on-fetch-toggle"
                                checked={autoSpeakOnFetch}
                                onChange={(e) => {
                                  setAutoSpeakOnFetch(e.target.checked);
                                  setAutoSpeakOnFetchSetting(e.target.checked);
                                }}
                                className="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                              />
                            </div>
                            <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20">
                              <div className="space-y-0.5">
                                <label
                                  htmlFor="speak-language-name-on-fetch-toggle"
                                  className="text-xs font-medium text-foreground cursor-pointer"
                                >
                                  TTS-play language name upon fetching
                                </label>
                                <div className="text-[11px] text-muted-foreground">
                                  When a new subtitle is fetched, speak aloud the name of the
                                  language used to fetch
                                </div>
                              </div>
                              <input
                                type="checkbox"
                                id="speak-language-name-on-fetch-toggle"
                                data-testid="speak-language-name-on-fetch-toggle"
                                checked={speakLanguageNameOnFetch}
                                onChange={(e) => {
                                  setSpeakLanguageNameOnFetchState(e.target.checked);
                                  setSpeakLanguageNameOnFetchSetting(e.target.checked);
                                }}
                                className="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                              />
                            </div>
                            <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20">
                              <div className="space-y-0.5">
                                <label
                                  htmlFor="fetch-window-seconds-input"
                                  className="text-xs font-medium text-foreground"
                                >
                                  Subtitle fetch window pacing
                                </label>
                                <div className="text-[11px] text-muted-foreground">
                                  Never try to fetch more than 1 subtitle within this window frame
                                  (seconds)
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  id="fetch-window-seconds-input"
                                  data-testid="fetch-window-seconds-input"
                                  min={1}
                                  max={60}
                                  value={fetchWindowSeconds}
                                  onChange={(e) => {
                                    const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                                    setFetchWindowSecondsState(val);
                                    setSubtitleFetchWindowSeconds(val);
                                    subtitleRequestQueue.setWindowSeconds(val);
                                  }}
                                  className="w-16 rounded border border-input bg-background px-2 py-1 text-xs text-right"
                                />
                                <span className="text-xs text-muted-foreground">sec</span>
                              </div>
                            </div>
                          </div>
                          <table className="w-full">
                            <thead>
                              <tr className="text-xs text-muted-foreground">
                                <th className="text-left font-normal">Language</th>
                                <th
                                  className="font-normal text-center"
                                  title="Present in table (show subtitle column in table)"
                                >
                                  Present in Table
                                </th>
                                <th
                                  className="font-normal text-center"
                                  title="TTS-play (speak subtitle during playback)"
                                >
                                  TTS-Play
                                </th>
                                <th
                                  className="font-normal text-center"
                                  title="Foreign subtitle TTS play frequency ratio"
                                >
                                  TTS Ratio
                                </th>
                                <th
                                  className="font-normal text-center"
                                  title="1 input per 1 favorite language for subtitle URL"
                                >
                                  Subtitle URL
                                </th>
                                <th className="font-normal text-center">Order</th>
                              </tr>
                            </thead>
                            <tbody>
                              {orderedLangs.map((l, index) => {
                                const isSpoken = spoken.includes(l.code);
                                const ratio = ttsRatios[l.code] ?? 1;
                                const isFavorite = favoriteLanguages.includes(l.code);
                                const isExpanded = expandedTableUrlLang === l.code;
                                const cueCount = tracks?.[l.code]?.events?.length;
                                const status = tableFetchStatus[l.code];

                                return (
                                  <Fragment key={l.code}>
                                    <tr data-testid={`language-row-${l.code}`}>
                                      <td className="py-1">
                                        <span className="flex items-center gap-1">
                                          <span>{l.name}</span>
                                          {isFavorite && (
                                            <span
                                              title="Favorite language"
                                              className="text-[10px] text-amber-500 font-bold"
                                              data-testid={`fav-table-star-${l.code}`}
                                            >
                                              ⭐
                                            </span>
                                          )}
                                          {cueCount ? (
                                            <span
                                              className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-medium"
                                              title={`${cueCount} subtitle cues loaded`}
                                            >
                                              {cueCount}
                                            </span>
                                          ) : null}
                                        </span>
                                      </td>
                                      <td className="text-center">
                                        <input
                                          type="checkbox"
                                          data-testid={`checkbox-present-in-table-${l.code}`}
                                          aria-label={`Present in table: ${l.name}`}
                                          title={`Present in table: ${l.name}`}
                                          checked={shown.includes(l.code)}
                                          onChange={() => toggle(shown, setShown, l.code)}
                                        />
                                      </td>
                                      <td className="text-center">
                                        <input
                                          type="checkbox"
                                          data-testid={`checkbox-tts-play-${l.code}`}
                                          aria-label={`TTS-play: ${l.name}`}
                                          title={`TTS-play: ${l.name}`}
                                          checked={isSpoken}
                                          onChange={() => toggle(spoken, setSpoken, l.code)}
                                        />
                                      </td>
                                      <td className="text-center">
                                        {isSpoken ? (
                                          <span
                                            data-testid={`tts-ratio-badge-${l.code}`}
                                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-primary/10 text-primary border border-primary/20"
                                            title={`1:${ratio} ratio (${ratio === 1 ? "All sentences" : `${Math.round(100 / ratio)}% of sentences`})`}
                                          >
                                            1:{ratio}
                                          </span>
                                        ) : (
                                          <span className="text-[11px] text-muted-foreground">
                                            —
                                          </span>
                                        )}
                                      </td>
                                      <td className="text-center">
                                        <Button
                                          type="button"
                                          variant={isExpanded ? "default" : "outline"}
                                          size="sm"
                                          id={`table-btn-subtitle-url-${l.code}`}
                                          data-testid={`table-btn-subtitle-url-${l.code}`}
                                          aria-expanded={isExpanded}
                                          onClick={() =>
                                            setExpandedTableUrlLang((cur) =>
                                              cur === l.code ? null : l.code,
                                            )
                                          }
                                          className="h-6 px-2 text-[11px] gap-1"
                                          title={`Supply subtitle URL for ${l.name}`}
                                        >
                                          <Link2 className="h-3 w-3" />
                                          <span>{cueCount ? `${cueCount} cues` : "URL"}</span>
                                        </Button>
                                      </td>
                                      <td>
                                        <div className="flex justify-center gap-1">
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            disabled={index === 0}
                                            onClick={() => moveLanguage(l.code, -1)}
                                            title={`Move ${l.name} earlier`}
                                            aria-label={`Move ${l.name} earlier`}
                                          >
                                            <ChevronUp aria-hidden="true" />
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            disabled={index === orderedLangs.length - 1}
                                            onClick={() => moveLanguage(l.code, 1)}
                                            title={`Move ${l.name} later`}
                                            aria-label={`Move ${l.name} later`}
                                          >
                                            <ChevronDown aria-hidden="true" />
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                    {isExpanded && (
                                      <tr
                                        key={`${l.code}-url-drawer`}
                                        data-testid={`url-input-row-${l.code}`}
                                        className="bg-primary/5 border-y border-primary/20"
                                      >
                                        <td colSpan={6} className="p-2.5">
                                          <div className="space-y-2 max-w-xl text-xs">
                                            <div className="flex items-center justify-between">
                                              <span className="font-semibold text-foreground flex items-center gap-1.5">
                                                <Link2 className="h-3.5 w-3.5 text-primary" />
                                                <span>
                                                  Subtitle URL for {l.name} ({l.code})
                                                </span>
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => setExpandedTableUrlLang(null)}
                                                className="text-muted-foreground hover:text-foreground text-[11px]"
                                              >
                                                ✕ Close
                                              </button>
                                            </div>

                                            <div className="flex items-center gap-2">
                                              <input
                                                type="text"
                                                id={`table-url-input-${l.code}`}
                                                data-testid={`table-url-input-${l.code}`}
                                                value={tableUrlInputs[l.code] ?? ""}
                                                onChange={(e) =>
                                                  setTableUrlInputs((prev) => ({
                                                    ...prev,
                                                    [l.code]: e.target.value,
                                                  }))
                                                }
                                                placeholder={`e.g. /fixtures/${videoId || "L2Ryrr6txwA"}/${l.code}.json or https://...`}
                                                className="flex-1 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                                              />
                                              <Button
                                                type="button"
                                                size="sm"
                                                id={`table-fetch-url-${l.code}`}
                                                data-testid={`table-fetch-url-${l.code}`}
                                                disabled={
                                                  status?.loading ||
                                                  !(tableUrlInputs[l.code] || "").trim()
                                                }
                                                onClick={() => handleFetchTableUrl(l.code, l.name)}
                                                className="h-7 text-xs px-2.5 shrink-0"
                                              >
                                                {status?.loading ? (
                                                  <>
                                                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                                    Loading…
                                                  </>
                                                ) : (
                                                  "Fetch Subtitles"
                                                )}
                                              </Button>
                                            </div>

                                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const sample = `/fixtures/${videoId || "L2Ryrr6txwA"}/${l.code}.json`;
                                                  setTableUrlInputs((prev) => ({
                                                    ...prev,
                                                    [l.code]: sample,
                                                  }));
                                                }}
                                                className="text-primary hover:underline flex items-center gap-1"
                                              >
                                                <FileText className="h-3 w-3" />
                                                <span>Use sample fixture</span>
                                              </button>
                                              {cueCount ? (
                                                <span className="text-muted-foreground font-mono">
                                                  Active track: {cueCount} cues
                                                </span>
                                              ) : null}
                                            </div>

                                            {status?.message && (
                                              <div
                                                data-testid={`table-url-status-${l.code}`}
                                                className={`p-2 rounded text-[11px] flex items-start gap-1.5 border ${
                                                  status.type === "success"
                                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800"
                                                    : status.type === "error"
                                                      ? "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800"
                                                      : "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800"
                                                }`}
                                              >
                                                {status.type === "success" ? (
                                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                                ) : status.type === "error" ? (
                                                  <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                                                ) : (
                                                  <RefreshCw className="h-3.5 w-3.5 text-blue-600 animate-spin shrink-0 mt-0.5" />
                                                )}
                                                <span className="flex-1">{status.message}</span>
                                              </div>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                          <div className="mt-2 space-y-1 border-t border-border pt-2">
                            {orderedLangs
                              .filter((lang) => spoken.includes(lang.code))
                              .map((lang) => {
                                const languageVoices = getLanguageVoices(voices, lang.tts, true);
                                const ratio = ttsRatios[lang.code] ?? 1;
                                return (
                                  <div
                                    key={lang.code}
                                    data-testid={`tts-settings-card-${lang.code}`}
                                    className="flex flex-wrap sm:flex-nowrap items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-2 py-1 text-xs"
                                  >
                                    <span
                                      className="w-16 shrink-0 truncate font-semibold text-foreground"
                                      title={lang.name}
                                    >
                                      {lang.name}
                                    </span>
                                    {/* Speech ratio: speak 1 of every N sections */}
                                    <label
                                      className="flex items-center gap-1 shrink-0"
                                      title="Speak 1 of every N sections (comprehension level)"
                                    >
                                      <span className="text-muted-foreground">Speak</span>
                                      <select
                                        aria-label={`${lang.name} TTS sentence ratio`}
                                        data-testid={`tts-ratio-slider-${lang.code}`}
                                        value={ratio}
                                        onChange={(e) => {
                                          const val = Math.max(
                                            1,
                                            Math.min(10, Number(e.target.value)),
                                          );
                                          setTtsRatios((curr) => ({ ...curr, [lang.code]: val }));
                                          saveTtsRatioPreference(lang.code, val);
                                          if (videoId)
                                            saveVideoSettings(videoId, {
                                              ttsRatios: { [lang.code]: val },
                                            });
                                        }}
                                        className="rounded border border-input bg-background px-1 py-0.5 text-xs"
                                      >
                                        {[1, 2, 3, 4, 5, 7, 10].map((n) => (
                                          <option
                                            key={n}
                                            value={n}
                                            data-testid={`tts-ratio-preset-${lang.code}-${n}`}
                                          >
                                            1:{n}
                                          </option>
                                        ))}
                                      </select>
                                      <span
                                        data-testid={`tts-ratio-label-${lang.code}`}
                                        className="sr-only"
                                      >
                                        1:{ratio} ({Math.round(100 / ratio)}% of sentences)
                                      </span>
                                    </label>
                                    {/* Rate slider: range 0.3 to 1.5, default 0.5 */}
                                    <label className="flex items-center gap-1.5 flex-1 min-w-[7rem]">
                                      <span className="text-muted-foreground shrink-0">Rate</span>
                                      <input
                                        aria-label={`${lang.name} speech rate`}
                                        type="range"
                                        min={0.3}
                                        max={1.5}
                                        step={0.1}
                                        value={rates[lang.code] ?? 0.5}
                                        onChange={(e) => {
                                          const val = Number(e.target.value);
                                          setRates((current) => ({
                                            ...current,
                                            [lang.code]: val,
                                          }));
                                          if (videoId) {
                                            saveVideoSettings(videoId, {
                                              ttsRates: { [lang.code]: val },
                                            });
                                          }
                                        }}
                                        className="h-1.5 min-w-0 flex-1 cursor-pointer accent-primary"
                                      />
                                      <span className="w-7 text-right font-mono tabular-nums text-muted-foreground shrink-0">
                                        {(rates[lang.code] ?? 0.5).toFixed(1)}×
                                      </span>
                                    </label>
                                    {/* Voice selector */}
                                    <select
                                      aria-label={`${lang.name} voice`}
                                      value={voiceSelections[lang.code] ?? ""}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        setVoiceSelections((current) => {
                                          const next = { ...current, [lang.code]: value };
                                          try {
                                            localStorage.setItem(
                                              "yt_tts_voice_selections_v1",
                                              JSON.stringify(next),
                                            );
                                          } catch {
                                            // ignore storage errors
                                          }
                                          return next;
                                        });
                                      }}
                                      disabled={languageVoices.length === 0}
                                      title={
                                        languageVoices.length === 0
                                          ? "No selectable voices on this device; the device default voice is used"
                                          : "Voice"
                                      }
                                      className="w-full sm:w-44 shrink-0 truncate rounded border border-input bg-background px-1.5 py-0.5 text-xs disabled:opacity-60"
                                    >
                                      <option value="">
                                        {languageVoices.length === 0
                                          ? "Device voice"
                                          : "Default voice"}
                                      </option>
                                      {languageVoices.map((voice, voiceIndex) => (
                                        <option
                                          key={getUniqueVoiceKey(voice, voiceIndex)}
                                          value={voice.voiceURI || voice.name}
                                        >
                                          {voice.name} {voice.lang ? `(${voice.lang})` : ""}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const voiceToTest = voiceSelections[lang.code] ?? "";
                                        const rateToTest = rates[lang.code] ?? 0.5;
                                        void speak(
                                          lang.name,
                                          lang.tts,
                                          rateToTest,
                                          voiceToTest,
                                          -1,
                                          () => {},
                                        );
                                      }}
                                      title={`Test ${lang.name} voice`}
                                      aria-label={`Test ${lang.name} voice`}
                                      className="shrink-0 rounded border border-input bg-background px-2 py-0.5 text-xs hover:bg-muted font-mono"
                                    >
                                      ▶ Test
                                    </button>
                                  </div>
                                );
                              })}
                          </div>
                        </>
                      )}

                      {panelId === "subtitles" &&
                        (!hasLegitimateSubtitles ? null : (
                          <SubtitlesTablePanel
                            isAndroid={isAndroid}
                            rows={rows}
                            displayedRows={displayedRows}
                            cols={cols}
                            subtitlesLimit={subtitlesLimit}
                            setSubtitlesLimit={setSubtitlesLimit}
                            subtitlesPage={subtitlesPage}
                            setSubtitlesPage={setSubtitlesPage}
                            active={active}
                            allFavoritesAligned={allFavoritesAligned}
                            targetLanguages={targetLanguages}
                            speechProgress={speechProgress}
                            tracks={tracks}
                            onSeek={seek}
                            spokenLangs={spoken}
                            ttsRatios={ttsRatios}
                            hasCachedAi={hasCachedAi}
                            onLoadCachedAiSubtitles={handleLoadCachedAiFromViewer}
                          />
                        ))}
                    </AccordionSection>
                  );
                })}
              </div>

              <ApkReleasesFooter
                apkReleaseLinks={apkReleaseLinks}
                onOpenApkModal={() => setApkModalOpen(true)}
              />
            </>
          )}
        </>
      )}

      {debugMode && (
        <NetworkRequestsInspector
          isOpen={networkInspectorOpen}
          onClose={() => setNetworkInspectorOpen(false)}
          onFetchAgainWithSession={(url) => handleFetchAgain(url, true)}
          onFetchAgainAnon={(url) => handleFetchAgain(url, false)}
          onFetchAgainViaServer={handleFetchAgainViaServer}
          onUseTheseSubtitles={handleUseTheseSubtitles}
          isAndroid={isAndroid}
          useFetchServer={useFetchServer}
          onToggleUseFetchServer={handleToggleUseFetchServer}
          fetchServerUrl={fetchServerUrl}
          onUpdateFetchServerUrl={handleUpdateFetchServerUrl}
        />
      )}
      <LanguageSubtitleUrlModal
        isOpen={urlModalLang !== null}
        onClose={() => setUrlModalLang(null)}
        langCode={urlModalLang}
        langName={urlModalLang ? getLanguageMeta(urlModalLang).name : ""}
        currentVideoId={videoId}
        onSaveTrack={handleSaveTrackFromUrl}
        existingTrack={urlModalLang && tracks ? tracks[urlModalLang] : null}
      />
      <ApkReleaseModal isOpen={apkModalOpen} onClose={() => setApkModalOpen(false)} />
      <ShareStateModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        videoId={videoId}
        baseLanguage={baseLanguage}
        targetLanguages={targetLanguages}
        observedUrl={
          observedUrl ||
          (typeof window !== "undefined"
            ? window.AndroidNativeShell?.getLastObservedTimedTextUrl?.()
            : undefined)
        }
        rawJson3Track={tracks && baseLanguage ? tracks[baseLanguage] : null}
        openRouterApiKey={getOpenRouterApiKeySetting()}
        ttsProvider={lovableTtsProviderState}
        isAndroid={isAndroid}
      />
      <SubtitleFetchToast
        onViewSubtitles={() => {
          setOpenPanels((prev) => ({ ...prev, subtitles: true }));
          const el =
            document.getElementById("subtitles-table-panel") ||
            document.getElementById("accordion-section-subtitles");
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }}
      />
      <FloatingDraggablePauseButton
        isSetupPaused={isSetupPaused}
        onToggleSetupPause={toggleSetupPause}
        isAutoScrollEnabled={autoFocus}
        onToggleAutoScroll={() => onAutoFocusChange(!autoFocus)}
      />
      <FloatingSubtitleRetryIndicator
        targetLanguages={targetLanguages}
        tracks={tracks}
        onFetchLanguage={handleFloatingFetchSingleLanguage}
        isFetching={isSubtitlesPending}
        autoRetryEnabled={autoRetrySubtitles}
        minPacingSec={retryPacingMinSec}
        maxPacingSec={retryPacingMaxSec}
        onToggleAutoRetry={handleToggleAutoRetry}
      />
      <ParserDiffConfirmationModal
        isOpen={Boolean(pendingParserChange)}
        onClose={handleCancelDiff}
        onConfirm={handleConfirmDiff}
        diffResult={pendingParserChange?.diffResult || null}
        proposedCriteriaNames={pendingParserChange?.criteriaNames || []}
      />
      <VideoMetadataModal
        open={videoMetadataModalOpen}
        onOpenChange={setVideoMetadataModalOpen}
        metadata={videoMetadata}
        videoId={videoId}
        onRefreshMetadata={() =>
          fetchVideoMetadata(videoId, {
            forceRefresh: true,
            player: player.current,
          }).then((meta) => {
            setVideoMetadata({ ...meta });
          })
        }
      />
    </div>
  );
}

export { AccordionSection } from "@/components/AccordionSection";
export { SubtitleRow } from "@/components/SubtitleRow";
export { HighlightedSubtitle } from "@/components/HighlightedSubtitle";
export { SubtitlesTablePanel } from "@/components/SubtitlesTablePanel";
export { ApkReleasesFooter } from "@/components/ApkReleasesFooter";
export { VideoPlayground } from "@/components/VideoPlayground";
