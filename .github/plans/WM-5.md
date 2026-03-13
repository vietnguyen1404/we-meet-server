# WM-5: Production-grade signaling & meeting lifecycle management

---

## 1. Feature Summary

This feature hardens the SignalingGateway for production by extracting in-memory session state into an injectable SignalingSessionService, adding class-validator-based DTO validation for all signaling relay payloads, introducing per-socket sliding-window rate limiting for offer/answer/ice-candidate events, and improving structured logging across every lifecycle event. The design ensures the session service can later be swapped for a Redis-backed adapter without changing any gateway handler code.

---

## 2. Problem Statement

The current gateway inlines all state management (the rooms and socketRooms Maps and their mutation methods) directly in SignalingGateway. This means:

- The state is tightly coupled to a single process instance — adding a second server node would cause split-brain participant lists.
- Payload validation for relay events is done with ad-hoc typeof checks that miss nested payload structure, allowing malformed SDP or ICE objects to be blindly forwarded.
- There is no protection against a misbehaving or compromised client flooding the relay path with thousands of events per second.
- Log output is inconsistent — some paths omit meetingId or userId — making WebRTC debugging from logs alone unreliable.
- Business logic and state management mixed inside the gateway make unit testing hard.

---

## 3. Technical Design

### Affected modules

| Path                                            | Change                                                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| src/signaling/signaling.module.ts               | Register SignalingSessionService as a provider                                             |
| src/signaling/signaling.gateway.ts              | Inject SignalingSessionService; remove inline state; add rate-limit guard; improve logging |
| src/signaling/signaling-session.service.ts      | **New** — owns all session state and exposes the ISignalingSessionService interface        |
| src/signaling/signaling-session.interface.ts    | **New** — defines ISignalingSessionService abstract contract                               |
| src/signaling/dto/relay.dto.ts                  | **New** — OfferDto, AnswerDto, IceCandidateDto validated with class-validator              |
| src/signaling/dto/watch-meeting.dto.ts          | **New** — WatchMeetingDto                                                                  |
| src/signaling/dto/join-room.dto.ts              | **New** — JoinRoomDto                                                                      |
| src/signaling/dto/leave-room.dto.ts             | **New** — LeaveRoomDto                                                                     |
| src/signaling/signaling.gateway.spec.ts         | Update existing spec                                                                       |
| src/signaling/signaling-session.service.spec.ts | **New** — unit tests for session service                                                   |

### Services to modify or create

#### ISignalingSessionService (interface)

Defines the contract the gateway depends on:

- addParticipant(meetingId, socketId, user): ParticipantInfo
- removeParticipant(meetingId, socketId): ParticipantInfo | undefined
- getParticipants(meetingId): ParticipantInfo[]
- getSocketRooms(socketId): Set<string>
- isParticipant(meetingId, socketId): boolean

Keeping the interface separate allows a future RedisSignalingSessionService to be swapped in via NestJS DI token.

#### SignalingSessionService (@Injectable())

- Contains rooms: Map<string, Map<string, ParticipantInfo>> and socketRooms: Map<string, Set<string>>.
- Implements ISignalingSessionService.
- removeParticipant deletes the room entry from rooms when the last participant leaves (last-one-out lifecycle rule).
- Provided as { provide: SIGNALING_SESSION_SERVICE, useClass: SignalingSessionService } using an injection token so the gateway depends on the interface, not the concrete class.

#### SignalingGateway (modify)

- Inject ISignalingSessionService via @Inject(SIGNALING_SESSION_SERVICE).
- Remove the inline rooms, socketRooms, addToRoom, removeFromRoom, getParticipants, cleanupSocket members.
- Add a rateLimiter: Map<socketId, { count: number; windowStart: number }> within the gateway (not the session service) — rate limiting is an I/O concern, not a state concern.
- Validate all payloads using plainToInstance + validateSync from class-validator/class-transformer (same pattern as REST layer uses ValidationPipe).
- Emit structured log context on every event using the fields: event, meetingId, socketId, userId, timestamp.

### Database changes

None — no Prisma schema changes required. The session is entirely in-memory.

### API endpoints

No new REST endpoints. All changes are Socket.IO events. Existing event signatures are preserved; only validation and internal handling change.

### Validation rules

All DTOs use class-validator decorators. Validated manually inside each handler using plainToInstance + validateSync (since ValidationPipe only applies to HTTP — Socket.IO handlers need explicit validation):

| DTO             | Fields         | Rules                               |
| --------------- | -------------- | ----------------------------------- |
| WatchMeetingDto | meetingId      | @IsString() @IsNotEmpty() @IsUUID() |
| JoinRoomDto     | meetingId      | @IsString() @IsNotEmpty() @IsUUID() |
| LeaveRoomDto    | meetingId      | @IsString() @IsNotEmpty() @IsUUID() |
| RelayDto        | meetingId      | @IsString() @IsNotEmpty() @IsUUID() |
| RelayDto        | targetSocketId | @IsString() @IsNotEmpty()           |
| RelayDto        | payload        | @IsNotEmpty() (any object)          |

Validation failures emit error { code: 400, message: <first constraint message> } and return early — no relay occurs.

**Rate limiting (in SignalingGateway):**

- Sliding window: 30 relay events per socket per 10-second window (configurable constants at the top of the file).
- On each relay call: read the socket rate-limit entry, reset window if Date.now() - windowStart >= WINDOW_MS, increment count, reject with error { code: 429 } if count > LIMIT.
- The map is cleaned up on socket disconnect.

---

## 4. Edge Cases

| Scenario                                                   | Handling                                                                                                                                     |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Socket disconnects while handleJoinRoom is awaiting the DB | The disconnect handler fires; since the socket was not yet added to rooms, getSocketRooms returns empty — no-op cleanup, no double broadcast |
| leave-room called when socket is not in the room           | removeParticipant returns undefined; removeFromRoomAndBroadcast no-ops silently                                                              |
| Same socket emits join-room twice for the same meeting     | Guard isParticipant(meetingId, socket.id) returns true — early return, no duplicate participant-joined                                       |
| targetSocketId is the sender own socket.id                 | Relay is allowed (edge case for self-loopback tests); no special restriction needed                                                          |
| payload field on RelayDto is null                          | @IsNotEmpty() catches this and returns 400                                                                                                   |
| Rate limiter Map grows indefinitely                        | Cleared in handleDisconnect for the disconnecting socket entry                                                                               |
| Last participant leaves via disconnect (not leave-room)    | cleanupSocket triggers removeFromRoomAndBroadcast which calls removeParticipant and clears the room Map entry                                |
| Two sockets race to be the last participant                | JavaScript is single-threaded in Node.js; Map mutations are synchronous — no actual race condition                                           |

---

## 5. Implementation Plan

1. **Define the session service interface** — Create src/signaling/signaling-session.interface.ts with ISignalingSessionService, the SIGNALING_SESSION_SERVICE injection token, and re-export ParticipantInfo.

2. **Implement SignalingSessionService** — Move rooms, socketRooms, addToRoom, removeFromRoom, getParticipants, cleanupSocket logic from the gateway into the new service. Implement last-participant room deletion in removeParticipant. Decorate with @Injectable(). Keep the service free of any Server reference — broadcasting stays in the gateway.

3. **Create Socket.IO DTOs** — Add src/signaling/dto/ with WatchMeetingDto, JoinRoomDto, LeaveRoomDto, and RelayDto using class-validator decorators. RelayDto is shared by offer/answer/ice-candidate handlers.

4. **Add a reusable validateSocketPayload helper** — A private gateway method that calls plainToInstance + validateSync and emits a 400 error on the socket if validation fails, returning a typed instance or null.

5. **Add the in-gateway rate limiter** — Add RATE_LIMIT and RATE_WINDOW_MS constants and the rateLimits Map field. Implement checkRateLimit(socket): boolean used by the three relay handlers. Clean up the map entry in handleDisconnect.

6. **Refactor SignalingGateway** — Inject the session service via the DI token. Replace all direct Map access with session service calls. Replace ad-hoc type checks with validateSocketPayload. Add rate-limit calls in the relay handlers. Improve all log calls to include event, meetingId, socketId, userId, and ISO timestamp.

7. **Update SignalingModule** — Register the DI token provider and SignalingSessionService.

8. **Write unit tests for SignalingSessionService** — Test addParticipant, removeParticipant (verifies room deletion on last leave), getParticipants (empty and non-empty), and isParticipant.

---

## 6. Implementation Order

1. Create src/signaling/signaling-session.interface.ts (interface + injection token)
2. Create src/signaling/signaling-session.service.ts (concrete implementation)
3. Create src/signaling/dto/watch-meeting.dto.ts
4. Create src/signaling/dto/join-room.dto.ts
5. Create src/signaling/dto/leave-room.dto.ts
6. Create src/signaling/dto/relay.dto.ts
7. Refactor src/signaling/signaling.gateway.ts (inject service, DTOs, rate limiter, logging)
8. Update src/signaling/signaling.module.ts (register new provider)
9. Write src/signaling/signaling-session.service.spec.ts
10. Verify pnpm build and pnpm test pass with no errors

---

## 7. Task Breakdown

- [ ] Create src/signaling/signaling-session.interface.ts defining ISignalingSessionService and SIGNALING_SESSION_SERVICE token
- [ ] Create src/signaling/signaling-session.service.ts implementing the interface with addParticipant, removeParticipant (with last-participant cleanup), getParticipants, getSocketRooms, isParticipant
- [ ] Create src/signaling/dto/watch-meeting.dto.ts with @IsString() @IsNotEmpty() @IsUUID() meetingId
- [ ] Create src/signaling/dto/join-room.dto.ts with same meetingId validation
- [ ] Create src/signaling/dto/leave-room.dto.ts with same meetingId validation
- [ ] Create src/signaling/dto/relay.dto.ts with meetingId (UUID), targetSocketId (string non-empty), payload (non-empty)
- [ ] Add validateSocketPayload<T>(socket, cls, data): T | null private method to gateway using plainToInstance + validateSync
- [ ] Replace all ad-hoc typeof payload checks in gateway handlers with validateSocketPayload
- [ ] Add RATE_LIMIT = 30 and RATE_WINDOW_MS = 10000 constants and rateLimits Map to gateway
- [ ] Implement checkRateLimit(socketId): boolean in gateway; call it in handleOffer, handleAnswer, handleIceCandidate
- [ ] Clear rateLimits entry for socket in handleDisconnect
- [ ] Inject ISignalingSessionService via @Inject(SIGNALING_SESSION_SERVICE) in gateway constructor
- [ ] Remove rooms, socketRooms, addToRoom, removeFromRoom, getParticipants, cleanupSocket from gateway; replace with session service calls
- [ ] Update all this.logger calls to include event, meetingId, socketId, userId, and ISO timestamp fields
- [ ] Register { provide: SIGNALING_SESSION_SERVICE, useClass: SignalingSessionService } in SignalingModule.providers
- [ ] Write unit tests in signaling-session.service.spec.ts: addParticipant stores entry, removeParticipant returns undefined for unknown, last-participant clears Map, getParticipants returns correct array
- [ ] Run pnpm build — zero TypeScript errors
- [ ] Run pnpm test — all tests pass
