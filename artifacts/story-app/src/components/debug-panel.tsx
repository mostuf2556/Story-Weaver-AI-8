import { useEffect, useState } from "react";
import { Bug, X, ChevronDown, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subscribeDebug, type DebugEntry } from "@/hooks/use-story-stream";
import { cn } from "@/lib/utils";

export function isDebugMode(): boolean {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash || "";
  return /(?:^|[#&])debug=true(?:$|&)/i.test(hash);
}

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

/** Show model routing: requested alias → actual resolved model. */
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
        <div className="px-2 pb-2 space-y-2">
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
              {entry.actualModel === entry.requestedModel && (
                <span className="text-[10px] text-muted-foreground/60 italic">
                  (exact match)
                </span>
              )}
            </div>
          )}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
              Request
            </div>
            <pre className="text-[11px] leading-snug bg-background border border-border/40 rounded p-2 overflow-auto max-h-48 font-mono">
              {JSON.stringify(entry.request, null, 2)}
            </pre>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
              Response
            </div>
            <pre className="text-[11px] leading-snug bg-background border border-border/40 rounded p-2 overflow-auto max-h-64 font-mono">
              {JSON.stringify(entry.response, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export function DebugPanel() {
  const [enabled, setEnabled] = useState(isDebugMode());
  const [collapsed, setCollapsed] = useState(false);
  const [entries, setEntries] = useState<DebugEntry[]>([]);

  useEffect(() => {
    const onHash = () => setEnabled(isDebugMode());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const unsub = subscribeDebug((entry) => {
      setEntries((prev) => [entry, ...prev].slice(0, 50));
    });
    return unsub;
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[420px] max-w-[95vw] rounded-lg border border-border/60 bg-card shadow-2xl">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
        <Bug className="w-4 h-4 text-amber-400" />
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
          onClick={() => {
            window.location.hash = "";
            setEnabled(false);
          }}
          aria-label="Close debug"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
      {!collapsed && (
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1.5">
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
