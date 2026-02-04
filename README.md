# WeMeet – Backend

WeMeet Backend is the core server application for the WeMeet platform, responsible for authentication, meeting lifecycle management, real-time signaling, and subscription-based access control.

The backend is designed as a **modular monolith**, optimized for real-time communication workloads and long-term maintainability.

---

## Overview

The backend provides:

- User authentication and authorization
- Video meeting room management
- Real-time signaling via WebSocket
- Presence and participant state tracking
- Subscription and VIP feature enforcement
- Secure token issuance for real-time services

Media streaming is handled by external WebRTC infrastructure.  
This service focuses on **business logic, signaling, and security**.

---

## Tech Stack

- **Node.js (LTS)**
- **TypeScript**
- **NestJS**
- **PostgreSQL**
- **Prisma**
- **Redis**
- **Socket.IO**
- **JWT Authentication**
- **Docker**
- **pnpm**

---

## Architecture

- **Modular Monolith**
- REST APIs for business operations
- WebSocket gateways for real-time signaling
- Clear separation between:
  - API layer
  - Realtime layer
  - Domain logic
  - Infrastructure concerns

Microservices are intentionally avoided in early stages to reduce complexity.

---

## Core Responsibilities

### Authentication

- JWT-based authentication
- Short-lived access tokens
- Refresh tokens stored in httpOnly cookies
- Auth enforcement for REST and WebSocket connections

### Meetings

- Create, join, and leave meeting rooms
- Manage participant roles and permissions
- Track meeting lifecycle and state

### Realtime Signaling

- WebSocket-based signaling for WebRTC
- Presence and connection state tracking
- Room-based event broadcasting

### Subscriptions

- Subscription state management
- VIP feature gating
- Permission-based access control

---

## Project Structure

src/
├── app.module.ts
├── main.ts
├── modules/
│ ├── auth/
│ ├── users/
│ ├── meetings/
│ ├── realtime/
│ └── subscriptions/
├── common/
│ ├── guards/
│ ├── decorators/
│ ├── filters/
│ ├── interceptors/
│ └── utils/
├── prisma/
│ ├── schema.prisma
│ └── migrations/
└── config/

---

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm
- PostgreSQL
- Redis
- Docker (optional, for local services)

### Installation

1. Clone the repository:
   ```bash
   git clone
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Set up environment variables (see `.env.example`).
4. Run database migrations:
   ```bash
   pnpm prisma migrate dev
   ```
5. Start the development server:
   ```bash
   pnpm start:dev
   ```
6. Access the API at `http://localhost:3000`.

---
