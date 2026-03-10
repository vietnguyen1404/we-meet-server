# WM-4: WebRTC Signaling Relay in Socket.IO Gateway

## 1. Feature Summary

This feature adds three Socket.IO event handlers to SignalingGateway -- webrtc-offer, webrtc-answer, and webrtc-ice-candidate -- that transparently relay WebRTC negotiation messages from a sender socket to a target socket within the same meeting room. The server validates room membership for both parties but never parses, logs, or stores the SDP or ICE candidate content.

---

## 2. Problem Statement

WebRTC peer connections require an out-of-band signaling channel to exchange session descriptions (offer/answer) and ICE candidates before a direct media channel can be opened. Without a relay mechanism in the gateway, participants have no way to negotiate their peer connections after joining a meeting room. This is the missing link between presence management (WM-2) and live media.

---

## 3. Technical Design

### Affected Modules

- src/signaling/signaling.gateway.ts -- add three @SubscribeMessage handlers and a shared private relay helper; extend ClientToServerEvents and ServerToClientEvents interfaces
- src/signaling/signaling.gateway.spec.ts -- add unit tests for relay events and error paths
- docs/signaling-events.md -- document new events, payload schemas, and error codes

### Services to Modify or Create

SignalingGateway -- add the following:

New interfaces: WebRtcRelayPayload { meetingId, targetSocketId, payload: unknown } and WebRtcRelayServerPayload { fromSocketId, payload: unknown }.

Extend ClientToServerEvents with webrtc-offer, webrtc-answer, webrtc-ice-candidate (each taking WebRtcRelayPayload).
Extend ServerToClientEvents with webrtc-offer, webrtc-answer, webrtc-ice-candidate (each delivering WebRtcRelayServerPayload).

Add private handleWebRtcRelay(event, payload, socket) implementing:

- Auth guard: emit error 401 if socket.data.user absent
- Input validation: emit error 400 if meetingId or targetSocketId missing/non-string
- Sender-presence check: emit error 403 if sender not in room
- Target-presence check: emit error 404 if target not in room

### Database Changes

None. All validation relies on the in-memory rooms map populated by join-room.

### API Endpoints (WebSocket Events)

Client-to-server: webrtc-offer, webrtc-answer, webrtc-ice-candidate
Payload: { meetingId: string; targetSocketId: string; payload: unknown }

Server-to-client (relayed to target): webrtc-offer, webrtc-answer, webrtc-ice-candidate
Payload: { fromSocketId: string; payload: unknown }

Error codes emitted to sender: 400 (bad input), 401 (unauthenticated), 403 (sender not in room), 404 (target not in room)

### Validation Rules

- meetingId: required non-empty string
- targetSocketId: required non-empty string

---

## 4. Edge Cases

1. Sender not authenticated -- emit error 401.
2. Missing meetingId or targetSocketId -- emit error 400.
3. Sender not in room -- emit error 403.
4. Target not in room (left or never joined) -- emit error 404.
5. Sender targets itself -- both presence checks pass; event delivered back to sender. Valid for loopback; do not block.
6. Relay before join-room -- caught by sender-presence check (403).
7. Target disconnects between validation and emit -- Socket.IO silently drops; no error needed.
8. Malformed meetingId (null/non-string) -- caught by input validation (400).
9. payload.payload is null or undefined -- forward as-is without inspection.

---

## 5. Implementation Plan

### Step 1: Add payload interfaces

Add WebRtcRelayPayload and WebRtcRelayServerPayload interfaces to signaling.gateway.ts alongside existing payload interfaces.

### Step 2: Extend event type interfaces

Add webrtc-offer, webrtc-answer, webrtc-ice-candidate to ClientToServerEvents and ServerToClientEvents.

### Step 3: Implement handleWebRtcRelay helper

Private method with full validation (401, 400, 403, 404) and server.to(targetSocketId).emit() forwarding. Log event/meetingId/fromSocketId/targetSocketId only.

### Step 4: Add three @SubscribeMessage handlers

Add handleWebRtcOffer, handleWebRtcAnswer, handleWebRtcIceCandidate each delegating to handleWebRtcRelay.

## 6. Implementation Order

1. Add WebRtcRelayPayload and WebRtcRelayServerPayload interfaces
2. Extend ClientToServerEvents with three new client-to-server events
3. Extend ServerToClientEvents with three new server-to-client events
4. Implement private handleWebRtcRelay with full validation and forwarding
5. Add @SubscribeMessage('webrtc-offer') handler
6. Add @SubscribeMessage('webrtc-answer') handler
7. Add @SubscribeMessage('webrtc-ice-candidate') handler
8. Write unit tests in signaling.gateway.spec.ts
9. Update docs/signaling-events.md
10. Run pnpm lint and pnpm test

---

## 7. Task Breakdown

- [ ] Add WebRtcRelayPayload interface: { meetingId: string; targetSocketId: string; payload: unknown }
- [ ] Add WebRtcRelayServerPayload interface: { fromSocketId: string; payload: unknown }
- [ ] Extend ClientToServerEvents with webrtc-offer, webrtc-answer, webrtc-ice-candidate
- [ ] Extend ServerToClientEvents with webrtc-offer, webrtc-answer, webrtc-ice-candidate
- [ ] Implement private handleWebRtcRelay with auth guard, input validation, sender-presence (403), target-presence (404), and server.to(targetSocketId).emit()
- [ ] Ensure handleWebRtcRelay never logs payload.payload contents
- [ ] Add @SubscribeMessage('webrtc-offer') handler delegating to handleWebRtcRelay
- [ ] Add @SubscribeMessage('webrtc-answer') handler delegating to handleWebRtcRelay
- [ ] Add @SubscribeMessage('webrtc-ice-candidate') handler delegating to handleWebRtcRelay
- [ ] Test: successful webrtc-offer relay — target socket receives event with fromSocketId and payload
- [ ] Test: successful webrtc-answer relay
- [ ] Test: successful webrtc-ice-candidate relay
- [ ] Test: unauthenticated sender returns error { code: 401 }
- [ ] Test: missing meetingId returns error { code: 400 }
- [ ] Test: missing targetSocketId returns error { code: 400 }
- [ ] Test: sender not in room returns error { code: 403 }
- [ ] Test: target not in room returns error { code: 404 }
- [ ] Update docs/signaling-events.md with relay event table and payload schemas
- [ ] Run pnpm lint and confirm clean
- [ ] Run pnpm test and confirm all tests pass
