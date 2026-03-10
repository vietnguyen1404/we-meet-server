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

| Event                | Payload                                                  | Description                                             |
| -------------------- | -------------------------------------------------------- | ------------------------------------------------------- |
| `participant-joined` | `{ meetingId: string, participant: ParticipantInfo }`    | Broadcast to room members when a new participant joins. |
| `participant-left`   | `{ meetingId: string, participant: ParticipantInfo }`    | Broadcast to room members when a participant leaves.    |
| `participants-list`  | `{ meetingId: string, participants: ParticipantInfo[] }` | Response to `get-participants`.                         |
| `error`              | `{ code: number, message: string }`                      | Error response (e.g., 403, 404).                        |

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

// Listen for other participants joining
socket.on('participant-joined', ({ meetingId, participant }) => {
  console.log(`${participant.name} joined meeting ${meetingId}`);
});

// Listen for participants leaving
socket.on('participant-left', ({ meetingId, participant }) => {
  console.log(`${participant.name} left meeting ${meetingId}`);
});

// Request the current participant list
socket.emit('get-participants', { meetingId: 'meeting-uuid' });
socket.on('participants-list', ({ meetingId, participants }) => {
  console.log(`Participants in ${meetingId}:`, participants);
});

// Leave a room
socket.emit('leave-room', { meetingId: 'meeting-uuid' });
```

### Presence State

- Presence is tracked in-memory per process. It is **not** shared across multiple server instances.
- When a socket disconnects (abruptly or gracefully), the server automatically removes it from all rooms and broadcasts `participant-left`.
- Empty rooms are cleaned up from the presence map automatically.

---

## Out of Scope

- WebRTC offer/answer/ICE relay
- Distributed presence (Redis adapter)
