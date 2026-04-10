# WM-8: Add TURN server integration for WebRTC NAT traversal

## 1. Feature Summary

This feature provides ICE server configuration (STUN + TURN) to WebRTC clients so they can traverse NAT and firewalls. The backend reads TURN server settings from environment variables, generates short-lived HMAC-based credentials on request, and delivers the ICE config both via a REST endpoint and automatically within the signaling `join-room` flow.

---

## 2. Problem Statement

Peer-to-peer WebRTC connections fail when participants sit behind symmetric NATs, corporate firewalls, or CGNAT. A TURN relay server solves this, but exposing static credentials on the client is a security risk. The backend must act as a trusted broker: authenticate the user, generate time-limited credentials, and hand them to the client — without leaking long-lived secrets.

---

## 3. Technical Design

### Affected modules

| Module / file                         | Change                                                                      |
| ------------------------------------- | --------------------------------------------------------------------------- |
| `src/config/env.validation.ts`        | Add TURN/STUN env var definitions to Zod schema                             |
| `src/signaling/`                      | Add new `IceConfigService`; update `SignalingGateway` and `SignalingModule` |
| `src/meetings/meetings.controller.ts` | Add `GET /meetings/ice-servers` endpoint                                    |
| `src/meetings/meetings.module.ts`     | Export `IceConfigService` so `SignalingModule` can consume it               |

### Services to create

**`src/signaling/ice-config.service.ts` — `IceConfigService`**

Responsibilities:

- Inject `ConfigService` to read TURN/STUN env vars.
- Expose `getIceServers(userId: string): IceServerConfig[]` which:
  - Always includes a STUN entry built from `STUN_SERVER_URL` (defaults to `stun:stun.l.google.com:19302` if not set).
  - If `TURN_SECRET` is set → **dynamic mode**: compute `username = "<ttl_unix_ts>:<userId>"` and `credential = base64(HMAC-SHA1(TURN_SECRET, username))`. TTL is `TURN_CREDENTIAL_TTL_SECONDS` (default `3600`).
  - If `TURN_SECRET` is absent but `TURN_USERNAME` + `TURN_PASSWORD` are set → **static mode**: use those values directly.
  - If neither is configured, return only the STUN entry and log a warning at startup.
- The return type is an array matching the W3C `RTCIceServer` shape: `{ urls: string | string[], username?: string, credential?: string }`.

### Database changes

None. No Prisma schema changes are required.

### API endpoints

**`GET /api/meetings/ice-servers`**

- Guard: `JwtAuthGuard` (class-level, consistent with the rest of `MeetingsController`)
- Handler: calls `IceConfigService.getIceServers(currentUser.id)`
- Response shape:
  ```json
  {
    "iceServers": [
      { "urls": "stun:stun.example.com:3478" },
      {
        "urls": "turn:turn.example.com:3478",
        "username": "1712345678:user-uuid",
        "credential": "<base64-hmac>"
      },
      {
        "urls": "turns:turn.example.com:5349",
        "username": "1712345678:user-uuid",
        "credential": "<base64-hmac>"
      }
    ]
  }
  ```
- Response DTO: `IceServersResponseDto` with a single field `iceServers: IceServerDto[]`.

**Signaling integration — `join-room` event**

Inside `SignalingGateway.handleJoinRoom`, after participants-list is emitted, additionally emit `'ice-servers'` back to the joining socket:

```
socket.emit('ice-servers', { iceServers: this.iceConfigService.getIceServers(user.id) })
```

This eliminates the need for clients to make a separate HTTP call before starting WebRTC negotiation.

### Validation rules

**Env vars (Zod additions to `envSchema`):**

| Variable                      | Type                        | Required                  | Default                        |
| ----------------------------- | --------------------------- | ------------------------- | ------------------------------ |
| `TURN_URLS`                   | Comma-separated URIs string | No                        | —                              |
| `TURN_SECRET`                 | `string.min(16)`            | No (enables dynamic mode) | —                              |
| `TURN_USERNAME`               | string                      | No (static fallback)      | —                              |
| `TURN_PASSWORD`               | string                      | No (static fallback)      | —                              |
| `TURN_CREDENTIAL_TTL_SECONDS` | positive integer            | No                        | `3600`                         |
| `STUN_URLS`                   | Comma-separated URIs string | No                        | `stun:stun.l.google.com:19302` |

A Zod `.superRefine` (or `.refine`) rule must enforce: if `TURN_URLS` is provided, then either `TURN_SECRET` **or** both `TURN_USERNAME` + `TURN_PASSWORD` must also be present. This causes a clear startup failure if TURN is partially configured.

**DTOs:**

- `IceServerDto` — plain class with `urls: string | string[]`, optional `username: string`, optional `credential: string`. No class-validator decorators needed (it's a response-only DTO).
- `IceServersResponseDto` — plain class with `iceServers: IceServerDto[]`.

**Guard on endpoint:** `JwtAuthGuard` only (no role restriction — all authenticated users can fetch ICE config).

---

## 4. Edge Cases

- **TURN partially configured** — `TURN_URLS` set but no credentials: Zod `.superRefine` catches this at startup and throws a descriptive error before the app binds to a port.
- **No TURN configured at all** — `getIceServers()` returns only STUN; the signaling `ice-servers` event and REST endpoint still work (clients fall back to STUN-only or direct P2P).
- **Dynamic credential overflow** — TTL timestamp must be a Unix epoch integer; `Math.floor(Date.now() / 1000) + ttl` avoids floating-point issues.
- **HMAC with wrong encoding** — credential must be `Buffer.from(hmac.digest()).toString('base64')` (binary digest, then base64); using hex then base64 produces invalid credentials.
- **Multiple TURN URLs** — `TURN_URLS` is a comma-separated list (e.g., `turn:host:3478,turns:host:5349`). `getIceServers()` generates one `RTCIceServer` entry per URL so each gets its own credential object.
- **Unauthenticated WebSocket** — gateway already rejects unauthenticated connections on `handleConnection`; no additional guard needed in `handleJoinRoom` for the ICE config emission.
- **Very large `userId`** — HMAC operates on raw bytes, so any UUID string length is safe.

---

## 5. Implementation Plan

1. **Extend env validation** — add the six new env vars to the Zod schema in `src/config/env.validation.ts` with the `.superRefine` cross-field constraint.

2. **Create `IceConfigService`** at `src/signaling/ice-config.service.ts`:
   - Inject `ConfigService`.
   - Parse `TURN_URLS` (split on `,`, trim) and `STUN_URLS` at construction time so parsing errors surface early.
   - `getIceServers(userId)`: build STUN entry, then (if TURN URLs present) build TURN entry in dynamic or static mode.
   - Use Node's built-in `crypto.createHmac('sha1', secret)` — no extra dependency.

3. **Create response DTOs** at `src/signaling/dto/ice-servers-response.dto.ts`:
   - `IceServerDto` and `IceServersResponseDto` plain classes.

4. **Register `IceConfigService` in `SignalingModule`** — add to `providers` and `exports` arrays so `MeetingsModule` can also import it.

5. **Update `MeetingsModule`** — import `SignalingModule` (or create a shared module; see note below) and include `IceConfigService` in `exports`.

   > **Note on circular dependency**: `SignalingModule` already imports `MeetingsModule`. To avoid a circular dependency, move `IceConfigService` into a new lightweight `src/ice-config/ice-config.module.ts` that exports only `IceConfigService`. Both `MeetingsModule` and `SignalingModule` import this new module.

6. **Add REST endpoint** — in `MeetingsController`, add `@Get('ice-servers')` method that injects `IceConfigService` and calls `getIceServers(currentUser.id)`.

7. **Update `SignalingGateway`** — inject `IceConfigService`; in `handleJoinRoom`, after emitting `'participants-list'`, emit `'ice-servers'` to `socket`.

8. **Write unit tests** — co-locate `src/ice-config/ice-config.service.spec.ts`:
   - Test dynamic credential generation (verify HMAC, username format, TTL).
   - Test static credential pass-through.
   - Test STUN-only fallback when TURN is not configured.
   - Test env validation refine rule (partial TURN config should throw).

---

## 6. Implementation Order

1. Add env var definitions and `.superRefine` constraint to `src/config/env.validation.ts`
2. Create `src/ice-config/ice-config.module.ts` and `src/ice-config/ice-config.service.ts`
3. Create `src/ice-config/dto/ice-servers-response.dto.ts`
4. Import `IceConfigModule` in `AppModule` (or confirm `isGlobal: true` pattern) so both `MeetingsModule` and `SignalingModule` can use it
5. Add `GET /meetings/ice-servers` to `MeetingsController`; inject `IceConfigService`
6. Inject `IceConfigService` in `SignalingGateway`; emit `'ice-servers'` event in `handleJoinRoom`
7. Write unit tests for `IceConfigService`
8. Run `pnpm lint` and `pnpm test` to verify

---

## 7. Task Breakdown

- [ ] Add `TURN_URLS`, `STUN_URLS`, `TURN_SECRET`, `TURN_USERNAME`, `TURN_PASSWORD`, `TURN_CREDENTIAL_TTL_SECONDS` to Zod schema in `env.validation.ts`
- [ ] Add `.superRefine` rule: if `TURN_URLS` present, require `TURN_SECRET` or (`TURN_USERNAME` + `TURN_PASSWORD`)
- [ ] Create `src/ice-config/` directory with `ice-config.module.ts` exporting `IceConfigService`
- [ ] Implement `IceConfigService.getIceServers(userId: string): IceServerConfig[]` with dynamic HMAC mode
- [ ] Implement static credential fallback in `getIceServers`
- [ ] Implement STUN-only fallback (no TURN URLs configured)
- [ ] Create `IceServerDto` and `IceServersResponseDto` in `src/ice-config/dto/`
- [ ] Import `IceConfigModule` in `AppModule`
- [ ] Add `@Get('ice-servers')` to `MeetingsController` returning `IceServersResponseDto`
- [ ] Inject `IceConfigService` into `SignalingGateway` and emit `'ice-servers'` in `handleJoinRoom`
- [ ] Write unit tests: dynamic credential generation (HMAC value, username format, expiry)
- [ ] Write unit tests: static credential mode
- [ ] Write unit tests: STUN-only fallback
- [ ] Write unit tests: env validation refine (missing credentials with TURN_URLS set)
- [ ] Run `pnpm lint` and `pnpm test` — all pass
