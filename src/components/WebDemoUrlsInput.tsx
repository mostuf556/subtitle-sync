import { useState, useCallback, useId } from "react";
import { Button } from "./ui/button";
import { parseVideoId, parseJson3 } from "../lib/native-captions";
import { isValidJsonSubtitleResponse } from "../utils/subtitleCache";
import { extractVideoIdFromSubtitlesUrl } from "../utils/urlStateManager";
import { fetchViaServer, getFetchServerUrl } from "../lib/subtitle-fetch-plan";
import { Json3 } from "../types";
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface WebDemoUrlsInputProps {
  currentVideoId: string;
  observedUrl?: string;
  onLoadVideoAndSubtitles: (payload: {
    videoId: string;
    tracks: Record<string, Json3>;
    observedUrl?: string;
  }) => void;
  className?: string;
}

interface ParsedUrlEntry {
  lang: string;
  url: string;
}

const COMMON_DEMO_LANGS = [
  { code: "en", name: "English" },
  { code: "he", name: "Hebrew (עברית)" },
  { code: "es", name: "Spanish (Español)" },
  { code: "de", name: "German (Deutsch)" },
  { code: "fr", name: "French (Français)" },
  { code: "it", name: "Italian (Italiano)" },
  { code: "ar", name: "Arabic (العربية)" },
  { code: "ru", name: "Russian (Русский)" },
];

export function WebDemoUrlsInput({
  currentVideoId,
  observedUrl: initialObservedUrl,
  onLoadVideoAndSubtitles,
  className = "",
}: WebDemoUrlsInputProps) {
  const formId = useId();
  const [videoUrlInput, setVideoUrlInput] = useState(
    currentVideoId ? `https://www.youtube.com/watch?v=${currentVideoId}` : "",
  );
  const [subtitlesUrlsInput, setSubtitlesUrlsInput] = useState(initialObservedUrl || "");
  const [selectedLangs, setSelectedLangs] = useState<string[]>(["en", "he"]);
  const [isFetching, setIsFetching] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"info" | "success" | "error">("info");
  // Default to collapsed (false) to preserve the original clean single-row web-demo design
  const [isExpanded, setIsExpanded] = useState(false);

  // Helper to extract language code from a line or URL
  const extractLangFromLine = useCallback((line: string, index: number): ParsedUrlEntry | null => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return null;

    // 1. Explicit prefix format: "lang: url" or "lang=url"
    const prefixMatch = trimmed.match(
      /^([a-z]{2,3}(?:-[A-Za-z0-9]+)?)\s*[:=]\s*(https?:\/\/.+|\/.+)$/i,
    );
    if (prefixMatch) {
      return { lang: prefixMatch[1].toLowerCase(), url: prefixMatch[2].trim() };
    }

    // 2. Timedtext URL format: extract `lang=` or `tlang=` parameter
    try {
      const parsedUrl = new URL(trimmed, window.location.origin);
      const tlang = parsedUrl.searchParams.get("tlang");
      const lang = parsedUrl.searchParams.get("lang");
      if (tlang) return { lang: tlang.toLowerCase(), url: trimmed };
      if (lang) return { lang: lang.toLowerCase(), url: trimmed };

      // 3. File path format: e.g. /fixtures/VIDEO_ID/he.json or https://.../he.json
      const pathMatch = parsedUrl.pathname.match(/\/([a-z]{2,3}(?:-[A-Za-z0-9]+)?)\.json$/i);
      if (pathMatch) return { lang: pathMatch[1].toLowerCase(), url: trimmed };
    } catch {
      // not a standard URL, continue
    }

    // Fallback: assign from selectedLangs order if available
    const fallbackLang = COMMON_DEMO_LANGS[index % COMMON_DEMO_LANGS.length]?.code || "en";
    return { lang: fallbackLang, url: trimmed };
  }, []);

  const handleFetchSubtitles = useCallback(async () => {
    const trimmedSubtitlesInput = subtitlesUrlsInput.trim();
    const lines = trimmedSubtitlesInput
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    // Requirement 1.2: The video id is to be extracted from 1.1 (subtitles URL)
    let extractedVideoId = parseVideoId(videoUrlInput);
    if (lines.length > 0) {
      const idFromSub = extractVideoIdFromSubtitlesUrl(lines[0]);
      if (idFromSub) {
        extractedVideoId = idFromSub;
      }
    }

    if (!extractedVideoId) {
      setStatusType("error");
      setStatusMessage("Please enter a valid YouTube video URL or ID.");
      return;
    }

    if (!trimmedSubtitlesInput) {
      onLoadVideoAndSubtitles({
        videoId: extractedVideoId,
        tracks: {},
      });
      setStatusType("info");
      setStatusMessage(
        `Video ${extractedVideoId} loaded. Enter subtitle URLs below to fetch captions.`,
      );
      return;
    }

    setIsFetching(true);
    setStatusType("info");
    setStatusMessage("Fetching and validating subtitle streams per language…");

    const entriesToFetch: ParsedUrlEntry[] = [];

    // Check if input is a single timedtext URL template
    const isSingleTimedtextBase =
      lines.length === 1 && lines[0].includes("youtube.com/api/timedtext");

    if (isSingleTimedtextBase) {
      const baseUrl = lines[0];
      try {
        const u = new URL(baseUrl);
        const originalLang = u.searchParams.get("lang") || "en";

        // Always fetch original URL first with its authentic language
        entriesToFetch.push({ lang: originalLang, url: baseUrl });

        for (const targetCode of selectedLangs) {
          if (targetCode === originalLang) continue;
          const derived = new URL(baseUrl);
          derived.searchParams.set("lang", originalLang);
          derived.searchParams.set("tlang", targetCode);
          entriesToFetch.push({ lang: targetCode, url: derived.toString() });
        }
      } catch {
        entriesToFetch.push({ lang: "en", url: baseUrl });
      }
    } else {
      for (let i = 0; i < lines.length; i++) {
        const parsed = extractLangFromLine(lines[i], i);
        if (parsed) entriesToFetch.push(parsed);
      }
    }

    if (entriesToFetch.length === 0) {
      setIsFetching(false);
      setStatusType("error");
      setStatusMessage("Could not parse any valid subtitle URLs from input.");
      return;
    }

    const loadedTracks: Record<string, Json3> = {};
    const successLangs: string[] = [];
    const failedLangs: string[] = [];
    const serverUrl = getFetchServerUrl();

    for (const entry of entriesToFetch) {
      try {
        let text = "";
        let parsed: Json3 | null = null;

        // 1. Try direct fetch first
        try {
          const res = await fetch(entry.url);
          if (res.ok) {
            text = await res.text();
            parsed = parseJson3(text);
          }
        } catch {
          // Direct fetch failed (e.g. CORS on browser)
        }

        // 2. If direct fetch failed and URL is a YouTube timedtext URL, use the server proxy
        if (!parsed && entry.url.includes("youtube.com/api/timedtext") && serverUrl) {
          const proxyRes = await fetchViaServer(serverUrl, entry.url);
          if (proxyRes.status === 200 && proxyRes.body) {
            text = proxyRes.body;
            parsed = parseJson3(text);
          }
        }

        if (parsed && isValidJsonSubtitleResponse(parsed)) {
          loadedTracks[entry.lang] = parsed;
          successLangs.push(entry.lang);
        } else {
          failedLangs.push(entry.lang);
        }
      } catch {
        failedLangs.push(entry.lang);
      }
    }

    setIsFetching(false);

    if (successLangs.length > 0) {
      setStatusType("success");
      const summary = successLangs
        .map((l) => `${l.toUpperCase()} (${loadedTracks[l]?.events?.length || 0} cues)`)
        .join(", ");
      setStatusMessage(
        `Successfully loaded ${successLangs.length} subtitle track${successLangs.length > 1 ? "s" : ""}: ${summary}${
          failedLangs.length > 0 ? ` (Failed: ${failedLangs.join(", ")})` : ""
        }`,
      );

      onLoadVideoAndSubtitles({
        videoId: extractedVideoId,
        tracks: loadedTracks,
        observedUrl: lines[0]?.startsWith("http") ? lines[0] : undefined,
      });
    } else {
      setStatusType("error");
      setStatusMessage(
        `Failed to fetch valid JSON3 subtitles from provided URLs. Ensure URLs return valid YouTube json3 timedtext or local fixtures.`,
      );
    }
  }, [
    videoUrlInput,
    subtitlesUrlsInput,
    selectedLangs,
    extractLangFromLine,
    onLoadVideoAndSubtitles,
  ]);

  const handleUseSampleFixtures = useCallback(() => {
    const sampleId = "L2Ryrr6txwA";
    setVideoUrlInput(`https://www.youtube.com/watch?v=${sampleId}`);
    setSubtitlesUrlsInput(
      `/fixtures/${sampleId}/en.json\n/fixtures/${sampleId}/he.json\n/fixtures/${sampleId}/es.json\n/fixtures/${sampleId}/de.json`,
    );
    setSelectedLangs(["en", "he", "es", "de"]);
    setStatusType("info");
    setStatusMessage(
      "Populated sample local fixtures. Click 'Fetch Subtitles per Language' to load.",
    );
  }, []);

  const handleToggleLang = (code: string) => {
    setSelectedLangs((prev) =>
      prev.includes(code)
        ? prev.length > 1
          ? prev.filter((c) => c !== code)
          : prev
        : [...prev, code],
    );
  };

  const handlePrimarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = videoUrlInput.trim();
    if (!trimmedInput) {
      setStatusType("error");
      setStatusMessage("Please enter a YouTube video URL or subtitle URL.");
      return;
    }

    // Check if user entered a timedtext or direct subtitle JSON URL directly in main input
    const isTimedTextOrSubtitleUrl =
      trimmedInput.includes("/api/timedtext") ||
      trimmedInput.endsWith(".json") ||
      trimmedInput.includes("/fixtures/");

    if (isTimedTextOrSubtitleUrl) {
      setIsFetching(true);
      setStatusType("info");
      setStatusMessage("Fetching subtitles from URL...");

      try {
        let extractedVideoId = parseVideoId(trimmedInput);
        if (!extractedVideoId) {
          try {
            const parsedUrl = new URL(trimmedInput, window.location.origin);
            extractedVideoId = parsedUrl.searchParams.get("v") || currentVideoId;
          } catch {
            extractedVideoId = currentVideoId;
          }
        }
        if (!extractedVideoId) {
          extractedVideoId = currentVideoId || "vBURridJXZ0";
        }

        // Determine language code
        let targetLang = "en";
        try {
          const parsedUrl = new URL(trimmedInput, window.location.origin);
          targetLang =
            parsedUrl.searchParams.get("tlang") || parsedUrl.searchParams.get("lang") || "en";
          const pathMatch = parsedUrl.pathname.match(/\/([a-z]{2,3}(?:-[A-Za-z0-9]+)?)\.json$/i);
          if (pathMatch) {
            targetLang = pathMatch[1].toLowerCase();
          }
        } catch {
          // ignore
        }

        let parsed: Json3 | null = null;

        // Try direct fetch first
        try {
          const resp = await fetch(trimmedInput);
          if (resp.ok) {
            const text = await resp.text();
            parsed = parseJson3(text);
          }
        } catch {
          // Direct fetch failed (e.g. CORS)
        }

        // If direct fetch didn't yield valid json3 and it's an HTTP URL, try server proxy
        if (!parsed || !isValidJsonSubtitleResponse(parsed)) {
          if (trimmedInput.startsWith("http")) {
            const proxyResp = await fetchViaServer(trimmedInput, getFetchServerUrl());
            if (proxyResp && proxyResp.status === 200 && proxyResp.body) {
              parsed = parseJson3(proxyResp.body);
            }
          }
        }

        setIsFetching(false);

        if (parsed && isValidJsonSubtitleResponse(parsed)) {
          setStatusType("success");
          setStatusMessage(
            `Successfully loaded ${targetLang.toUpperCase()} subtitles (${parsed.events?.length || 0} cues) for video ${extractedVideoId}.`,
          );
          onLoadVideoAndSubtitles({
            videoId: extractedVideoId,
            tracks: { [targetLang]: parsed },
            observedUrl: trimmedInput.startsWith("http") ? trimmedInput : undefined,
          });
          return;
        } else {
          setStatusType("error");
          setStatusMessage("Fetched payload was not valid YouTube json3 subtitles.");
          return;
        }
      } catch (err) {
        setIsFetching(false);
        setStatusType("error");
        setStatusMessage(
          `Error fetching subtitle URL: ${err instanceof Error ? err.message : String(err)}`,
        );
        return;
      }
    }

    // Standard YouTube video URL / ID handling
    const extractedVideoId = parseVideoId(videoUrlInput);
    if (!extractedVideoId) {
      setStatusType("error");
      setStatusMessage("Enter a valid YouTube link or video ID.");
      return;
    }

    // If subtitle URLs are supplied and expanded, fetch them
    if (isExpanded && subtitlesUrlsInput.trim()) {
      void handleFetchSubtitles();
      return;
    }

    // Otherwise load the video cleanly
    onLoadVideoAndSubtitles({
      videoId: extractedVideoId,
      tracks: {},
    });
    setStatusType("info");
    setStatusMessage(`Loaded video ${extractedVideoId}.`);
  };

  return (
    <div
      className={`max-w-2xl mx-auto space-y-2 ${className}`}
      data-testid="web-demo-urls-input-container"
    >
      {/* 1. Original Clean Single-Row Input Form (Preserves Old Design 100%) */}
      <form
        id="youtube-url-form"
        data-testid="youtube-url-form"
        onSubmit={handlePrimarySubmit}
        className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-sm text-card-foreground"
      >
        <input
          id="youtube-url-input"
          data-testid="youtube-url-input"
          aria-label="YouTube video URL or ID"
          type="text"
          value={videoUrlInput}
          onChange={(e) => setVideoUrlInput(e.target.value)}
          placeholder="Paste YouTube video link or subtitle URL (e.g. timedtext or json3)"
          className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <Button id="play-video-button" data-testid="play-video-button" type="submit" size="sm">
          Load video
        </Button>
        <Button
          id="toggle-web-demo-subtitles-drawer"
          data-testid="toggle-web-demo-subtitles-drawer"
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          title="Supply subtitles per language by URL"
          aria-expanded={isExpanded}
        >
          <span>Subtitles</span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </Button>
      </form>

      {/* Live Feedback Banner */}
      {statusMessage && (
        <div
          data-testid="web-demo-status-banner"
          className={`p-2 rounded-lg text-xs flex items-start gap-2 border ${
            statusType === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800"
              : statusType === "error"
                ? "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800"
                : "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800"
          }`}
        >
          {statusType === "success" ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 mt-0.5" />
          ) : statusType === "error" ? (
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 mt-0.5" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 shrink-0 text-blue-600 animate-spin mt-0.5" />
          )}
          <div className="flex-1 leading-relaxed">{statusMessage}</div>
        </div>
      )}

      {/* 2. Collapsible Custom Subtitles Input Drawer - Hidden by default */}
      {isExpanded && (
        <div
          id="web-demo-subtitles-drawer"
          data-testid="web-demo-subtitles-drawer"
          className="rounded-xl border border-border bg-card p-3 shadow-sm text-card-foreground text-xs space-y-2.5 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-medium text-foreground">
                Provide Subtitle URLs per Language:
              </span>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                (or configure per language directly in the Languages table below)
              </span>
            </div>
            <button
              type="button"
              onClick={handleUseSampleFixtures}
              className="text-primary hover:underline flex items-center gap-1 font-medium"
            >
              <FileText className="w-3 h-3" /> Load Sample Fixtures
            </button>
          </div>

          <div>
            <textarea
              id="web-demo-subtitles-urls-input"
              data-testid="web-demo-subtitles-urls-input"
              rows={2}
              value={subtitlesUrlsInput}
              onChange={(e) => setSubtitlesUrlsInput(e.target.value)}
              placeholder="Paste one or more URLs per language (e.g. es: https://..., or /fixtures/L2Ryrr6txwA/he.json, or timedtext URL)"
              className="w-full font-mono text-xs rounded-md border border-input bg-background p-2 focus:outline-none focus:ring-1 focus:ring-ring resize-y"
            />
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Formats: <code>lang: URL</code> (e.g. <code>he: https://...</code>), relative fixture
              path, or YouTube timedtext URL.
            </p>
          </div>

          {/* Target language selector chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-muted-foreground mr-1">Target Languages:</span>
            {COMMON_DEMO_LANGS.map((lang) => {
              const isSelected = selectedLangs.includes(lang.code);
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleToggleLang(lang.code)}
                  className={`text-[11px] px-1.5 py-0.5 rounded border transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary font-medium"
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  {lang.name}
                </button>
              );
            })}
          </div>

          <div className="pt-1 flex items-center justify-between gap-2">
            <Button
              id="fetch-web-demo-subtitles-button"
              data-testid="fetch-web-demo-subtitles-button"
              type="button"
              size="sm"
              disabled={isFetching}
              onClick={handleFetchSubtitles}
            >
              {isFetching ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Fetching Subtitles…
                </>
              ) : (
                "Fetch Subtitles per Language"
              )}
            </Button>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="text-[11px] text-muted-foreground hover:text-foreground underline"
            >
              Close
            </button>
          </div>

          {/* Live Feedback Banner */}
          {statusMessage && (
            <div
              data-testid="web-demo-status-banner"
              className={`p-2 rounded-lg text-xs flex items-start gap-2 border ${
                statusType === "success"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800"
                  : statusType === "error"
                    ? "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800"
                    : "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800"
              }`}
            >
              {statusType === "success" ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 mt-0.5" />
              ) : statusType === "error" ? (
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 mt-0.5" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 shrink-0 text-blue-600 animate-spin mt-0.5" />
              )}
              <div className="flex-1 leading-relaxed">{statusMessage}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
