# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

LiveBoard is a real-time order management dashboard used as the **AgenticRank Frontend Senior technical challenge**. The `README.md` describes the intended architecture, but several pieces of it are **deliberately not implemented or are buggy** — that is the substance of the challenge. Treat `README.md` as a spec, not as a description of current code.

## Commands

```bash
pnpm install
pnpm dev          # Vite on :5173 + Express mock backend on :4000 (concurrently, both killed on Ctrl-C)
pnpm build        # tsc -b && vite build
pnpm test         # vitest run (single pass)
pnpm test:watch   # vitest in watch mode
pnpm lint         # eslint .
```

Run a single test file: `pnpm test src/test/FilterBar.test.tsx`
Run a single test by name: `pnpm test -t "persists query"`

## Architecture

Single-page React app talking to a local Express mock backend.

- **Data flow**: `App.tsx` fetches an initial snapshot from `GET /api/orders` (`src/api.ts`), then subscribes to live `order` events via SSE through `useOrderStream` (`src/hooks/useOrderStream.ts`). New orders are prepended to a single `orders` state array. `OrderList` filters + sorts in-render on every update.
- **Backend** (`server/index.js`): seeds 50 orders spread across the last ~30 min, then streams one new order every 500 ms over `/api/orders/stream`. Plain JS, disposable, **do not modify** — treat it as if it were a deployed service. The header comment in the file states this explicitly.
- **Money**: `order.total` and `unitPrice` are integer **cents**. Always divide by 100 before formatting with `Intl.NumberFormat`.
- **Order status** is a discriminated union (`OrderStatus` in `src/types.ts`) keyed on `kind`. Each variant carries different timestamp fields — use a `switch` on `kind` (see `statusTimestamp` in `OrderRow.tsx`) rather than indexing optional fields.
- **TS config** is strict with `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`. Array access returns `T | undefined`; handle it.
- **Tests** use Vitest + jsdom + Testing Library. `src/test/setup.ts` calls `cleanup()` and `localStorage.clear()` after each test, so persistence-style tests must drive state through user interactions, not by pre-seeding storage.

## Known gaps between README and code (the challenge surface)

The README advertises behavior the code does not (yet) implement. Future work in this repo is largely about closing these gaps. Verify the current state of the code before assuming any of these are done.

- **`React.memo`**: README says "all components memoized via `React.memo`". As of the initial commit, **no component uses `React.memo`** and `OrderList` recomputes `filter` + `sort` + `Intl.NumberFormat` on every parent render (every 500 ms). This is a real perf hotspot once the orders array grows.
- **SSE reconnection**: README says `useOrderStream` has "automatic reconnection and exponential backoff". The current hook just constructs an `EventSource`, never listens for `error`/`open`, and hard-codes `status: "connected"` — the `ConnectionState` union (`connecting | connected | disconnected | reconnecting`) is defined but unused.
- **Filter persistence**: README says filters are persisted to `localStorage` and restored on mount, and the failing test `FilterBar > persists query across remounts via localStorage` asserts this. `FilterBar.tsx` contains **no `localStorage` code** — the test is expected to fail until persistence is implemented. The README's "Known issues" line about filters "feeling like they reset" is the same bug surfacing in production.
- **`useOrderStream` callback identity**: the hook lists `onOrder` in its effect deps and `App.tsx` passes a fresh inline arrow each render — every render currently tears down and recreates the `EventSource`. Stabilize the callback (or read it from a ref) before changing reconnection logic, or you will fight this behavior.
- **`OrdersPerMinuteChart.bucketByMinute`** has a no-op ternary (`o.status.kind === "cancelled" ? o.status.placedAt : o.status.placedAt`) — left over from a prior shape. Both branches read the same field; safe to simplify.

When fixing any of these, make the README's claim true rather than rewriting the README to match the code.

## Conventions worth knowing

- Components are function components with a local `Props` interface; no default exports.
- CSS lives next to each component as `Component.css` and is imported by the component file. Vitest disables CSS (`vite.config.ts`), so styling does not affect tests.
- Dark theme is implicit in the palette (`#00e5a0` accent, `#111`/`#1f1f1f` surfaces) — keep new UI consistent with this.
- The commit `04968b0 Remove giveaway comment in OrderRow` indicates earlier versions of this repo contained hints in comments. Do not add explanatory comments that telegraph the challenge's gotchas back into the code.
