import { useEffect, useRef, useState } from "react";
import type { ConnectionState, Order } from "../types";

interface UseOrderStreamResult {
  status: ConnectionState;
  isStale: boolean;
}

const STREAM_URL = "http://localhost:4000/api/orders/stream";

export const STALE_THRESHOLD_MS = 10_000;
export const MAX_RECONNECT_ATTEMPTS = 10;

const BACKOFF_STEPS_MS = [1000, 2000, 4000, 8000, 16000, 30000];

function backoffDelay(attempt: number): number {
  const base =
    BACKOFF_STEPS_MS[Math.min(attempt, BACKOFF_STEPS_MS.length - 1)] ?? 30_000;
  const jitter = 1 + (Math.random() - 0.5) * 0.4;
  return Math.round(base * jitter);
}

export function useOrderStream(
  onOrder: (order: Order) => void,
): UseOrderStreamResult {
  const [status, setStatus] = useState<ConnectionState>("connecting");
  const [isStale, setIsStale] = useState(false);

  const onOrderRef = useRef(onOrder);
  const esRef = useRef<EventSource | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const lastEventAtRef = useRef<number>(Date.now());

  useEffect(() => {
    onOrderRef.current = onOrder;
  });

  useEffect(() => {
    let cancelled = false;

    function connect() {
      if (cancelled) return;
      const es = new EventSource(STREAM_URL);
      esRef.current = es;

      es.addEventListener("open", () => {
        if (cancelled) return;
        attemptRef.current = 0;
        setStatus("connected");
      });

      es.addEventListener("order", (e) => {
        if (cancelled) return;
        lastEventAtRef.current = Date.now();
        setIsStale(false);
        const order = JSON.parse((e as MessageEvent).data) as Order;
        onOrderRef.current(order);
      });

      es.addEventListener("error", () => {
        if (cancelled) return;
        es.close();
        esRef.current = null;

        if (attemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setStatus("disconnected");
          return;
        }
        const delay = backoffDelay(attemptRef.current);
        attemptRef.current += 1;
        setStatus("reconnecting");
        retryTimerRef.current = setTimeout(connect, delay);
      });
    }

    lastEventAtRef.current = Date.now();
    connect();

    return () => {
      cancelled = true;
      if (retryTimerRef.current !== null) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (esRef.current !== null) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (Date.now() - lastEventAtRef.current > STALE_THRESHOLD_MS) {
        setIsStale(true);
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return { status, isStale };
}
