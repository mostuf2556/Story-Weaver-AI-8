import { useEffect, useRef, useState } from "react";
import {
  Bug,
  X,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { subscribeDebug, type DebugEntry } from "@/hooks/use-story-stream";
import { cn } from "@/lib/utils";

function StatusBadge({ status }: { status: number | null }) {
  const ok = status !== null && status >= 200 && status < 300;
  const cls = ok
    ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/30"
    : "bg-red-500/15 text-red-300 border-red-400/30";
  return (
    <span
      className={cn(
        "px-1.5 py-0.5 rounded font-mono text-[10px] border",
        cls,
      )}
    >
      {status ?? "ERR"}
    </span>
  );
}

function ModelBadge({ entry }: { entry: DebugEntry }) {
  if (!entry.requestedModel && !entry.actualModel) return null;
  const requested = entry.requestedModel ?? "";
  const actual = entry.actualModel ?? "";
  const isGenericAlias =
    requested.startsWith("openrouter/") || requested === "auto";
  const resolved = actual && actual !== requested;
  return (
    <span className="flex items-center gap-0.5 font-mono text-[10px] text-muted-foreground/80 max-w-[180px] truncate">
      {isGenericAlias ? (
        <span className="text-amber-400/90">{requested}</span>
      ) : (
        <span>{requested.split("/").pop()}</span>
      )}
      {resolved && (
        <>
          <ArrowRight className="w-2.5 h-2.5 shrink-0 text-muted-foreground/50" />
          <span className="text-emerald-400/90">{actual.split("/").pop()}</span>
        </>
      )}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).catch(() => null);
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <Check className="w-3 h-3 text-emerald-400" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
    </button>
  );
}

function SectionBlock({
  label,
  value,
  accent,
}: {
  label: string;
  accent?: "blue" | "amber" | "emerald" | "default";
  value: unknown;
}) {
  const json =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);
  const labelColor =
    accent === "blue"
      ? "text-blue-400/80"
      : accent === "amber"
      ? "text-amber-400/80"
      : accent === "emerald"
      ? "text-emerald-400/80"
      : "text-muted-foreground";
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span
          className={cn(
            "text-[10px] uppercase tracking-wider font-medium",
            labelColor,
          )}
        >
          {label}
        </span>
        <CopyButton text={json} />
      </div>
      <pre className="text-[11px] leading-snug bg-background border border-border/40 rounded p-2 overflow-auto max-h-52 font-mono whitespace-pre-wrap break-all">
        {json}
      </pre>
    </div>
  );
}

function HeadersBlock({
  label,
  headers,
}: {
  label: string;
  headers: Record<string, string>;
}) {
  const lines = Object.entries(headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
          {label}
        </span>
        <CopyButton text={lines} />
      </div>
      <div className="bg-background border border-border/40 rounded p-2 overflow-auto max-h-32 space-y-0.5">
        {Object.entries(headers).map(([k, v]) => (
          <div key={k} className="flex gap-1.5 text-[11px] font-mono">
            <span className="text-blue-300/80 shrink-0">{k}:</span>
            <span className="text-muted-foreground break-all">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Entry({ entry }: { entry: DebugEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border/50 rounded-md bg-background/60">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs"
      >
        {open ? (
          <ChevronDown className="w-3 h-3 shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 shrink-0" />
        )}
        <StatusBadge status={entry.status} />
        <span className="font-mono text-muted-foreground">{entry.method}</span>
        <span className="font-mono truncate flex-1">{entry.endpoint}</span>
        <ModelBadge entry={entry} />
        <span className="text-muted-foreground tabular-nums shrink-0">
          {entry.durationMs}ms
        </span>
      </button>

      {open && (
        <div className="px-2 pb-3 space-y-2.5">
          {/* Model routing row */}
          {(entry.requestedModel || entry.actualModel) && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/30 border border-border/30">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Model
              </span>
              <span className="font-mono text-[11px] text-amber-400/90">
                {entry.requestedModel ?? "—"}
              </span>
              {entry.actualModel && entry.actualModel !== entry.requestedModel && (
                <>
                  <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                  <span className="font-mono text-[11px] text-emerald-400/90">
                    {entry.actualModel}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60 italic">
                    (resolved)
                  </span>
                </>
              )}
              {entry.actualModel && entry.actualModel === entry.requestedModel && (
                <span className="text-[10px] text-muted-foreground/60 italic">
                  (exact match)
                </span>
              )}
            </div>
          )}

          {/* ── Browser → API ── */}
          <div className="text-[10px] uppercase tracking-wider text-blue-400/70 font-semibold pt-0.5">
            Browser → API
          </div>

          {entry.requestHeaders && Object.keys(entry.requestHeaders).length > 0 && (
            <HeadersBlock
              label="Request headers"
              headers={entry.requestHeaders}
            />
          )}

          <SectionBlock label="Request body" value={entry.request} accent="blue" />

          {entry.responseHeaders && Object.keys(entry.responseHeaders).length > 0 && (
            <HeadersBlock
              label="Response headers"
              headers={entry.responseHeaders}
            />
          )}

          <SectionBlock
            label="Response body"
            value={entry.response}
            accent="default"
          />

          {/* ── API → OpenRouter ── */}
          {(entry.openrouterRequest || entry.openrouterResponse) && (
            <>
              <div className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold pt-0.5 border-t border-border/30 mt-1">
                API → OpenRouter
              </div>

              {entry.openrouterRequest && (
                <SectionBlock
                  label="OpenRouter request payload"
                  value={entry.openrouterRequest}
                  accent="emerald"
                />
              )}

              {entry.openrouterResponse && (
                <SectionBlock
                  label="OpenRouter completion"
                  value={entry.openrouterResponse}
                  accent="amber"
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface DebugPanelProps {
  /** When provided, controls open/close from outside (replaces hash-based toggle). */
  open?: boolean;
  onClose?: () => void;
}

export function DebugPanel({ open: openProp, onClose }: DebugPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [entries, setEntries] = useState<DebugEntry[]>([]);

  const isOpen = openProp ?? false;

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeDebug((entry) => {
      setEntries((prev) => [entry, ...prev].slice(0, 100));
    });
    return unsub;
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[480px] max-w-[95vw] rounded-lg border border-border/60 bg-card shadow-2xl">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
        <Bug className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="text-sm font-medium font-sans">Debug</span>
        <span className="text-xs text-muted-foreground">
          {entries.length} request{entries.length === 1 ? "" : "s"}
        </span>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => setEntries([])}
        >
          Clear
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClose}
          aria-label="Close debug panel"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
      {!collapsed && (
        <div className="max-h-[65vh] overflow-y-auto p-2 space-y-1.5">
          {entries.length === 0 ? (
            <div className="text-xs text-muted-foreground italic px-2 py-4 text-center">
              No requests captured yet. Send a paragraph or trigger an AI turn.
            </div>
          ) : (
            entries.map((e) => <Entry key={e.id} entry={e} />)
          )}
        </div>
      )}
    </div>
  );
}
