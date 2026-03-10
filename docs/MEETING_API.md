# Meeting API

All routes are prefixed with `/api`. All endpoints require a valid JWT Bearer token.

---

## Architecture

```
meetings/
├── dto/                          # Data Transfer Objects
│   ├── create-meeting.dto.ts     # Input: Create meeting
│   ├── join-meeting.dto.ts       # Input: Join meeting
│   ├── meeting-response.dto.ts   # Output: Meeting details
│   └── meeting-member.dto.ts     # Output: Member info
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
  members   MeetingMember[]

  @@index([hostId])
}
```

### MeetingMember Model

```prisma
model MeetingMember {
  id        String      @id @default(uuid())
  meetingId String
  meeting   Meeting     @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  userId    String
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  role      MeetingRole  # HOST or PARTICIPANT
  joinedAt  DateTime    @default(now())

  @@unique([meetingId, userId], name: "unique_meeting_membership")
  @@index([meetingId])
  @@index([userId])
}
```

### MeetingRole Enum

```prisma
enum MeetingRole {
  HOST
  PARTICIPANT
}
```

## API Endpoints

### 1. Create Meeting

**POST /api/meetings**

Creates a new meeting room and automatically adds the creator as HOST.

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

**Transaction Behavior:**

- Meeting creation and host membership are atomic (both succeed or both fail)
- Host automatically gets `MeetingRole.HOST` role
- If transaction fails, entire operation is rolled back

---

### 2. Join Meeting

**POST /api/meetings/:id/join**

Adds the authenticated user to an existing meeting as PARTICIPANT.

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
  "updatedAt": "2024-02-24T10:00:00.000Z",
  "members": [
    {
      "id": "mem-001",
      "userId": "123e4567-e89b-12d3-a456-426614174000",
      "userName": "John Doe",
      "role": "HOST",
      "joinedAt": "2024-02-24T10:00:00.000Z"
    },
    {
      "id": "mem-002",
      "userId": "789e4567-e89b-12d3-a456-426614174999",
      "userName": "Jane Smith",
      "role": "PARTICIPANT",
      "joinedAt": "2024-02-24T10:05:00.000Z"
    }
  ]
}
```

**Error Responses:**

**404 Not Found:**

```json
{
  "statusCode": 404,
  "message": "Meeting with ID 550e8400-e29b-41d4-a716-446655440000 not found",
  "error": "Not Found"
}
```

**409 Conflict (Already a member):**

```json
{
  "statusCode": 409,
  "message": "You are already a member of this meeting",
  "error": "Conflict"
}
```

**Example (cURL):**

```bash
curl -X POST http://localhost:3000/api/meetings/550e8400-e29b-41d4-a716-446655440000/join \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Duplicate Prevention:**

- Unique constraint on `(meetingId, userId)` prevents duplicate memberships
- Returns 409 Conflict if user is already a member

---

### 3. Get Meeting Details

**GET /api/meetings/:id**

Retrieves meeting details including all members ordered by join time.

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
  "updatedAt": "2024-02-24T10:00:00.000Z",
  "members": [
    {
      "id": "mem-001",
      "userId": "123e4567-e89b-12d3-a456-426614174000",
      "userName": "John Doe",
      "role": "HOST",
      "joinedAt": "2024-02-24T10:00:00.000Z"
    },
    {
      "id": "mem-002",
      "userId": "789e4567-e89b-12d3-a456-426614174999",
      "userName": "Jane Smith",
      "role": "PARTICIPANT",
      "joinedAt": "2024-02-24T10:05:00.000Z"
    }
  ]
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

**Optimization:**

- Single query with `include` for members and user names
- Members ordered by `joinedAt` ASC (host appears first)

---

## Authentication

All endpoints require a valid JWT access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

The user ID is extracted from the JWT payload using the `@CurrentUser('id')` decorator.

## Role-Based Access Control

### Current Roles

- **HOST**: Meeting creator, full control
- **PARTICIPANT**: Regular member

### Future Extensions

The `MeetingRole` enum can be extended for additional roles:

```typescript
enum MeetingRole {
  HOST
  CO_HOST      // Future: Elevated permissions
  PARTICIPANT
  OBSERVER     // Future: View-only access
}
```

## Data Validation

### CreateMeetingDto

```typescript
{
  title?: string;  // Optional, max 200 characters
}
```

**Validation Rules:**

- `title`: Optional, string, max 200 characters
- If omitted, defaults to "Untitled Meeting"

### JoinMeetingDto

The meeting ID is taken from the URL path parameter and validated as UUID.

## Error Handling

| Status Code               | Scenario                                  |
| ------------------------- | ----------------------------------------- |
| 201 Created               | Meeting created successfully              |
| 200 OK                    | Join successful or details retrieved      |
| 400 Bad Request           | Invalid input (e.g., non-UUID meeting ID) |
| 401 Unauthorized          | Missing or invalid access token           |
| 404 Not Found             | Meeting doesn't exist                     |
| 409 Conflict              | User already member of meeting            |
| 500 Internal Server Error | Database or server error                  |

## Database Indexes

Performance-optimized with strategic indexes:

```prisma
// Meeting indexes
@@index([hostId])  // Fast lookup of user's hosted meetings

// MeetingMember indexes
@@unique([meetingId, userId])  // Prevent duplicate membership
@@index([meetingId])           // Fast member lookup by meeting
@@index([userId])              // Fast meeting lookup by user
```

## CASCADE Delete Behavior

```
User deleted → All hosted meetings deleted → All members removed
User deleted → All memberships removed
Meeting deleted → All members removed
```

This prevents orphaned records and ensures data integrity.

## Repository Pattern

### MeetingsRepository

```typescript
class MeetingsRepository {
  create(); // Create meeting
  findById(id, include?); // Get meeting with optional relations
  createMembershipWithinTransaction(); // Add member atomically
  findMemberByMeetingAndUser(); // Check existing membership
}
```

**Benefits:**

- Separation of concerns (data access vs business logic)
- Testability (easy to mock repository)
- Transaction support for atomic operations

## Design Decisions

### 1. **Transaction for Meeting Creation**

Creating a meeting and adding the host as a member must be atomic. We use Prisma transactions:

```typescript
await this.prisma.$transaction(async (tx) => {
  const meeting = await tx.meeting.create({ ... });
  await tx.meetingMember.create({ ... });
  return meeting;
});
```

**Why:** Prevents meetings without hosts or failed partial operations.

### 2. **Unique Constraint on (meetingId, userId)**

Prevents duplicate memberships at the database level:

```prisma
@@unique([meetingId, userId], name: "unique_meeting_membership")
```

**Why:** Database-level enforcement is more reliable than application-level checks, especially under concurrent requests.

### 3. **Nullable Title with Default**

Meeting titles are optional but always returned as strings:

```typescript
title: result.title || 'Untitled Meeting';
```

**Why:** UX flexibility (quick meeting creation) while maintaining clean responses.

### 4. **Ordered Member List**

Members are always ordered by `joinedAt` ascending:

```typescript
orderBy: {
  joinedAt: 'asc';
}
```

**Why:** Host appears first, provides chronological context for join order.

### 5. **Separate DTOs for Input/Output**

Input DTOs use `class-validator`, output DTOs are plain interfaces:

**Why:**

- Input validation at HTTP layer
- Type safety in responses
- Clear separation of concerns

### 6. **Repository for Transaction Support**

`createMembershipWithinTransaction()` accepts `Prisma.TransactionClient`:

```typescript
async createMembershipWithinTransaction(
  tx: Prisma.TransactionClient,
  meetingId: string,
  userId: string,
  role: MeetingRole,
)
```

**Why:** Enables atomic operations across multiple repositories if needed.

## Testing Strategy

### Unit Tests

```typescript
describe('MeetingsService', () => {
  it('should create meeting with host membership');
  it('should prevent duplicate joins');
  it('should throw 404 for non-existent meeting');
  it('should handle transaction rollback on failure');
});
```

### Integration Tests

```typescript
describe('POST /meetings', () => {
  it('should return 401 without auth token');
  it('should create meeting and return 201');
  it('should default title to "Untitled Meeting"');
});

describe('POST /meetings/:id/join', () => {
  it('should add user as participant');
  it('should return 409 if already joined');
  it('should return 404 for invalid meeting');
});
```

## Performance Considerations

1. **Database Indexes**: All foreign keys and frequently queried fields indexed
2. **Single Query for Details**: Uses Prisma `include` to fetch meeting + members + user names in one query
3. **Selective Fields**: Only fetches needed user fields (`id`, `name`) instead of entire user objects
4. **Early Validation**: Checks meeting existence before attempting to join

## Future Enhancements

### Phase 3: Advanced Features

- [ ] Leave meeting endpoint
- [ ] Kick member (HOST only)
- [ ] Transfer host role
- [ ] Meeting expiration/auto-close
- [ ] Meeting capacity limits
- [ ] Invitation links with tokens

### Phase 4: Real-time Features

- [ ] WebSocket events for member join/leave
- [ ] Presence tracking (online/offline)
- [ ] Typing indicators
- [ ] Chat messages

### Phase 5: Analytics

- [ ] Meeting duration tracking
- [ ] Member participation metrics
- [ ] Meeting history

## Example Flow

1. **User A creates meeting:**

   ```bash
   POST /api/meetings
   → Meeting created with ID: abc-123
   → User A automatically added as HOST
   ```

2. **User B joins meeting:**

   ```bash
   POST /api/meetings/abc-123/join
   → User B added as PARTICIPANT
   → Returns full meeting details with members list
   ```

3. **User C gets meeting details:**

   ```bash
   GET /api/meetings/abc-123
   → Returns meeting with all members:
     - User A (HOST, joined first)
     - User B (PARTICIPANT, joined second)
   ```

4. **User B tries to join again:**
   ```bash
   POST /api/meetings/abc-123/join
   → 409 Conflict: Already a member
   ```

## Dependencies

- **@nestjs/common**: HTTP decorators, exceptions
- **@prisma/client**: Database ORM
- **class-validator**: Input validation
- **uuid**: Token generation (inherited from auth module)

## Related Documentation

- [Authentication Flow](./AUTH_API.md)
- [Refresh Token Rotation](./REFRESH_TOKEN.md)
- Database Schema: `prisma/schema.prisma`
