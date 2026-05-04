import { useState, useEffect, useCallback, useRef } from "react";

export interface HealthEntry {
  ts: Date;
  ok: boolean;
  latencyMs: number;
  statusCode?: number;
}

export type HealthStatus = "unknown" | "ok" | "error";

const MAX_HISTORY = 20;

export function useHealthCheck(intervalMs = 30_000) {
  const [status, setStatus] = useState<HealthStatus>("unknown");
  const [history, setHistory] = useState<HealthEntry[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const check = useCallback(async () => {
    const start = Date.now();
    try {
      const res = await fetch("/api/healthz", { cache: "no-store" });
      const latencyMs = Date.now() - start;
      const ok = res.ok;
      const entry: HealthEntry = { ts: new Date(), ok, latencyMs, statusCode: res.status };
      setStatus(ok ? "ok" : "error");
      setHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY));
    } catch {
      const latencyMs = Date.now() - start;
      const entry: HealthEntry = { ts: new Date(), ok: false, latencyMs };
      setStatus("error");
      setHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY));
    }
  }, []);

  useEffect(() => {
    check();
    timerRef.current = setInterval(check, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [check, intervalMs]);

  return { status, history, refetch: check };
}
