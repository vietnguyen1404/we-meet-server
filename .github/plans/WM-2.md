# WM-2: Meeting Room Presence Management

## 1. Feature Summary

This feature adds real-time meeting room presence management to the Socket.IO signaling gateway. Authenticated participants can join meeting rooms, receive notifications when others join or leave, and request the current participant list. The server tracks presence in an in-memory map and broadcasts join/leave events to all room members.

---

## 2. Problem Statement

Once participants authenticate via the Socket.IO gateway, the server has no concept of which meeting each socket belongs to or who is currently active. Clients need accurate, real-time visibility into meeting participation for displaying attendee lists, enabling collaboration features, and coordinating WebRTC connections in future iterations. Without presence management, clients would have no way to know who is in a meeting or react to join/leave events.

---

## 3. Technical Design

### Affected Modules

- `src/signaling/signaling.gateway.ts` - Add event handlers and presence logic
- `src/signaling/signaling.module.ts` - Import MeetingsModule for repository access
- `docs/signaling-events.md` - Document new events

### Services to Modify or Create

**SignalingGateway** - Extend with:

- `@SubscribeMessage('join-room')` handler
- `@SubscribeMessage('leave-room')` handler
- `@SubscribeMessage('get-participants')` handler
- `handleDisconnect` enhancement for room cleanup
- In-memory presence map: `Map<meetingId, Map<socketId, ParticipantInfo>>`

**MeetingsRepository** - Reuse existing `findMemberByMeetingAndUser()` to validate membership. May also use `findById()` to check meeting existence.

### Database Changes

No schema changes required. Meeting membership validation uses the existing `MeetingMember` model.

### API Endpoints (WebSocket Events)

#### Client to Server Events

| Event              | Payload                 | Description                      |
| ------------------ | ----------------------- | -------------------------------- |
| `join-room`        | `{ meetingId: string }` | Join a meeting room              |
| `leave-room`       | `{ meetingId: string }` | Leave a meeting room             |
| `get-participants` | `{ meetingId: string }` | Request current participant list |

#### Server to Client Events

| Event                | Payload                                                  | Description                                 |
| -------------------- | -------------------------------------------------------- | ------------------------------------------- |
| `participant-joined` | `{ meetingId: string, participant: ParticipantInfo }`    | Broadcast when someone joins                |
| `participant-left`   | `{ meetingId: string, participant: ParticipantInfo }`    | Broadcast when someone leaves               |
| `participants-list`  | `{ meetingId: string, participants: ParticipantInfo[] }` | Response to get-participants                |
| `error`              | `{ code: number, message: string }`                      | Error response (e.g., 403 for unauthorized) |

#### ParticipantInfo Shape

```typescript
interface ParticipantInfo {
  userId: string;
  name: string;
  socketId: string;
  joinedAt: Date;
}
```

### Validation Rules

1. **Authentication** - Socket must have `socket.data.user` populated (ensured by existing handshake auth)
2. **Meeting Existence** - Meeting must exist in database
3. **Membership** - User must be a member of the meeting (HOST or PARTICIPANT via MeetingMember)
4. **Authorization** - Return error code 403 if validation fails

---

## 4. Edge Cases

1. **Invalid meetingId** - Meeting does not exist -> emit `error` with code 404
2. **Unauthorized access** - User is not a member of the meeting -> emit `error` with code 403
3. **Double join** - User joins the same room twice (e.g., from different tabs) -> Allow multiple socket connections per user; track by socketId
4. **Disconnect without explicit leave** - Socket disconnects abruptly -> Clean up presence on `handleDisconnect`
5. **Leave room not joined** - User emits `leave-room` for a room they are not in -> Silently ignore or log warning
6. **Request participants for room not joined** - User requests participants for a room they have not joined -> Allow if they are a meeting member (for preview use case)
7. **Last participant leaves** - Room presence map becomes empty -> Remove the room key from the map to prevent memory leaks
8. **Race condition: join during disconnect** - Another user joins while this socket is disconnecting -> Ensure atomic operations on presence map
9. **Null/undefined user on socket** - Should not happen if auth is enforced, but guard against it

---

## 5. Implementation Plan

### Step 1: Define Type Interfaces

Create TypeScript interfaces for:

- Socket event payloads (JoinRoomPayload, LeaveRoomPayload, GetParticipantsPayload)
- Server event payloads (ParticipantJoinedPayload, ParticipantLeftPayload, ParticipantsListPayload)
- ParticipantInfo structure
- Update ServerToClientEvents interface with new events
- Define ClientToServerEvents interface

### Step 2: Create Presence Map

Add an in-memory Map to SignalingGateway:

- Outer map: `meetingId` to inner map
- Inner map: `socketId` to `ParticipantInfo`
- Add helper methods: `addToRoom()`, `removeFromRoom()`, `getParticipants()`

### Step 3: Import MeetingsModule

Update SignalingModule to import MeetingsModule so the gateway can access MeetingsRepository for membership validation.

### Step 4: Implement join-room Handler

- Extract meetingId from payload
- Validate meeting exists via MeetingsRepository.findById()
- Validate user is a member via MeetingsRepository.findMemberByMeetingAndUser()
- On failure: emit error event with appropriate code and return
- On success:
  - Add socket to Socket.IO room using socket.join(meetingId)
  - Add participant to presence map
  - Broadcast `participant-joined` to room (excluding sender)
  - Optionally emit confirmation to sender

### Step 5: Implement leave-room Handler

- Extract meetingId from payload
- Remove socket from Socket.IO room using socket.leave(meetingId)
- Remove participant from presence map
- Broadcast `participant-left` to room
- Clean up empty room from map

### Step 6: Enhance handleDisconnect

- Iterate over rooms the socket is in (via presence map or socket.rooms)
- For each room: remove from presence map and broadcast `participant-left`
- Clean up empty presence entries

### Step 7: Implement get-participants Handler

- Extract meetingId from payload
- Validate user is a member of the meeting
- Retrieve participants from presence map
- Emit `participants-list` to requesting socket

### Step 8: Update Documentation

Update `docs/signaling-events.md` with:

- New events table
- Payload schemas
- Error codes
- Example usage

---

## 6. Implementation Order

1. Define TypeScript interfaces for events and presence types
2. Add in-memory presence map with helper methods to SignalingGateway
3. Update SignalingModule to import MeetingsModule
4. Inject MeetingsRepository into SignalingGateway
5. Implement `join-room` handler with validation and broadcast
6. Implement `leave-room` handler with cleanup and broadcast
7. Enhance `handleDisconnect` to clean up presence on abrupt disconnect
8. Implement `get-participants` handler
9. Update `docs/signaling-events.md` with new event documentation
10. Manual testing with Socket.IO client

---

## 7. Task Breakdown

- [ ] Define event payload interfaces (JoinRoomPayload, LeaveRoomPayload, GetParticipantsPayload, ParticipantInfo)
- [ ] Define server-to-client event interfaces (participant-joined, participant-left, participants-list)
- [ ] Add in-memory presence Map to SignalingGateway
- [ ] Implement presence helper methods (addToRoom, removeFromRoom, getParticipants, cleanupSocket)
- [ ] Update SignalingModule to import MeetingsModule
- [ ] Inject MeetingsRepository into SignalingGateway constructor
- [ ] Implement @SubscribeMessage('join-room') handler with meeting/membership validation
- [ ] Implement @SubscribeMessage('leave-room') handler with presence cleanup
- [ ] Update handleDisconnect to remove socket from all joined rooms and broadcast
- [ ] Implement @SubscribeMessage('get-participants') handler
- [ ] Update docs/signaling-events.md with new events documentation
- [ ] Test join-room with valid meeting membership
- [ ] Test join-room with invalid meetingId (404)
- [ ] Test join-room with unauthorized user (403)
- [ ] Test leave-room and participant-left broadcast
- [ ] Test get-participants returns correct list
- [ ] Test disconnect cleanup broadcasts participant-left
