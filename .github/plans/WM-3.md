# WM-3: Socket Lifecycle Cleanup for Meeting Room Presence

## 1. Feature Summary

This feature hardens the socket disconnect lifecycle in the `SignalingGateway` so that both abrupt and graceful disconnections reliably remove the departing socket from all meeting room presence entries and broadcast `participant-left` to remaining members. It also introduces a per-socket reverse index (`socketId -> Set<meetingId>`) to replace the current O(n-rooms) scan, and adds the missing unit test for the no-rooms-joined disconnect path.

---

## 2. Problem Statement

When a Socket.IO client disconnects ungracefully (network drop, tab close, process kill) it never emits `leave-room`. The server must proactively clean up presence state on disconnect or stale entries accumulate in the in-memory map, causing other participants to see ghost attendees indefinitely. The current `cleanupSocket` implementation iterates **all rooms globally** to find ones the socket belongs to -- this is O(n) in the number of rooms across all active meetings, which degrades as load grows. A reverse index makes cleanup O(k) where k is the number of rooms the disconnecting socket had joined (typically 1).

---

## 3. Technical Design

### Affected Modules

- `src/signaling/signaling.gateway.ts` -- add reverse index, update cleanup path, add per-room disconnect logging
- `src/signaling/signaling.gateway.spec.ts` -- add missing unit test for disconnect with no rooms joined

### Services to Modify or Create

**SignalingGateway** -- extend with:

- `private readonly socketRooms = new Map<string, Set<string>>()` -- reverse index: `socketId -> Set<meetingId>`
- Update `addToRoom()` to register the entry in `socketRooms`
- Update `removeFromRoom()` to remove the entry from `socketRooms`; delete the `socketId` key when its set becomes empty
- Rewrite `cleanupSocket()` to look up only the socket's own rooms via `socketRooms` instead of iterating all rooms globally; snapshot the set as an array before iterating to avoid mutation-during-iteration issues
- Log departure per room with `socketId`, `userId`, and `meetingId` (already done in `removeFromRoomAndBroadcast` -- verify log format covers all three fields)

### Database Changes

None. Feature is entirely in-memory.

### API Endpoints (WebSocket Events)

No new events. Existing `participant-left` broadcast is reused.

### Validation Rules

- `cleanupSocket` must be a no-op (no errors, no broadcasts) when the socket is not present in any room -- guard with early return if `socketRooms.get(socket.id)` is undefined or empty.

---

## 4. Edge Cases

1. **Disconnect with no rooms joined** -- `socketRooms.get(socket.id)` returns `undefined`; `cleanupSocket` must return early and emit no events.
2. **Mutation during iteration** -- snapshot the set of `meetingId`s as `Array.from(...)` before the loop; `removeFromRoom` modifies `socketRooms` (deletes it) mid-loop so iterating the live Set is unsafe.
3. **Socket in multiple rooms** -- must broadcast `participant-left` for each room independently; all broadcasts must complete.
4. **Socket was never authenticated** -- `socket.data.user` is undefined; `removeFromRoomAndBroadcast` still works because it uses `socketId` (not `userId`) as the presence key; `userId` only appears in the log and in the emitted payload (sourced from the stored `ParticipantInfo`, not `socket.data.user`).
5. **Room becomes empty after last participant** -- `removeFromRoom` deletes the `meetingId` key from `this.rooms`; `socketRooms` must also be cleaned up on the same call.
6. **Race between connect and disconnect** -- JavaScript is single-threaded; no true concurrency; ordering is guaranteed within the event loop tick.
7. **`leave-room` followed by disconnect** -- socket already removed from room on `leave-room`; subsequent `cleanupSocket` call on disconnect must be a no-op for that room (handled by `removeFromRoom` returning `undefined`).

---

## 5. Implementation Plan

### Step 1: Add the reverse index

Add `private readonly socketRooms = new Map<string, Set<string>>()` to `SignalingGateway`. This maps each `socketId` to the set of `meetingId`s that socket has joined.

### Step 2: Update `addToRoom` to maintain the reverse index

After inserting the `ParticipantInfo` into `this.rooms`, also add `meetingId` to `this.socketRooms.get(socketId)`. If no entry exists for the `socketId`, create a new `Set` first.

### Step 3: Update `removeFromRoom` to maintain the reverse index

After deleting `socketId` from the inner map in `this.rooms`, also remove `meetingId` from `this.socketRooms.get(socketId)`. If the resulting set is empty, delete the `socketId` key from `this.socketRooms`.

### Step 4: Rewrite `cleanupSocket` to use the reverse index

Replace the `for (const meetingId of this.rooms.keys())` loop with:

1. Look up `this.socketRooms.get(socket.id)` -- if undefined or empty, return early.
2. Snapshot the set as `Array.from(...)` before iterating (since `removeFromRoom` will mutate `socketRooms` during the loop).
3. Call `removeFromRoomAndBroadcast(meetingId, socket)` for each `meetingId` in the snapshot.

### Step 5: Verify per-room disconnect logging

Confirm that `removeFromRoomAndBroadcast` logs `meetingId`, `socketId`, and `userId` for every room cleaned up. The current log line reads: `User left room: meetingId=... socketId=... userId=...` -- this satisfies FR5.

### Step 6: Add missing unit test

Add a test in `describe('handleDisconnect')`:

- **"should produce no errors or broadcasts when socket was in no rooms"** -- call `gateway.handleDisconnect(socket)` on a socket that never joined any room; assert that `server.to` was never called and no error was emitted.

---

## 6. Implementation Order

1. Add `socketRooms` reverse index field to `SignalingGateway`
2. Update `addToRoom` to register in `socketRooms`
3. Update `removeFromRoom` to deregister from `socketRooms`
4. Rewrite `cleanupSocket` to use `socketRooms` with a snapshot array
5. Verify logging in `removeFromRoomAndBroadcast` covers all three required fields
6. Add missing unit test for disconnect with no rooms joined
7. Run `pnpm lint` -- clean
8. Run `pnpm test` -- all tests pass

---

## 7. Task Breakdown

- [ ] Add `private readonly socketRooms = new Map<string, Set<string>>()` to `SignalingGateway`
- [ ] In `addToRoom`: after `this.rooms.get(meetingId)!.set(socketId, participant)`, add `meetingId` to `socketRooms.get(socketId)` (create Set if absent)
- [ ] In `removeFromRoom`: after `room.delete(socketId)`, remove `meetingId` from `socketRooms.get(socketId)`; delete `socketId` key if set becomes empty
- [ ] Rewrite `cleanupSocket` to snapshot `socketRooms.get(socket.id)` as array and iterate only those rooms; return early if none
- [ ] Verify log format in `removeFromRoomAndBroadcast` includes `meetingId`, `socketId`, and `userId`
- [ ] Add unit test: `handleDisconnect` on socket with no rooms joined -> `server.to` never called
- [ ] Run `pnpm lint` and confirm clean
- [ ] Run `pnpm test` and confirm all tests pass
