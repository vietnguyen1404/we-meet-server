# Meeting API

All routes are prefixed with `/api`. All endpoints require a valid JWT Bearer token.

---

## Client Flow (Google Meet–style)

The meeting experience follows a **pre-join / in-call** separation:

| Phase                    | Client Action                                                             | Server Involvement                                                           |
| ------------------------ | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **1. Open meeting page** | `GET /meetings/:id`                                                       | Returns meeting metadata (title, hostId). User is **not** yet a participant. |
| **2. Pre-join lobby**    | Render camera/mic preview. Optionally emit `watch-meeting` via WebSocket. | Sends current `participants-list` to the watcher. No in-call state created.  |
| **3. Join call**         | Emit `join-room` via WebSocket.                                           | Adds user to in-memory participant store. Broadcasts `participant-joined`.   |
| **4. In-call**           | WebRTC signaling (`offer`, `answer`, `ice-candidate`).                    | Relays signaling between peers.                                              |
| **5. Leave**             | Emit `leave-room` or close the tab.                                       | Removes participant, broadcasts `participant-left`.                          |

> **Presence is ephemeral.** It exists only after `join-room` and is cleared on `leave-room` or disconnect. The REST API never returns live participant data — use the `watch-meeting` WebSocket event for real-time presence.

---

## Architecture

```
meetings/
├── dto/                          # Data Transfer Objects
│   ├── create-meeting.dto.ts     # Input: Create meeting
│   └── meeting-response.dto.ts   # Output: Meeting details
├── meetings.controller.ts        # HTTP routes
├── meetings.service.ts           # Business logic
├── meetings.repository.ts        # Data access layer
└── meetings.module.ts            # Module registration
```

## Database Schema

### Meeting Model

```prisma
model Meeting {
  id        String   @id @default(uuid())
  title     String?
  hostId    String
  host      User     @relation("MeetingHost", fields: [hostId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([hostId])
}
```

> **Note:** There is no persistent membership table. Participants are tracked in-memory via [SignalingSessionService](./signaling-events.md) over Socket.IO. Anyone with a valid JWT and meeting ID can join via the `join-room` WebSocket event.

---

## API Endpoints

### 1. Create Meeting

**POST /api/meetings**

Creates a new meeting room. The authenticated user becomes the host (`hostId`).

**Authentication Required:** Yes (JWT Bearer token)

**Request Body:**

```json
{
  "title": "Weekly Standup" // optional, defaults to "Untitled Meeting"
}
```

**Response (201 Created):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Weekly Standup",
  "hostId": "123e4567-e89b-12d3-a456-426614174000",
  "createdAt": "2024-02-24T10:00:00.000Z",
  "updatedAt": "2024-02-24T10:00:00.000Z"
}
```

**Example (cURL):**

```bash
curl -X POST http://localhost:3000/api/meetings \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Team Sync"}'
```

---

### 2. Get Meeting Details

**GET /api/meetings/:id**

Retrieves meeting metadata. Does **not** include live participant data — use the `watch-meeting` WebSocket event for real-time presence.

**Authentication Required:** Yes (JWT Bearer token)

**Path Parameters:**

- `id` (string, UUID): Meeting ID

**Response (200 OK):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Weekly Standup",
  "hostId": "123e4567-e89b-12d3-a456-426614174000",
  "createdAt": "2024-02-24T10:00:00.000Z",
  "updatedAt": "2024-02-24T10:00:00.000Z"
}
```

**Error Response (404):**

```json
{
  "statusCode": 404,
  "message": "Meeting with ID 550e8400-e29b-41d4-a716-446655440000 not found",
  "error": "Not Found"
}
```

**Example (cURL):**

```bash
curl -X GET http://localhost:3000/api/meetings/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Response DTO

### MeetingResponseDto

| Field       | Type   | Description                                    |
| ----------- | ------ | ---------------------------------------------- |
| `id`        | string | UUID of the meeting                            |
| `title`     | string | Meeting title (defaults to "Untitled Meeting") |
| `hostId`    | string | UUID of the user who created the meeting       |
| `createdAt` | string | ISO 8601 timestamp                             |
| `updatedAt` | string | ISO 8601 timestamp                             |

---

## Participant Tracking

Live participants are **not** stored in the database. They are tracked in-memory by `SignalingSessionService` via Socket.IO events:

- **`join-room`** — The **only** event that makes a user an active participant. The gateway delegates to `canJoinMeeting()` — the single extension point for future join-gating (e.g., request-join / host-approval). Currently any authenticated user with a valid meeting ID may join. The server computes `isHost = user.id === meeting.hostId` and stores `{ userId, socketId, isHost }`.
- **`participant-joined`** — Broadcast with `{ meetingId, participant: { userId, socketId, isHost } }`.
- **`participant-left`** — Broadcast with `{ meetingId, participant: { userId, socketId, isHost } }`.
- **`watch-meeting`** — Optional lobby observer: join the `watch:{meetingId}` room to receive the current `participants-list` and live updates without entering the call.

See [signaling-events.md](./signaling-events.md) for full WebSocket documentation.

---

## Authentication

All endpoints require a valid JWT access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

The user ID is extracted from the JWT payload using the `@CurrentUser('id')` decorator.

---

## Data Validation

### CreateMeetingDto

| Field   | Type   | Required | Rules              |
| ------- | ------ | -------- | ------------------ |
| `title` | string | No       | Max 200 characters |

If omitted, defaults to "Untitled Meeting".

---

## Error Handling

| Status Code               | Scenario                                  |
| ------------------------- | ----------------------------------------- |
| 201 Created               | Meeting created successfully              |
| 200 OK                    | Details retrieved                         |
| 400 Bad Request           | Invalid input (e.g., non-UUID meeting ID) |
| 401 Unauthorized          | Missing or invalid access token           |
| 404 Not Found             | Meeting doesn't exist                     |
| 500 Internal Server Error | Database or server error                  |

---

## Repository Pattern

### MeetingsRepository

```typescript
class MeetingsRepository {
  create(data); // Create meeting
  findById(id); // Get meeting by ID
}
```

---

## Related Documentation

- [Authentication Flow](./AUTH_API.md)
- [Refresh Token Rotation](./REFRESH_TOKEN.md)
- [Signaling Events](./signaling-events.md)
- Database Schema: `prisma/schema.prisma`
