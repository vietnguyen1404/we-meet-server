# Socket.IO Signaling Architecture

Documentation for the real-time signaling layer used by the WeMeet video meeting platform.

---

## Architecture Overview

The signaling server uses Socket.IO and separates two distinct roles:

| Role            | Description                                         |
| --------------- | --------------------------------------------------- |
| **Watcher**     | User watching the lobby — receives presence updates |
| **Participant** | User inside the active video call                   |

> **Key rule:** A socket connection alone does **not** make a user a participant. A user becomes a participant only by emitting `join-room`.

---

## Socket.IO Rooms

Two room namespaces are used per meeting:

| Room name           | Purpose                               |
| ------------------- | ------------------------------------- |
| `watch:{meetingId}` | Lobby — receives presence events only |
| `{meetingId}`       | Video call — participants + signaling |

Participants also receive lobby events because `participant-joined` and `participant-left` are broadcast to **both** rooms simultaneously.

---

## Authentication

All sockets must authenticate at connection time. Pass a valid JWT access token in **one** of the following ways:

### Option A — Recommended: `auth` option

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: '<access_token>' },
});
```

### Option B — Fallback: `Authorization` header

```js
const socket = io('http://localhost:3000', {
  extraHeaders: {
    Authorization: 'Bearer <access_token>',
  },
});
```

Unauthenticated connections receive an `error` event (`code: 401`) and are immediately disconnected.

---

## Server-side State

Only **one** in-memory structure is maintained — the active participant map:

```typescript
rooms: Map<meetingId, Map<socketId, ParticipantInfo>>;
```

Lobby watchers are **not** stored in memory. Watcher subscriptions are managed purely via Socket.IO rooms (`watch:{meetingId}`).

---

## Data Types

### `ParticipantInfo`

```typescript
interface ParticipantInfo {
  socketId: string;
  userId: string;
  name: string;
  joinedAt: number; // Unix timestamp (Date.now())
}
```

---

## Client → Server Events

### `watch-meeting`

Subscribe a socket to lobby presence updates without joining the video call.

**Payload:**

```json
{ "meetingId": "abc123" }
```

**Server behavior:**

1. Validates the meeting exists.
2. Joins the socket to the `watch:{meetingId}` room.
3. Emits `participants-list` to the watcher with the current video-call participants.

---

### `join-room`

Join the active video call as a participant.

**Payload:**

```json
{ "meetingId": "abc123" }
```

**Server behavior:**

1. Validates meeting exists and the user is a database member.
2. Adds the participant to the in-memory rooms map.
3. Joins the socket to the `{meetingId}` room.
4. Emits `participant-joined` to both `{meetingId}` and `watch:{meetingId}` rooms (excluding the joining socket).
5. Emits `participants-list` to the joining socket.

---

### `leave-room`

Leave the video call explicitly.

**Payload:**

```json
{ "meetingId": "abc123" }
```

**Server behavior:**

1. Removes the participant from the in-memory map.
2. Leaves the `{meetingId}` Socket.IO room.
3. Emits `participant-left` to both `{meetingId}` and `watch:{meetingId}` rooms.

---

### `offer`

Relay a WebRTC offer to a specific peer.

**Payload:**

```json
{
  "meetingId": "abc123",
  "targetSocketId": "target-socket-id",
  "payload": { "type": "offer", "sdp": "<sdp-string>" }
}
```

**Server behavior:** Forwards payload to `targetSocketId` only. Sender must be in the `{meetingId}` video-call room.

---

### `answer`

Relay a WebRTC answer to a specific peer.

**Payload:**

```json
{
  "meetingId": "abc123",
  "targetSocketId": "target-socket-id",
  "payload": { "type": "answer", "sdp": "<sdp-string>" }
}
```

---

### `ice-candidate`

Relay an ICE candidate to a specific peer.

**Payload:**

```json
{
  "meetingId": "abc123",
  "targetSocketId": "target-socket-id",
  "payload": { "candidate": "<ice-candidate-string>" }
}
```

---

## Server → Client Events

### `participants-list`

Sent to the socket that emitted `watch-meeting` or `join-room`.

**Payload:**

```json
{
  "meetingId": "abc123",
  "participants": [
    {
      "socketId": "socket-abc",
      "userId": "user-uuid-1",
      "name": "Alice",
      "joinedAt": 1741651200000
    },
    {
      "socketId": "socket-def",
      "userId": "user-uuid-2",
      "name": "Bob",
      "joinedAt": 1741651205000
    }
  ]
}
```

---

### `participant-joined`

Broadcast to all sockets in `{meetingId}` **and** `watch:{meetingId}` when a new participant joins the video call.

**Payload:**

```json
{
  "meetingId": "abc123",
  "participant": {
    "socketId": "socket-abc",
    "userId": "user-uuid-1",
    "name": "Alice",
    "joinedAt": 1741651200000
  }
}
```

---

### `participant-left`

Broadcast to all sockets in `{meetingId}` **and** `watch:{meetingId}` when a participant leaves the video call (via `leave-room` or disconnect).

**Payload:**

```json
{
  "meetingId": "abc123",
  "participant": {
    "socketId": "socket-abc",
    "userId": "user-uuid-1",
    "name": "Alice",
    "joinedAt": 1741651200000
  }
}
```

---

### `offer` / `answer` / `ice-candidate`

Forwarded to the `targetSocketId` specified by the sender. The server never broadcasts these events.

**Payload (received by target):**

```json
{
  "fromSocketId": "sender-socket-id",
  "payload": "<original-payload>"
}
```

---

### `error`

Emitted to the socket that caused the error.

**Payload:**

```json
{ "code": 401, "message": "Not authenticated" }
```

| Code  | Meaning                                       |
| ----- | --------------------------------------------- |
| `400` | Missing or invalid field in payload           |
| `401` | Not authenticated                             |
| `403` | Not a member of the meeting / not in the room |
| `404` | Meeting or target socket not found            |

---

## Event Flow Examples

### Lobby user

```js
// 1. Connect with JWT
const socket = io('http://localhost:3000', { auth: { token } });

// 2. Subscribe to lobby updates
socket.emit('watch-meeting', { meetingId: 'abc123' });

// 3. Receive current participants immediately
socket.on('participants-list', ({ meetingId, participants }) => {
  console.log('Currently in call:', participants);
});

// 4. Stay updated as users join / leave
socket.on('participant-joined', ({ participant }) => {
  console.log(participant.name, 'joined the call');
});

socket.on('participant-left', ({ participant }) => {
  console.log(participant.name, 'left the call');
});
```

### User joins the video call

```js
// Join from lobby (still watching) or fresh connection
socket.emit('join-room', { meetingId: 'abc123' });

// Receive the current list including yourself
socket.on('participants-list', ({ participants }) => {
  initVideoGrid(participants);
});

// Others are notified via participant-joined
```

### WebRTC peer negotiation

```js
// After both peers are in the same room...
socket.emit('offer', {
  meetingId: 'abc123',
  targetSocketId: 'target-socket-id',
  payload: { type: 'offer', sdp: localSdp },
});

// Target receives:
socket.on('offer', ({ fromSocketId, payload }) => {
  // createAnswer() and reply via 'answer'
});
```

### User leaves the call

```js
socket.emit('leave-room', { meetingId: 'abc123' });
// All sockets in {meetingId} and watch:{meetingId} receive participant-left
```

---

## Disconnect Cleanup

When a socket disconnects for any reason (network drop, browser close, etc.):

1. The server checks `socketRooms` for every meeting the socket was participating in.
2. For each meeting, it removes the socket from the in-memory `rooms` map.
3. It emits `participant-left` to both `{meetingId}` and `watch:{meetingId}`.
4. **Database membership is never modified on disconnect.** Presence is in-memory only.

---

## Constraints & Notes

- Presence is tracked **in-memory per process**. It is not shared across multiple server instances (no Redis adapter).
- Watchers are managed via Socket.IO rooms only — never stored in the `rooms` map.
- Empty rooms are cleaned up from the presence map automatically.
- WebRTC signaling events (`offer`, `answer`, `ice-candidate`) are unicast — they are **never** broadcast.
