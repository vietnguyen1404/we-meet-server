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

| Hook               | Behaviour                                                                           |
| ------------------ | ----------------------------------------------------------------------------------- |
| `handleConnection` | Validates JWT, loads user from DB, sets `socket.data.user`. Disconnects on failure. |
| `handleDisconnect` | Logs disconnect with `socketId` and `userId`.                                       |

---

## `socket.data.user`

After a successful handshake, `socket.data.user` is populated with the Prisma `User` object (excluding `passwordHash`).

---

## Out of Scope (this issue)

- WebRTC offer/answer/ICE relay
- Room or meeting management
- Presence broadcasting

These will be implemented in subsequent issues.
