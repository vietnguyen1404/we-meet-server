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

| Hook               | Behaviour                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `handleConnection` | Validates JWT, loads user from DB, sets `socket.data.user`. Disconnects on failure.                                |
| `handleDisconnect` | Logs disconnect with `socketId` and `userId`. Removes the socket from all rooms and broadcasts `participant-left`. |

---

## `socket.data.user`

After a successful handshake, `socket.data.user` is populated with the Prisma `User` object (excluding `passwordHash`).

---

## Room Presence

Authenticated clients can join meeting rooms, receive presence updates, and request participant lists.

### Client → Server Events

| Event              | Payload                 | Description                                                               |
| ------------------ | ----------------------- | ------------------------------------------------------------------------- |
| `join-room`        | `{ meetingId: string }` | Join a meeting room. Server validates meeting existence and membership.   |
| `leave-room`       | `{ meetingId: string }` | Leave a meeting room. Server removes the socket and broadcasts departure. |
| `get-participants` | `{ meetingId: string }` | Request the current participant list for a room.                          |

### Server → Client Events

| Event                | Payload                                                  | Description                                                                                        |
| -------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `participant-joined` | `{ meetingId: string, participant: ParticipantInfo }`    | Broadcast to all other room members when a new participant joins.                                  |
| `participant-left`   | `{ meetingId: string, participant: ParticipantInfo }`    | Broadcast to all remaining room members when a participant leaves or disconnects.                  |
| `participants-list`  | `{ meetingId: string, participants: ParticipantInfo[] }` | Sent to the joining socket automatically after `join-room`, and in response to `get-participants`. |
| `error`              | `{ code: number, message: string }`                      | Error response (e.g., 401, 403, 404).                                                              |

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
| `401` | Not authenticated           |
| `403` | Not a member of the meeting |
| `404` | Meeting not found           |

### Example: Joining a Room

```js
// After connecting with a valid JWT...
socket.emit('join-room', { meetingId: 'meeting-uuid' });

// The server automatically sends the current participant list to the joining socket.
// No need to emit get-participants manually after join-room.
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

### `get-participants` — On-demand participant list

The client can still request the participant list at any time after joining:

```js
socket.emit('get-participants', { meetingId: 'meeting-uuid' });
// server responds with participants-list
```

### Presence State

- Presence is tracked in-memory per process. It is **not** shared across multiple server instances.
- When a socket disconnects (abruptly or gracefully), the server automatically removes it from all rooms and broadcasts `participant-left`.
- Empty rooms are cleaned up from the presence map automatically.

---

## WebRTC Signaling Relay

Authenticated participants who are joined to a meeting room can relay WebRTC negotiation messages to a specific peer. The server forwards the message transparently — it never parses, logs, or stores SDP or ICE candidate content.

### Client → Server Events

| Event                  | Payload                                                           | Description                                |
| ---------------------- | ----------------------------------------------------------------- | ------------------------------------------ |
| `webrtc-offer`         | `{ meetingId: string, targetSocketId: string, payload: unknown }` | Relay a WebRTC offer to the target peer.   |
| `webrtc-answer`        | `{ meetingId: string, targetSocketId: string, payload: unknown }` | Relay a WebRTC answer to the target peer.  |
| `webrtc-ice-candidate` | `{ meetingId: string, targetSocketId: string, payload: unknown }` | Relay an ICE candidate to the target peer. |

### Server → Client Events (relayed to target)

| Event                  | Payload                                      | Description                              |
| ---------------------- | -------------------------------------------- | ---------------------------------------- |
| `webrtc-offer`         | `{ fromSocketId: string, payload: unknown }` | Forwarded offer from a peer.             |
| `webrtc-answer`        | `{ fromSocketId: string, payload: unknown }` | Forwarded answer from a peer.            |
| `webrtc-ice-candidate` | `{ fromSocketId: string, payload: unknown }` | Forwarded ICE candidate from a peer.     |
| `error`                | `{ code: number, message: string }`          | Emitted to sender on validation failure. |

### Error Codes

| Code  | Meaning                                           |
| ----- | ------------------------------------------------- |
| `400` | Missing or invalid `meetingId` / `targetSocketId` |
| `401` | Not authenticated                                 |
| `403` | Sender is not joined to the specified room        |
| `404` | Target socket is not in the room                  |

### Example: Sending a WebRTC Offer

```js
// After both peers have joined the same room...
socket.emit('webrtc-offer', {
  meetingId: 'meeting-uuid',
  targetSocketId: 'target-socket-id',
  payload: { type: 'offer', sdp: '<sdp-string>' },
});

// The target peer receives:
socket.on('webrtc-offer', ({ fromSocketId, payload }) => {
  console.log(`Offer from ${fromSocketId}`, payload);
  // createAnswer and relay back via webrtc-answer
});
```

---

## Out of Scope

- Distributed presence (Redis adapter)
