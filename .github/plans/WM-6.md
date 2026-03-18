# WM-6: Refactor backend to stateless participant model

---

## 1. Feature Summary

Remove the `meetingMember` database table and all related code so that any authenticated user with a valid meeting link can join a meeting via Socket.IO `join-room` without requiring a pre-created membership record. The in-memory `SignalingSessionService` (introduced in WM-5) becomes the sole source of truth for who is currently in a call. REST and WebSocket APIs are updated accordingly, and `docs/MEETING_API.md` and `docs/signaling-events.md` are revised to reflect the new behaviour.

---

## 2. Problem Statement

The current flow forces server-side state across two layers: the `meetingMember` Postgres table (persistent) and the in-memory `SignalingSessionService` (ephemeral). Every time a user wants to join a meeting, the gateway checks `findMemberByMeetingAndUser`, which means they must have a `meetingMember` row created either during `POST /meetings` or via `POST /meetings/:id/join`. This causes:

- Unnecessary coupling between the REST and WebSocket layers.
- A stateful join prerequisite that does not reflect real-time presence — a user can have a DB row but not be in the call, and vice versa.
- Two code paths to maintain for participant tracking: the DB rows and the Maps.
- Extra latency on every `join-room` and `watch-meeting` event due to the DB lookup.

Removing `meetingMember` simplifies the model: a meeting exists in the DB; who is currently in it is tracked entirely in memory by `SignalingSessionService`.

---

## 3. Technical Design

### Affected modules

| Path                                       | Change                                                                                                                                                                                                            |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                     | Remove `MeetingMember` model, `MeetingRole` enum, `members` relation on `Meeting`, and `meetingMembers` relation on `User`                                                                                        |
| `prisma/migrations/`                       | New migration to `DROP TABLE meeting_members; DROP TYPE "MeetingRole"`                                                                                                                                            |
| `src/meetings/meetings.repository.ts`      | Remove `createMembershipWithinTransaction` and `findMemberByMeetingAndUser`                                                                                                                                       |
| `src/meetings/meetings.service.ts`         | Remove `joinMeeting`; simplify `createMeeting` (no transaction needed); simplify `getMeetingDetails` (no `members` include)                                                                                       |
| `src/meetings/meetings.controller.ts`      | Remove `POST /meetings/:id/join` endpoint                                                                                                                                                                         |
| `src/meetings/dto/meeting-response.dto.ts` | Remove `members` field                                                                                                                                                                                            |
| `src/meetings/dto/meeting-member.dto.ts`   | Delete file                                                                                                                                                                                                       |
| `src/meetings/dto/join-meeting.dto.ts`     | Delete file (no longer needed)                                                                                                                                                                                    |
| `src/signaling/signaling.gateway.ts`       | Remove `findMemberByMeetingAndUser` checks from `handleJoinRoom` and `handleWatchMeeting`                                                                                                                         |
| `docs/MEETING_API.md`                      | Remove `POST /meetings/:id/join` documentation; remove `members` from response examples; remove schema docs for `MeetingMember` and `MeetingRole`; add note that participants are tracked in-memory via Socket.IO |
| `docs/signaling-events.md`                 | Remove the note that `join-room` requires prior membership; clarify any authenticated user with a valid `meetingId` may join                                                                                      |

### Services to modify or create

#### `MeetingsRepository` (modify)

- Remove `createMembershipWithinTransaction(tx, meetingId, userId, role)`
- Remove `findMemberByMeetingAndUser(meetingId, userId)`
- `findById` signature unchanged; remove optional `include` param or keep as-is for future use (no callers will pass `members` include after this change)

#### `MeetingsService` (modify)

- `createMeeting`: remove the `$transaction` wrapper; replace with a single `tx.meeting.create` call (no membership row to create). Return the flat `MeetingResponseDto` without `members`.
- Remove `joinMeeting` method entirely.
- `getMeetingDetails`: replace the `findById(id, { members: ... })` call with `findById(id)` (no include). Return the flat `MeetingResponseDto` without `members`.

#### `SignalingGateway` (modify)

- `handleJoinRoom`: remove the `findMemberByMeetingAndUser` check and the 403 response. Keep the `findById` existence check (404). After verifying the meeting exists, proceed directly to `isParticipant` guard → `addParticipant`.
- `handleWatchMeeting`: remove the `findMemberByMeetingAndUser` check and the 403 response. Keep the `findById` existence check (404). Proceed directly to `socket.join(`watch:${meetingId}`)`.

### Database changes

1. Remove from `prisma/schema.prisma`:
   - The `MeetingMember` model
   - The `MeetingRole` enum
   - The `members MeetingMember[]` relation on `Meeting`
   - The `meetingMembers MeetingMember[]` relation on `User`

2. Create a new migration:
   ```sql
   DROP TABLE "meeting_members";
   -- MeetingRole enum removal is handled automatically by Prisma
   ```
   Use `prisma migrate dev --name remove_meeting_member` for development, then `prisma migrate deploy` in CI/production.

### API endpoints

| Method                        | Path             | Change                                                        |
| ----------------------------- | ---------------- | ------------------------------------------------------------- |
| `POST /api/meetings`          | Create meeting   | Response no longer includes `members`; no transaction         |
| `GET /api/meetings/:id`       | Get meeting      | Response no longer includes `members`                         |
| `POST /api/meetings/:id/join` | ~~Join meeting~~ | **Removed** — joining happens via `join-room` Socket.IO event |

#### Updated `MeetingResponseDto`

```
{
  id: string (UUID)
  title: string
  hostId: string (UUID)
  createdAt: ISO 8601 timestamp
  updatedAt: ISO 8601 timestamp
}
```

### Validation rules

- No changes to existing DTO validation.
- `MeetingMemberDto` and `JoinMeetingDto` files are deleted; no references should remain after the refactor.
- `MeetingRole` import from `@prisma/client` is removed wherever referenced (service, repository).

---

## 4. Edge Cases

| Scenario                                                            | Handling                                                                                                                                                                       |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /meetings/:id` called for a meeting that does not exist        | `NotFoundException` — unchanged behaviour                                                                                                                                      |
| `join-room` emitted for a non-existent `meetingId`                  | Gateway returns `{ code: 404, message: 'Meeting <id> not found' }` — unchanged behaviour                                                                                       |
| `watch-meeting` emitted for a non-existent `meetingId`              | Same 404 path — unchanged                                                                                                                                                      |
| User joins the same meeting from two tabs simultaneously            | `addParticipant` evicts the old socket (duplicate userId eviction implemented in WM-5)                                                                                         |
| Socket reconnects before the server processes the disconnect        | `handleDisconnect` calls `removeParticipant(oldSocketId)` first; new `handleJoinRoom` calls `addParticipant` which evicts the old entry if the same userId is still registered |
| Migration run against a database with existing `meetingMember` rows | All rows are deleted when the table is dropped; confirm this is acceptable before running in production (stated in issue: safe to delete)                                      |
| `MeetingRole` enum referenced in other code                         | Search confirms it is only used in `meetings.service.ts`, `meetings.repository.ts`, and the DTO; all removed in this PR                                                        |
| Two users emitting `join-room` at the same time                     | Node.js is single-threaded; in-memory Map mutations are synchronous — no race condition                                                                                        |
| `findById` is still used in the gateway; `include` param removal    | `findById` still accepts an optional `include` for future extensibility; existing gateway callers pass no `include`, so behaviour is unchanged                                 |

---

## 5. Implementation Plan

1. **Audit `meetingMember` references** — Search the entire codebase for `meetingMember`, `MeetingMember`, `MeetingRole`, `joinMeeting`, `createMembershipWithinTransaction`, and `findMemberByMeetingAndUser` to produce a complete list of files to change before touching anything.

2. **Update Prisma schema** — Remove the `MeetingMember` model, `MeetingRole` enum, and related relations from `schema.prisma`. Run `prisma migrate dev --name remove_meeting_member` to generate and apply the migration locally.

3. **Simplify `MeetingsRepository`** — Delete the two membership methods. Remove the `MeetingRole` import. Keep `create` and `findById` as-is.

4. **Simplify `MeetingsService`** — Replace `createMeeting`'s `$transaction` with a direct `prisma.meeting.create` call. Remove `joinMeeting`. Simplify `getMeetingDetails` to not include the `members` relation. Remove the `MeetingMemberDto` import and usage.

5. **Remove `POST /meetings/:id/join` from the controller** — Delete the `joinMeeting` handler and its imports.

6. **Delete obsolete DTO files** — Delete `meeting-member.dto.ts` and `join-meeting.dto.ts`. Update `meeting-response.dto.ts` to remove the `members` field and its import.

7. **Remove membership checks from `SignalingGateway`** — In `handleJoinRoom` and `handleWatchMeeting`, remove the `findMemberByMeetingAndUser` call and the 403 guard. The `meetingsRepository` is still injected for the `findById` existence check.

8. **Update `docs/MEETING_API.md`** — Remove the `POST /meetings/:id/join` section, update the `MeetingResponseDto` schema (no `members`), remove `MeetingMember` and `MeetingRole` schema docs, remove the `join-meeting.dto.ts` from the architecture tree, and add a note that live participants are tracked via `SignalingSessionService` over Socket.IO.

9. **Update `docs/signaling-events.md`** — Update the `join-room` section to state that any authenticated user with a valid `meetingId` may join (no prior membership required). Remove any text that implies a membership check occurs.

10. **Update tests** — Update `signaling.gateway.spec.ts` to remove the `findMemberByMeetingAndUser` mock from `handleJoinRoom` and `handleWatchMeeting` test cases. Update or delete any unit tests in `meetings.service.spec.ts` covering `joinMeeting` and the membership logic. Ensure `pnpm test` passes with 64+ tests.

11. **Run build and tests** — `pnpm build` must pass with zero TS errors. `pnpm test` must pass all tests.

---

## 6. Implementation Order

1. Audit all `meetingMember` / `MeetingRole` references across the codebase
2. Update `prisma/schema.prisma` — remove `MeetingMember` model, `MeetingRole` enum, relations
3. Generate and apply migration: `prisma migrate dev --name remove_meeting_member`
4. Simplify `MeetingsRepository` — remove `createMembershipWithinTransaction` and `findMemberByMeetingAndUser`
5. Simplify `MeetingsService` — remove `joinMeeting`, flatten `createMeeting`, simplify `getMeetingDetails`
6. Remove `POST /meetings/:id/join` from `MeetingsController`
7. Delete `src/meetings/dto/meeting-member.dto.ts` and `src/meetings/dto/join-meeting.dto.ts`
8. Update `src/meetings/dto/meeting-response.dto.ts` — remove `members` field
9. Remove `findMemberByMeetingAndUser` checks from `SignalingGateway.handleJoinRoom` and `handleWatchMeeting`
10. Update `docs/MEETING_API.md`
11. Update `docs/signaling-events.md`
12. Update `signaling.gateway.spec.ts` (remove membership mock setup from join-room and watch-meeting tests)
13. Update/delete any service-layer tests for `joinMeeting`
14. Run `pnpm build` — verify zero TypeScript errors
15. Run `pnpm test` — verify all tests pass

---

## 7. Task Breakdown

- [ ] Run `grep -r "meetingMember\|MeetingMember\|MeetingRole\|joinMeeting\|createMembershipWithinTransaction\|findMemberByMeetingAndUser" src/ prisma/ docs/ --include="*.ts" --include="*.md" -l` to list all affected files
- [ ] Remove `MeetingMember` model from `prisma/schema.prisma`
- [ ] Remove `MeetingRole` enum from `prisma/schema.prisma`
- [ ] Remove `members MeetingMember[]` relation from `Meeting` model in `prisma/schema.prisma`
- [ ] Remove `meetingMembers MeetingMember[]` relation from `User` model in `prisma/schema.prisma`
- [ ] Run `prisma migrate dev --name remove_meeting_member` and verify migration SQL
- [ ] Delete `createMembershipWithinTransaction` from `MeetingsRepository`
- [ ] Delete `findMemberByMeetingAndUser` from `MeetingsRepository`
- [ ] Remove `MeetingRole` import from `MeetingsRepository`
- [ ] Replace `createMeeting`'s `$transaction` with a direct `prisma.meeting.create` in `MeetingsService`
- [ ] Delete `joinMeeting` method from `MeetingsService`
- [ ] Replace `getMeetingDetails`'s `findById(id, { members: ... })` with `findById(id)` in `MeetingsService`
- [ ] Remove `MeetingMemberDto` import and usage from `MeetingsService`
- [ ] Remove `MeetingRole` import from `MeetingsService`
- [ ] Delete `POST /meetings/:id/join` handler from `MeetingsController`
- [ ] Delete `src/meetings/dto/meeting-member.dto.ts`
- [ ] Delete `src/meetings/dto/join-meeting.dto.ts`
- [ ] Remove `members?: MeetingMemberDto[]` field and import from `MeetingResponseDto`
- [ ] Remove `findMemberByMeetingAndUser` call and 403 guard from `SignalingGateway.handleJoinRoom`
- [ ] Remove `findMemberByMeetingAndUser` call and 403 guard from `SignalingGateway.handleWatchMeeting`
- [ ] Update `docs/MEETING_API.md`: remove `POST /meetings/:id/join` section
- [ ] Update `docs/MEETING_API.md`: remove `MeetingMember` and `MeetingRole` schema docs
- [ ] Update `docs/MEETING_API.md`: update `MeetingResponseDto` examples to exclude `members`
- [ ] Update `docs/MEETING_API.md`: remove `join-meeting.dto.ts` and `meeting-member.dto.ts` from architecture tree
- [ ] Update `docs/MEETING_API.md`: add note that live participants are tracked in-memory via Socket.IO `SignalingSessionService`
- [ ] Update `docs/signaling-events.md`: update `join-room` description — no membership check, any authenticated user may join
- [ ] Update `signaling.gateway.spec.ts`: remove `findMemberByMeetingAndUser` mock setup and 403 assertions from `handleJoinRoom` and `handleWatchMeeting` test suites
- [ ] Delete or update `meetings.service.spec.ts` tests covering `joinMeeting` and membership creation
- [ ] Run `pnpm build` — confirm zero TypeScript errors
- [ ] Run `pnpm test` — confirm 64+ tests pass
