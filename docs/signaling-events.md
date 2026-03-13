# Signaling Events

Documentation for the Socket.IO signaling gateway.

## Connection

The gateway is available on the default Socket.IO namespace (`/`). Clients must authenticate at the handshake layer — **no messages are processed from unauthenticated sockets.**

### Authentication

Pass a valid JWT access token in **one** of the following ways:

#### Option A — Recommended: `auth` option

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: '<access_token>',
  },
});
```

#### Option B — Fallback: `Authorization` header

```js
const socket = io('http://localhost:3000', {
  extraHeaders: {
    Authorization: 'Bearer <access_token>',
  },
});
```

---

## Lifecycle Events

### Server → Client

| Event   | Payload                             | Description                                                           |
| ------- | ----------------------------------- | --------------------------------------------------------------------- |
| `error` | `{ code: number, message: string }` | Emitted before disconnect when authentication fails. `code` is `401`. |

### Server-side Lifecycle

| Hook               | Behaviour                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `handleConnection` | Validates JWT, loads user from DB, sets `socket.data.user`. Disconnects on failure.                                            |
| `handleDisconnect` | Removes the socket from all rooms, broadcasts `participant-left` to the call room and lobby, and clears the rate-limit bucket. |

---

## `socket.data.user`

After a successful handshake, `socket.data.user` is populated with the Prisma `User` object (excluding `passwordHash`).

---

## Room Presence

Authenticated clients can join meeting rooms, watch the lobby, and receive presence updates.

### Client → Server Events

| Event           | Payload                 | Description                                                                                       |
| --------------- | ----------------------- | ------------------------------------------------------------------------------------------------- |
| `join-room`     | `{ meetingId: string }` | Join a meeting room. Server validates meeting existence and membership.                           |
| `leave-room`    | `{ meetingId: string }` | Leave a meeting room. Server removes the socket and broadcasts departure.                         |
| `watch-meeting` | `{ meetingId: string }` | Join the lobby watcher room (`watch:{meetingId}`). Receives current participant list immediately. |

### Server → Client Events

| Event                | Payload                                                  | Description                                                                                                              |
| -------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `participant-joined` | `{ meetingId: string, participant: ParticipantInfo }`    | Broadcast to all members of the call room and the `watch:{meetingId}` lobby when a new participant joins.                |
| `participant-left`   | `{ meetingId: string, participant: ParticipantInfo }`    | Broadcast to all members of the call room and the `watch:{meetingId}` lobby when a participant leaves or disconnects.    |
| `participants-list`  | `{ meetingId: string, participants: ParticipantInfo[] }` | Sent automatically to the joining socket after `join-room`, and immediately to the watcher socket after `watch-meeting`. |
| `error`              | `{ code: number, message: string }`                      | Error response (e.g., 401, 403, 404).                                                                                    |

### `ParticipantInfo`

```typescript
interface ParticipantInfo {
  userId: string;
  name: string;
  socketId: string;
  joinedAt: Date;
}
```

### Error Codes

| Code  | Meaning                     |
| ----- | --------------------------- |
| `400` | Invalid or missing payload  |
| `401` | Not authenticated           |
| `403` | Not a member of the meeting |
| `404` | Meeting not found           |

### Example: Joining a Room

```js
// After connecting with a valid JWT...
socket.emit('join-room', { meetingId: 'meeting-uuid' });

// The server automatically sends the current participant list to the joining socket.
socket.on('participants-list', ({ meetingId, participants }) => {
  console.log(`Current participants in ${meetingId}:`, participants);
});

// Listen for other participants joining
socket.on('participant-joined', ({ meetingId, participant }) => {
  console.log(`${participant.name} joined meeting ${meetingId}`);
});

// Listen for participants leaving
socket.on('participant-left', ({ meetingId, participant }) => {
  console.log(`${participant.name} left meeting ${meetingId}`);
});

// Leave a room explicitly
socket.emit('leave-room', { meetingId: 'meeting-uuid' });
```

### Example: Watching the Lobby

```js
// Watch participant list without joining the call (e.g. pre-call lobby screen)
socket.emit('watch-meeting', { meetingId: 'meeting-uuid' });

// Server immediately sends the current participant list
socket.on('participants-list', ({ meetingId, participants }) => {
  console.log(`Lobby sees ${participants.length} participant(s)`);
});

// Also receives join/leave updates as the call evolves
socket.on('participant-joined', ({ participant }) => {
  console.log(`${participant.name} entered the call`);
});

socket.on('participant-left', ({ participant }) => {
  console.log(`${participant.name} left the call`);
});
```

### Presence State

- Presence is managed by `SignalingSessionService` — an injectable service with a typed interface designed to support Redis-backed adapters in a future phase.
- When a socket disconnects (abruptly or gracefully), the server removes it from all rooms and broadcasts `participant-left` to both the call room and the `watch:{meetingId}` lobby.
- When the last participant leaves, the meeting entry is cleared from the in-memory maps. The lobby room persists independently.

---

## Signaling Relay

Authenticated participants who are joined to a meeting room can relay WebRTC negotiation messages to a specific peer. All payloads are validated before forwarding; the server never parses, logs, or stores SDP or ICE content.

### Payload Validation

All relay events are validated before forwarding. Missing or malformed fields result in an `error` event with `code: 400` and no relay occurs.

| Field            | Rule                                   |
| ---------------- | -------------------------------------- |
| `meetingId`      | Required, non-empty, valid UUID v4     |
| `targetSocketId` | Required, non-empty string             |
| `payload`        | Required, any non-null/non-empty value |

### Rate Limiting

Each socket may send at most **30 relay events per 10-second sliding window** across `offer`, `answer`, and `ice-candidate` combined. Exceeding the limit emits `error { code: 429 }` and drops the event. The bucket resets automatically and is cleared on disconnect.

### Client → Server Events

| Event           | Payload                                                           | Description                                |
| --------------- | ----------------------------------------------------------------- | ------------------------------------------ |
| `offer`         | `{ meetingId: string, targetSocketId: string, payload: unknown }` | Relay a WebRTC offer to the target peer.   |
| `answer`        | `{ meetingId: string, targetSocketId: string, payload: unknown }` | Relay a WebRTC answer to the target peer.  |
| `ice-candidate` | `{ meetingId: string, targetSocketId: string, payload: unknown }` | Relay an ICE candidate to the target peer. |

### Server → Client Events (relayed to target)

| Event           | Payload                                      | Description                              |
| --------------- | -------------------------------------------- | ---------------------------------------- |
| `offer`         | `{ fromSocketId: string, payload: unknown }` | Forwarded offer from a peer.             |
| `answer`        | `{ fromSocketId: string, payload: unknown }` | Forwarded answer from a peer.            |
| `ice-candidate` | `{ fromSocketId: string, payload: unknown }` | Forwarded ICE candidate from a peer.     |
| `error`         | `{ code: number, message: string }`          | Emitted to sender on validation failure. |

### Error Codes

| Code  | Meaning                                                        |
| ----- | -------------------------------------------------------------- |
| `400` | Invalid or missing `meetingId`, `targetSocketId`, or `payload` |
| `401` | Not authenticated                                              |
| `403` | Sender is not joined to the specified room                     |
| `404` | Target socket is not in the room                               |
| `429` | Rate limit exceeded (30 relay events \/ 10 s per socket)       |

### Example: Sending a WebRTC Offer

```js
// After both peers have joined the same room...
socket.emit('offer', {
  meetingId: 'meeting-uuid',
  targetSocketId: 'target-socket-id',
  payload: { type: 'offer', sdp: '<sdp-string>' },
});

// The target peer receives:
socket.on('offer', ({ fromSocketId, payload }) => {
  console.log(`Offer from ${fromSocketId}`, payload);
  // createAnswer and relay back via answer
});
```

---

## Out of Scope

- Distributed presence (Redis adapter) — the `ISignalingSessionService` interface is designed to support this without gateway changes.
