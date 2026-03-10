# Users API

All routes are prefixed with `/api`.

---

## POST /api/users

Create a new user directly. Intended for internal or admin use.

**Auth:** Not required

**Request body:**

```json
{
  "email": "user@example.com",
  "passwordHash": "hashed_password_string"
}
```

| Field          | Type   | Required | Constraints      |
| -------------- | ------ | -------- | ---------------- |
| `email`        | string | yes      | valid email      |
| `passwordHash` | string | yes      | min 6 characters |

**Response `201`:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": null,
  "role": "USER",
  "createdAt": "2026-03-10T00:00:00.000Z",
  "updatedAt": "2026-03-10T00:00:00.000Z"
}
```

**Error responses:**

| Status | Reason           |
| ------ | ---------------- |
| `400`  | Validation error |

> **Note:** For public user registration use `POST /api/auth/register`.

---

## GET /api/users/profile

Return the profile of the currently authenticated user.

**Auth:** Required — Bearer token

**Response `200`:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "USER",
  "createdAt": "2026-03-10T00:00:00.000Z",
  "updatedAt": "2026-03-10T00:00:00.000Z"
}
```

**Error responses:**

| Status | Reason                          |
| ------ | ------------------------------- |
| `401`  | Missing or invalid access token |

---

## GET /api/users

List all users.

**Auth:** Required — Bearer token, `ADMIN` role

**Response `200`:**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "alice@example.com",
    "name": "Alice",
    "role": "ADMIN",
    "createdAt": "2026-03-10T00:00:00.000Z",
    "updatedAt": "2026-03-10T00:00:00.000Z"
  },
  {
    "id": "661f9511-f3ac-52e5-b827-557766551111",
    "email": "bob@example.com",
    "name": "Bob",
    "role": "USER",
    "createdAt": "2026-03-10T00:00:00.000Z",
    "updatedAt": "2026-03-10T00:00:00.000Z"
  }
]
```

**Error responses:**

| Status | Reason                            |
| ------ | --------------------------------- |
| `401`  | Missing or invalid access token   |
| `403`  | Authenticated user is not `ADMIN` |

---

## GET /api/users/:id

Get a single user by ID.

**Auth:** Required — Bearer token

**Path parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `id`      | string | User ID     |

**Response `200`:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "USER",
  "createdAt": "2026-03-10T00:00:00.000Z",
  "updatedAt": "2026-03-10T00:00:00.000Z"
}
```

**Error responses:**

| Status | Reason                          |
| ------ | ------------------------------- |
| `401`  | Missing or invalid access token |
| `404`  | User not found                  |

---

## PATCH /api/users/:id

Update a user. Users may only update their own account; `ADMIN` can update any account.

**Auth:** Required — Bearer token

**Path parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `id`      | string | User ID     |

**Request body:**

```json
{
  "passwordHash": "new_hashed_password"
}
```

| Field          | Type   | Required | Constraints      |
| -------------- | ------ | -------- | ---------------- |
| `passwordHash` | string | no       | min 6 characters |

**Response `200`:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "USER",
  "createdAt": "2026-03-10T00:00:00.000Z",
  "updatedAt": "2026-03-10T00:00:00.000Z"
}
```

**Error responses:**

| Status | Reason                                      |
| ------ | ------------------------------------------- |
| `400`  | Validation error                            |
| `401`  | Missing or invalid access token             |
| `403`  | Attempting to update another user's account |
| `404`  | User not found                              |

---

## DELETE /api/users/:id

Delete a user by ID.

**Auth:** Required — Bearer token, `ADMIN` role

**Path parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `id`      | string | User ID     |

**Response `204`:** No content

**Error responses:**

| Status | Reason                            |
| ------ | --------------------------------- |
| `401`  | Missing or invalid access token   |
| `403`  | Authenticated user is not `ADMIN` |
| `404`  | User not found                    |
