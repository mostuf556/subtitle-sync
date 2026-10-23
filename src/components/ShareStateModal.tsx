import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  createShareableLink,
  DEMO_SITE_BASE_URL,
} from "@/utils/urlStateManager";
import { LANGS, type Json3 } from "@/lib/subtitles";
import {
  Share2,
  Copy,
  Check,
  Key,
  Languages,
  Subtitles,
  AlertTriangle,
  Volume2,
  Globe,
  Smartphone,
} from "lucide-react";

export interface ShareStateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoId: string;
  targetLanguages: string[];
  baseLanguage: string;
  observedUrl?: string;
  rawJson3Track?: Json3 | null;
  openRouterApiKey?: string;
  ttsProvider?: string;
  isAndroid?: boolean;
}

export function ShareStateModal({
  open,
  onOpenChange,
  videoId,
  targetLanguages,
  baseLanguage,
  observedUrl,
  rawJson3Track,
  openRouterApiKey,
  ttsProvider = "lovable",
  isAndroid = false,
}: ShareStateModalProps) {
  const [minimalMode, setMinimalMode] = useState<boolean>(true);
  const [selectedTargetLang, setSelectedTargetLang] = useState<string>(
    () => targetLanguages[0] || "he",
  );
  const [includeTargetLang, setIncludeTargetLang] = useState<boolean>(true);
  const [includeAllTargetLangs, setIncludeAllTargetLangs] = useState<boolean>(
    targetLanguages.length > 1,
  );
  const [includeSubtitles, setIncludeSubtitles] = useState<boolean>(true);
  const [includeTtsProvider, setIncludeTtsProvider] = useState<boolean>(true);
  const [selectedTtsProvider, setSelectedTtsProvider] = useState<string>(ttsProvider);
  const [includeApiKey, setIncludeApiKey] = useState<boolean>(Boolean(openRouterApiKey));
  const [useDemoBase, setUseDemoBase] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [shared, setShared] = useState<boolean>(false);

  const isNativeAndroid = useMemo(() => {
    if (isAndroid) return true;
    if (typeof window !== "undefined" && window.AndroidNativeShell?.isNativeShell?.()) {
      return true;
    }
    return false;
  }, [isAndroid]);

  // Resolve detected or default subtitles URL
  const detectedSubUrl = useMemo(() => {
    if (observedUrl && observedUrl.trim()) {
      return observedUrl.trim();
    }
    if (typeof window !== "undefined" && window.AndroidNativeShell?.getLastObservedTimedTextUrl) {
      try {
        const captured = window.AndroidNativeShell.getLastObservedTimedTextUrl();
        if (captured && captured.trim()) {
          return captured.trim();
        }
      } catch {}
    }
    if (videoId === "L2Ryrr6txwA") {
      return `https://mostuf2556.github.io/subtitle-sync/fixtures/L2Ryrr6txwA/${baseLanguage || "en"}.json`;
    }
    return "";
  }, [observedUrl, videoId, baseLanguage]);

  const [subUrlInput, setSubUrlInput] = useState<string>(detectedSubUrl);

  // Sync if detectedSubUrl becomes available while input is empty
  useEffect(() => {
    if (detectedSubUrl && !subUrlInput) {
      setSubUrlInput(detectedSubUrl);
    }
  }, [detectedSubUrl, subUrlInput]);

  // Compute the subtitle URL or serialized data to share
  const subUrlToShare = useMemo(() => {
    if (!includeSubtitles) return undefined;
    let candidate = (subUrlInput || detectedSubUrl || observedUrl || "").trim();
    // Clean any prefix like "subtitles_url:" if user pasted with label
    candidate = candidate.replace(/^subtitles_url:\s*/i, "").trim();
    return candidate.length > 0 ? candidate : undefined;
  }, [includeSubtitles, subUrlInput, detectedSubUrl, observedUrl]);

  // Compute the shareable URL with encoded parameters
  const shareableUrl = useMemo(() => {
    const activeTargetLangs = includeTargetLang
      ? includeAllTargetLangs && targetLanguages.length > 0
        ? targetLanguages
        : [selectedTargetLang]
      : undefined;

    return createShareableLink({
      baseUrl: useDemoBase ? DEMO_SITE_BASE_URL : undefined,
      useDemoSiteBase: useDemoBase,
      minimal: minimalMode,
      videoId,
      sourceLangCode: baseLanguage || "en",
      subLang: baseLanguage || "en",
      targetLang: includeTargetLang ? selectedTargetLang : undefined,
      targetLangs: activeTargetLangs,
      subUrl: subUrlToShare,
      subtitlesUrl: subUrlToShare,
      ttsProvider: includeTtsProvider ? selectedTtsProvider : undefined,
      openRouterApiKey: includeApiKey && openRouterApiKey ? openRouterApiKey.trim() : undefined,
    });
  }, [
    useDemoBase,
    minimalMode,
    videoId,
    baseLanguage,
    includeTargetLang,
    includeAllTargetLangs,
    targetLanguages,
    selectedTargetLang,
    subUrlToShare,
    includeTtsProvider,
    selectedTtsProvider,
    includeApiKey,
    openRouterApiKey,
  ]);

  const handleCopy = useCallback(async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareableUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = shareableUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn("[ShareStateModal] Failed to copy to clipboard:", err);
    }
  }, [shareableUrl]);

  const handleShare = useCallback(async () => {
    try {
      const shell = typeof window !== "undefined" ? window.AndroidNativeShell : undefined;
      // 1. Try Android Native Bridge share methods
      if (shell?.shareSubtitlesUrl) {
        const ok = shell.shareSubtitlesUrl(shareableUrl, "Share Subtitles Link");
        if (ok) {
          setShared(true);
          setTimeout(() => setShared(false), 2500);
          return;
        }
      }
      if (shell?.shareText) {
        const ok = shell.shareText(shareableUrl, "Share Subtitles Link");
        if (ok) {
          setShared(true);
          setTimeout(() => setShared(false), 2500);
          return;
        }
      }

      // 2. Try Web Share API (mobile Chrome / Safari)
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: `YouTube Subtitles (${videoId})`,
          text: `Subtitles and synchronized translations for YouTube video ${videoId}`,
          url: shareableUrl,
        });
        setShared(true);
        setTimeout(() => setShared(false), 2500);
        return;
      }

      // 3. Fallback to copy
      await handleCopy();
    } catch (err) {
      console.warn("[ShareStateModal] Share action error, falling back to copy:", err);
      await handleCopy();
    }
  }, [shareableUrl, videoId, handleCopy]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id="share-state-dialog"
        data-testid="share-state-dialog"
        className="max-w-lg space-y-4"
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Share2 className="h-4 w-4" />
            </span>
            <DialogTitle className="text-lg font-bold">
              {isNativeAndroid ? "Share Subtitles from Android" : "Share Subtitles Link"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Generate and share an encoded subtitles link to open in the demo site, containing video ID, source language, subtitles stream, target languages, TTS provider, and OpenRouter API key.
          </DialogDescription>
        </DialogHeader>

        {/* Options / Inclusion Toggles */}
        <div className="space-y-3 rounded-lg border border-border bg-card p-3 text-xs">
          {/* Base URL Option: Demo Site vs App Host */}
          <div className="flex flex-col gap-1.5 pb-2.5 border-b border-border/60">
            <label className="flex items-center gap-2 font-medium cursor-pointer">
              <input
                type="checkbox"
                data-testid="share-demo-base-toggle"
                checked={useDemoBase}
                onChange={(e) => setUseDemoBase(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
              />
              <span className="flex items-center gap-1.5 text-foreground">
                <Globe className="h-3.5 w-3.5 text-blue-500" />
                <span>Use Demo Site Base URL (Recommended)</span>
              </span>
            </label>
            <p className="text-[11px] text-muted-foreground pl-5.5 font-mono text-[10px]">
              {useDemoBase
                ? DEMO_SITE_BASE_URL
                : typeof window !== "undefined" && window.location
                  ? `${window.location.origin}${window.location.pathname}`
                  : DEMO_SITE_BASE_URL}
            </p>
          </div>

          {/* Minimal Info Link Toggle (Requirement 1: minimal info with v extracted and subtitles_url) */}
          <div className="flex flex-col gap-1.5 pb-2.5 border-b border-border/60">
            <label className="flex items-center gap-2 font-medium cursor-pointer">
              <input
                type="checkbox"
                data-testid="share-minimal-toggle"
                checked={minimalMode}
                onChange={(e) => setMinimalMode(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
              />
              <span className="flex items-center gap-1.5 text-foreground font-semibold">
                <Share2 className="h-3.5 w-3.5 text-primary" />
                <span>Minimal Info Link (Recommended)</span>
              </span>
            </label>
            <p className="text-[11px] text-muted-foreground pl-5.5">
              Contains minimal info: default subtitles URL and video ID extracted from it. Reliable, compact, and free of redundant parameters.
            </p>
          </div>

          {/* Target Language Toggle */}
          <div className="flex flex-col gap-2 pb-2.5 border-b border-border/60">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  data-testid="share-include-target-lang-toggle"
                  checked={includeTargetLang}
                  onChange={(e) => setIncludeTargetLang(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                />
                <span className="flex items-center gap-1.5 text-foreground">
                  <Languages className="h-3.5 w-3.5 text-primary" />
                  Target Translation Language(s)
                </span>
              </label>
              {includeTargetLang && (
                <div className="flex items-center gap-1.5">
                  {targetLanguages.length > 1 && (
                    <label className="flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer mr-1">
                      <input
                        type="checkbox"
                        checked={includeAllTargetLangs}
                        onChange={(e) => setIncludeAllTargetLangs(e.target.checked)}
                        className="rounded border-input h-3 w-3"
                      />
                      <span>All ({targetLanguages.length})</span>
                    </label>
                  )}
                  <select
                    data-testid="share-target-lang-select"
                    value={selectedTargetLang}
                    onChange={(e) => setSelectedTargetLang(e.target.value)}
                    className="rounded border border-input bg-background px-2 py-0.5 text-xs font-medium"
                  >
                    {LANGS.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.name} ({l.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground pl-5.5">
              The recipient will automatically have these target languages configured and translated.
            </p>
          </div>

          {/* Subtitles Stream Toggle */}
          <div className="flex flex-col gap-1.5 pb-2.5 border-b border-border/60">
            <label className="flex items-center gap-2 font-medium cursor-pointer">
              <input
                type="checkbox"
                data-testid="share-include-subtitles-toggle"
                checked={includeSubtitles}
                onChange={(e) => setIncludeSubtitles(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
              />
              <span className="flex items-center gap-1.5 text-foreground">
                <Subtitles className="h-3.5 w-3.5 text-primary" />
                Subtitles URL (Source: {baseLanguage || "en"})
              </span>
            </label>
            <p className="text-[11px] text-muted-foreground pl-5.5">
              Includes the authentic timedtext captions URL for instant stream hydration on the recipient demo site.
            </p>
            {includeSubtitles && (
              <div className="pl-5.5 space-y-1 mt-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Subtitles stream URL to encode:</span>
                  {typeof window !== "undefined" && window.AndroidNativeShell?.getLastObservedTimedTextUrl && (
                    <button
                      type="button"
                      data-testid="btn-refresh-android-sub-url"
                      onClick={() => {
                        try {
                          const cap = window.AndroidNativeShell?.getLastObservedTimedTextUrl?.();
                          if (cap && cap.trim()) {
                            setSubUrlInput(cap.trim());
                          }
                        } catch {}
                      }}
                      className="text-primary hover:underline font-medium cursor-pointer"
                      title="Use the authentic subtitles URL captured by Android Native Shell"
                    >
                      Use Captured Android URL
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  data-testid="share-subtitles-url-input"
                  value={subUrlInput}
                  onChange={(e) => setSubUrlInput(e.target.value)}
                  placeholder="https://www.youtube.com/api/timedtext?v=..."
                  className="w-full rounded border border-input bg-background px-2.5 py-1 text-[11px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
          </div>

          {/* TTS Provider Toggle */}
          <div className="flex flex-col gap-1.5 pb-2.5 border-b border-border/60">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  data-testid="share-include-tts-provider-toggle"
                  checked={includeTtsProvider}
                  onChange={(e) => setIncludeTtsProvider(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                />
                <span className="flex items-center gap-1.5 text-foreground">
                  <Volume2 className="h-3.5 w-3.5 text-emerald-500" />
                  TTS Provider
                </span>
              </label>
              {includeTtsProvider && (
                <select
                  data-testid="share-tts-provider-select"
                  value={selectedTtsProvider}
                  onChange={(e) => setSelectedTtsProvider(e.target.value)}
                  className="rounded border border-input bg-background px-2 py-0.5 text-xs font-medium"
                >
                  <option value="lovable">Lovable (ElevenLabs/OpenAI)</option>
                  <option value="openrouter">OpenRouter AI Voice</option>
                  <option value="elevenlabs">ElevenLabs</option>
                  <option value="google">Google TTS</option>
                  <option value="web_speech">Web Speech / Native</option>
                </select>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground pl-5.5">
              Configures the default speech synthesis engine on the recipient client.
            </p>
          </div>

          {/* OpenRouter API Key Toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 font-medium cursor-pointer">
              <input
                type="checkbox"
                data-testid="share-include-api-key-toggle"
                checked={includeApiKey}
                onChange={(e) => setIncludeApiKey(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
              />
              <span className="flex items-center gap-1.5 text-foreground">
                <Key className="h-3.5 w-3.5 text-amber-500" />
                OpenRouter AI API Key
              </span>
              {openRouterApiKey ? (
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {openRouterApiKey.slice(0, 7)}…{openRouterApiKey.slice(-4)}
                </Badge>
              ) : (
                <span className="text-[10px] text-muted-foreground italic">(Not configured)</span>
              )}
            </label>
            {includeApiKey && openRouterApiKey && (
              <div className="flex items-start gap-1.5 rounded bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  The recipient will receive your encoded API key in the link to instantly run AI
                  punctuation without setting up an account.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Generated Shareable Link Output */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Generated Shareable Link</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              data-testid="share-link-input"
              value={shareableUrl}
              onFocus={(e) => e.target.select()}
              className="flex-1 rounded-md border border-input bg-muted/40 px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-testid="copy-share-link-btn"
              onClick={handleCopy}
              className="gap-1.5 shrink-0 font-medium"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <DialogFooter className="pt-2 flex sm:justify-between items-center gap-2">
          <Button
            type="button"
            size="sm"
            data-testid="share-subtitles-action-btn"
            onClick={handleShare}
            className="gap-1.5 font-medium bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {shared ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-300" />
                <span>Shared!</span>
              </>
            ) : isNativeAndroid ? (
              <>
                <Smartphone className="h-3.5 w-3.5" />
                <span>Share via Android</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5" />
                <span>Share Link</span>
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            data-testid="close-share-modal-btn"
            className="text-xs"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
