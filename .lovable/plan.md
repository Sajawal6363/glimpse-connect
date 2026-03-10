

# Fix Build Errors, Streaming Issues & Enhancements

## Build Errors to Fix

### 1. Duplicate `Profile` identifier in `App.tsx` (line 10 vs 27)
- Line 10 imports `type Profile` from `@/lib/supabase`
- Line 27 imports `Profile` page component from `./pages/Profile`
- Fix: Rename the page import to `ProfilePage` and update the route usage on line 190

### 2. Type cast error in `useSocialStore.ts` (line 344)
- `Record<string, unknown>` cast to `Follow` fails
- Fix: Cast through `unknown` first: `(r as unknown as Follow)`

## Streaming Not Finding Matches

The matchmaking uses Supabase Realtime Presence. The core issue is that the `_tryMatch` method in `matchmaking.ts` has both peers racing to initiate a match — both send `match-request` and both accept locally. This causes a double-match race condition where signaling breaks.

### Fixes:
- **Deterministic initiator**: Only the user with the lexicographically smaller ID should initiate the match request. The other side waits for the `match-request` broadcast.
- **Increase timeout**: 30s is too short for low-traffic apps — increase to 120s with a retry mechanism.
- **Fix callback accumulation**: `onMatch`/`onTimeout` callbacks accumulate on re-queue (skip). Clear them on `joinQueue`.

## Group Call Stuck on "Connecting"

In `GroupStream.tsx`, `autoAccept()` sets status to `"connected"` immediately after sending `accept` signal (line 472-473), but no WebRTC peer connections exist yet. The status should stay `"connecting"` until `ontrack` fires.

### Fix:
- Keep status as `"connecting"` in `autoAccept` until the first peer's `ontrack` event fires (already handled in `createPeerConnection` line 312-318 via `setStatus`)
- Remove the premature `setStatus("connected")` on line 473

## Online Users Count on Stream Page

Add a live online user counter on the Stream page idle state by reading from `realtimeService.getOnlineUsers()` and subscribing to presence changes.

## Enhancements

1. **Better search UX**: Show online user count and estimated wait time on idle screen
2. **Auto-retry on timeout**: Instead of going back to idle, offer a "Try Again" button and auto-retry
3. **Connection status indicator**: Show "Connecting..." state between match found and WebRTC connected
4. **Smooth skip transition**: Add a brief "Finding next person..." state during skip re-queue

## Files to Change

| File | Change |
|------|--------|
| `src/App.tsx` | Rename `Profile` page import to `ProfilePage` |
| `src/stores/useSocialStore.ts` | Fix type cast on line 344 |
| `src/lib/matchmaking.ts` | Fix race condition — only smaller-ID user initiates; clear callbacks on rejoin; increase timeout |
| `src/hooks/useMatchmaking.ts` | Clear old callbacks before registering new ones on rejoin |
| `src/pages/Stream.tsx` | Add online user count display; add "connecting" intermediate state between match and WebRTC; auto-retry |
| `src/pages/GroupStream.tsx` | Remove premature `setStatus("connected")` in `autoAccept` |

