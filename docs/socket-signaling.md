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
  isHost: boolean;
  joinedAt: number; // Unix timestamp (Date.now())
  isVideoEnabled: boolean; // camera on/off — always present, defaults to false
  isAudioEnabled: boolean; // mic on/off — always present, defaults to false
}
```

Media state is managed by the server. It defaults to `false` on join and is updated in real time via `participant-media-state`.

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
6. Emits `ice-servers` to the joining socket with STUN/TURN configuration.

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

### `participant-media-state` (client → server)

Notify the server that the local user toggled their camera or mic. The server updates its in-memory state and broadcasts the new state to all **other** participants (sender is never echoed back).

**Payload:**

```json
{
  "meetingId": "abc123",
  "video": true,
  "audio": false
}
```

**Validation rules:**

| Field       | Rule                               |
| ----------- | ---------------------------------- |
| `meetingId` | Required, non-empty, valid UUID v4 |
| `video`     | Required, boolean                  |
| `audio`     | Required, boolean                  |

**Server behavior:**

1. Validates the sender is an active participant in `meetingId` (403 if not).
2. Updates `isVideoEnabled` and `isAudioEnabled` on the in-memory `ParticipantInfo`.
3. Broadcasts `participant-media-state` to all **other** sockets in `{meetingId}` (sender excluded).

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

Sent to the socket that emitted `watch-meeting` or `join-room`. Includes the **full current media state** of every participant so the client can render the correct UI immediately (camera on/off tiles, mute indicators, etc.).

**Payload:**

```json
{
  "meetingId": "abc123",
  "participants": [
    {
      "socketId": "socket-abc",
      "userId": "user-uuid-1",
      "name": "Alice",
      "isHost": true,
      "joinedAt": 1741651200000,
      "isVideoEnabled": true,
      "isAudioEnabled": false
    },
    {
      "socketId": "socket-def",
      "userId": "user-uuid-2",
      "name": "Bob",
      "isHost": false,
      "joinedAt": 1741651205000,
      "isVideoEnabled": false,
      "isAudioEnabled": true
    }
  ]
}
```

---

### `ice-servers`

Sent **only to the joining socket** immediately after `participants-list` when a `join-room` succeeds. Contains the STUN/TURN ICE server configuration the client should use for this session.

**Payload:**

```json
{
  "iceServers": [
    {
      "urls": "stun:stun.l.google.com:19302"
    },
    {
      "urls": "turn:turn.example.com:3478",
      "username": "1712345678:user-uuid",
      "credential": "<base64-hmac-sha1>"
    }
  ]
}
```

**Notes:**

- Each `iceServers` entry matches the W3C `RTCIceServer` dictionary and can be passed directly to `new RTCPeerConnection({ iceServers })`.
- STUN entries contain only `urls`. TURN entries include `username` and `credential`.
- In **dynamic mode** (recommended): `username` is `"<expiry_unix_ts>:<userId>"` and `credential` is a short-lived HMAC-SHA1 token. Credentials expire after the configured TTL (default 1 hour).
- In **static mode** (fallback): `username` and `credential` are the static values from env vars.
- If TURN is not configured, only the STUN entry is included. Clients fall back to STUN-only or direct P2P.
- Alternatively, clients can call `GET /api/meetings/ice-servers` before connecting to fetch the same config over HTTP.

---

### `participant-joined`

Broadcast to all sockets in `{meetingId}` **and** `watch:{meetingId}` when a new participant joins the video call. New participants always join with `isVideoEnabled: false` and `isAudioEnabled: false`.

**Payload:**

```json
{
  "meetingId": "abc123",
  "participant": {
    "socketId": "socket-abc",
    "userId": "user-uuid-1",
    "name": "Alice",
    "isHost": false,
    "joinedAt": 1741651200000,
    "isVideoEnabled": false,
    "isAudioEnabled": false
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
    "isHost": false,
    "joinedAt": 1741651200000,
    "isVideoEnabled": true,
    "isAudioEnabled": false
  }
}
```

---

### `participant-media-state` (server → client)

Broadcast to all **other** participants in `{meetingId}` when one participant toggles their camera or mic. The sender does **not** receive this event.

**Payload:**

```json
{
  "meetingId": "abc123",
  "userId": "user-uuid-1",
  "video": true,
  "audio": false
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
| `500` | Internal state error (e.g. media state write) |

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

// Receive the current list — each participant includes isVideoEnabled / isAudioEnabled
socket.on('participants-list', ({ participants }) => {
  // Render a tile for every participant, even those with camera off
  initVideoGrid(participants);
});

// Receive STUN/TURN config — emitted right after participants-list on join-room
socket.on('ice-servers', ({ iceServers }) => {
  // Pass directly to RTCPeerConnection when creating peer connections
  const pc = new RTCPeerConnection({ iceServers });
  // ... begin negotiation
});

// Others are notified; new joiners always start with video/audio = false
socket.on('participant-joined', ({ participant }) => {
  addTile(participant);
});

// Sync camera/mic state changes from other participants in real time
socket.on('participant-media-state', ({ userId, video, audio }) => {
  updateTileMediaState(userId, { video, audio });
});
```

### Toggling camera / mic

```js
// After joining a room, send your media state whenever it changes.
function onLocalMediaToggle(isCameraOn, isMicOn) {
  socket.emit('participant-media-state', {
    meetingId: 'abc123',
    video: isCameraOn,
    audio: isMicOn,
  });
  // Server does NOT echo back to the sender — update local UI directly.
}
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
