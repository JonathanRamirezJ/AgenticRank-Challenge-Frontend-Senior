import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_RECONNECT_ATTEMPTS,
  STALE_THRESHOLD_MS,
  useOrderStream,
} from "../hooks/useOrderStream";
import type { Order } from "../types";

type EventName = "open" | "order" | "error";

class MockEventSource {
  static instances: MockEventSource[] = [];
  listeners = new Map<EventName, Set<(e: unknown) => void>>();
  closed = false;
  url: string;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(name: EventName, cb: (e: unknown) => void) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name)!.add(cb);
  }

  removeEventListener(name: EventName, cb: (e: unknown) => void) {
    this.listeners.get(name)?.delete(cb);
  }

  close() {
    this.closed = true;
  }

  emit(name: EventName, payload?: unknown) {
    this.listeners.get(name)?.forEach((cb) => cb(payload));
  }

  emitOrder(order: Order) {
    this.emit("order", { data: JSON.stringify(order) });
  }
}

const SAMPLE_ORDER: Order = {
  id: "ord_test",
  customerName: "Sam",
  restaurantName: "Tony's Pizza",
  items: [{ name: "Margherita", quantity: 1, unitPrice: 1450 }],
  total: 1450,
  status: { kind: "pending", placedAt: "2026-05-25T15:00:00.000Z" },
};

beforeEach(() => {
  MockEventSource.instances = [];
  vi.stubGlobal("EventSource", MockEventSource);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useOrderStream", () => {
  it("starts in connecting and transitions to connected on open", () => {
    const { result } = renderHook(() => useOrderStream(() => {}));
    expect(result.current.status).toBe("connecting");
    expect(result.current.isStale).toBe(false);

    act(() => MockEventSource.instances[0]!.emit("open"));
    expect(result.current.status).toBe("connected");
  });

  it("forwards order events to the callback and clears stale", () => {
    const received: Order[] = [];
    const { result } = renderHook(() =>
      useOrderStream((o) => received.push(o)),
    );
    const es = MockEventSource.instances[0]!;
    act(() => es.emit("open"));

    // Force stale to true by jumping past the threshold.
    act(() => {
      vi.advanceTimersByTime(STALE_THRESHOLD_MS + 1500);
    });
    expect(result.current.isStale).toBe(true);

    act(() => es.emitOrder(SAMPLE_ORDER));
    expect(received).toHaveLength(1);
    expect(received[0]?.id).toBe("ord_test");
    expect(result.current.isStale).toBe(false);
  });

  it("flips to reconnecting on error and retries after a backoff", () => {
    const { result } = renderHook(() => useOrderStream(() => {}));
    const first = MockEventSource.instances[0]!;
    act(() => first.emit("open"));

    act(() => first.emit("error"));
    expect(result.current.status).toBe("reconnecting");
    expect(first.closed).toBe(true);

    // Drain the scheduled retry.
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(MockEventSource.instances.length).toBeGreaterThan(1);

    const second = MockEventSource.instances.at(-1)!;
    act(() => second.emit("open"));
    expect(result.current.status).toBe("connected");
  });

  it("gives up after MAX_RECONNECT_ATTEMPTS consecutive failures", () => {
    const { result } = renderHook(() => useOrderStream(() => {}));

    for (let i = 0; i <= MAX_RECONNECT_ATTEMPTS; i++) {
      const es = MockEventSource.instances.at(-1)!;
      act(() => es.emit("error"));
      act(() => {
        vi.advanceTimersByTime(60_000);
      });
    }

    expect(result.current.status).toBe("disconnected");
  });

  it("closes the EventSource and clears timers on unmount", () => {
    const { unmount } = renderHook(() => useOrderStream(() => {}));
    const es = MockEventSource.instances[0]!;
    expect(es.closed).toBe(false);

    unmount();
    expect(es.closed).toBe(true);
    // No further EventSource should be opened by pending retries.
    const countBefore = MockEventSource.instances.length;
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(MockEventSource.instances.length).toBe(countBefore);
  });
});
