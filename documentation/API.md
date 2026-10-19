# CampusHub REST API

Base URL: `http://localhost:5000/api` (local) or `https://<your-render-service>.onrender.com/api` (deployed).

- Requests and responses are JSON.
- Every error has the shape `{ "error": "<readable message>" }`.
- Protected routes need the header `Authorization: Bearer <token>`. The token comes from `/signup` or `/login` and is valid for 7 days.

| Symbol | Meaning |
|---|---|
| 🔓 | Public |
| 🔒 | Signed-in user (401 without a valid token) |
| 👑 | Admin only (403 for students) |

## Objects

**Event**
```json
{
  "id": 1,
  "title": "Intro to Neural Architecture",
  "description": "Hands-on workshop introducing modern deep learning models.",
  "date": "2026-10-25",
  "time": "10:00 AM - 02:00 PM",
  "location": "Science Hall 4B, Lab 2",
  "category": "workshop",
  "capacity": 50,
  "seatsLeft": 48,
  "organizer": "AI & Machine Learning Society",
  "prerequisites": "Basic Python knowledge",
  "image": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5"
}
```
`category` is one of `workshop`, `seminar`, `competition`, `sports`, `conference`, `society`. `seatsLeft` is calculated by the database from the registrations.

**User**
```json
{ "id": 2, "name": "Ali Khan", "email": "ali@university.edu", "studentId": "CS-2026-4091", "role": "student" }
```
`role` is `student` or `admin`. Passwords are stored as bcrypt hashes and are never returned.

**Registration**
```json
{
  "id": 7,
  "registrationDate": "2026-10-20T09:14:00.000Z",
  "user": { "id": 2, "name": "Ali Khan", "email": "ali@university.edu" },
  "event": { "...": "Event object" }
}
```

---

## Health

### `GET /health` 🔓
`200 { "status": "ok" }`. Use it to wake the server before a demo.

## Authentication

### `POST /signup` 🔓
Creates a **student** account (a `role` in the body is ignored) and signs in.

```json
{ "name": "Ali Khan", "studentId": "CS-2026-4091", "email": "ali@university.edu", "password": "secret12" }
```
| Status | When |
|---|---|
| `201 { token, user }` | Account created |
| `400` | Name under 3 characters, missing student ID, invalid email, password under 6 characters |
| `409` | "An account with this email already exists" (emails are case-insensitive) |

### `POST /login` 🔓
```json
{ "email": "ali@university.edu", "password": "secret12" }
```
| Status | When |
|---|---|
| `200 { token, user }` | Signed in |
| `400` | Email or password missing |
| `401` | "Incorrect email or password" (same message for an unknown email) |

## Events

### `GET /events` 🔓
Query parameters (both optional):

| Param | Example | Effect |
|---|---|---|
| `search` | `?search=ai workshop` | Matches title, description, location or organizer (case-insensitive) |
| `category` | `?category=sports` | Exact category |

`200 [Event]`, sorted by date then time. `400` for an unknown category.

### `GET /events/:id` 🔓
`200 Event` · `400` "Invalid event id" · `404` "Event not found"

### `POST /events` 🔒👑
```json
{
  "title": "Advanced AI Hackathon",
  "description": "A 24-hour hackathon for students interested in machine learning.",
  "date": "2026-12-05",
  "time": "09:00 AM - 09:00 PM",
  "location": "Innovation Lab",
  "category": "competition",
  "capacity": 60,
  "organizer": "AI Society",
  "prerequisites": "Laptop required",
  "image": "https://example.com/hackathon.jpg"
}
```
| Status | When |
|---|---|
| `201 Event` | Created |
| `400` | A field is missing or invalid (date in the past, capacity not 1–10000, description under 20 characters, unknown category, image not an http(s) URL) |
| `401` / `403` | Not signed in / not an admin |

### `PUT /events/:id` 🔒👑
Same body as `POST`. Past dates are allowed so old events can still be corrected.

`200 Event` · `400` (including "Capacity cannot be lower than the number of registered students") · `401` · `403` · `404`

### `DELETE /events/:id` 🔒👑
Deletes the event **and all its registrations**.

`200 { "message": "Event deleted" }` · `401` · `403` · `404`

## Registrations

### `POST /register` 🔒
```json
{ "eventId": 1 }
```
| Status | When |
|---|---|
| `201 Registration` | Registered (the returned event shows the new `seatsLeft`) |
| `400` | "Event is full", "This event has already taken place", "Administrators can't register for events", or an invalid id |
| `404` | Event not found |
| `409` | "You are already registered for this event" |

Capacity and duplicates are also enforced by the database, so two students cannot take the last seat at the same time.

### `GET /registrations` 🔒
Students get their own registrations; admins get everyone's. Newest first.

`200 [Registration]` · `401`

### `DELETE /registrations/:eventId` 🔒
Cancels **your own** registration for that event.

`200 { "message": "Registration cancelled" }` · `401` · `404` "You are not registered for this event"

---

## Status codes used

| Code | Meaning |
|---|---|
| 200 / 201 | Success / created |
| 400 | The request is invalid; the message says what to fix |
| 401 | Not signed in, or the session expired |
| 403 | Signed in, but not allowed (admin only) |
| 404 | Route, event or registration not found |
| 409 | Duplicate (email already used, already registered) |
| 500 | Unexpected server error (details are logged on the server, never sent to the client) |

## Quick test with curl

```bash
# sign in and keep the token
TOKEN=$(curl -s -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ali@university.edu","password":"student123"}' | node -pe "JSON.parse(require('fs').readFileSync(0)).token")

curl "http://localhost:5000/api/events?search=cyber"
curl -X POST http://localhost:5000/api/register -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"eventId":4}'
curl http://localhost:5000/api/registrations -H "Authorization: Bearer $TOKEN"
```
