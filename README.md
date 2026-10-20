# Campus Event Management System

**CampusHub** is a full-stack web application where university students browse, search and register for campus events (seminars, workshops, sports events, competitions, conferences and student society activities), and administrators create and manage those events.

Built as a team mini project to practise full-stack development and real GitHub collaboration: feature branches, issues, pull requests and code review.

- **Live site:** https://campus-event-management-delta.vercel.app
- **API:** https://campushub-api-hok-s-projects.vercel.app/api (health check: `/api/health`)

## Team Members

| Role | Member | Branch |
|---|---|---|
| Team Lead / Project Manager + Back-End Developer (REST API) | Muhammad Shehroz Asif ([@DevShehroz1](https://github.com/DevShehroz1)) | `main`, `feature/backend-api` |
| Front-End Developer 1 (UI) | Ibrahim | `feature/frontend-ui` |
| Front-End Developer 2 (functionality + API integration) | Zurayz ([@Zurayzuol](https://github.com/Zurayzuol)) | `feature/frontend-functionality` |
| Back-End Developer 2 (Database & Testing) | _name_ | `feature/database-testing` |

## Features

**Students**
- Browse all events, or the featured upcoming ones on the home page
- Search by title, description, location or organiser, and filter by category
- See full event details with live seat availability
- Create an account, sign in and register for an event in a few clicks
- Dashboard with upcoming and past registrations; cancel a registration

**Administrators**
- Create, edit and delete events
- Dashboard with statistics, an events table and every student registration

**Under the hood**
- REST API with JWT authentication and role-based access (student / admin)
- Passwords hashed with bcrypt; secrets kept in environment variables
- The database enforces capacity and prevents duplicate registrations, even with simultaneous requests
- Validation on both the frontend and the backend, with clear error messages
- Responsive, accessible UI with a glass theme, loading skeletons, empty and error states
- 33 automated API tests run by GitHub Actions on every push

## Tech Stack

| Layer | Technology |
|---|---|
| Front end | HTML5, CSS3, JavaScript (no framework, no build step) |
| Back end | Node.js, Express.js |
| Database | PostgreSQL on Supabase |
| Auth | JSON Web Tokens (jsonwebtoken), bcryptjs |
| Testing | Node test runner + Supertest, Postman |
| Version control / CI | Git, GitHub, GitHub Actions |
| Deployment | Vercel (front end and API as two projects) |

## Architecture

```
 Browser (frontend/)                Express API (backend/)                 Supabase
 HTML + CSS + JS        fetch       routes → controllers → models          PostgreSQL
 js/api.js  ───────────────────▶   JWT auth · validation · errors  ──────▶ users · events
            ◀───────────────────   JSON                            ◀────── registrations
                                                                           view: events_with_seats
```

## Repository Structure

```
campus-event-management/
├── frontend/                 Static site (open in a browser or any static server)
│   ├── *.html                index, events, event-details, login, dashboard, create-event, 404
│   ├── css/style.css
│   └── js/                   api.js, ui.js, validation.js, pages/*.js
├── backend/                  Express REST API
│   ├── server.js
│   ├── src/
│   │   ├── routes/           URL → controller
│   │   ├── controllers/      request handling
│   │   ├── models/           all database access (Supabase)
│   │   ├── middleware/       auth, validation, errors
│   │   ├── config/           environment + Supabase client
│   │   └── utils/
│   └── tests/                automated API tests
├── documentation/            API.md (+ database documentation)
├── screenshots/
├── .github/workflows/        CI
├── LICENSE
└── README.md
```

## Installation

**Requirements:** Node.js 20+, Git, and a Supabase project with the schema from the database documentation.

```bash
git clone https://github.com/DevShehroz1/campus-event-management.git
cd campus-event-management
```

### 1. Back end

```bash
cd backend
npm install
cp .env.example .env      # Windows: copy .env.example .env
```
Fill in `backend/.env`:

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` key (keep it secret) |
| `JWT_SECRET` | Any long random string: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CORS_ORIGINS` | Frontend URLs allowed to call the API, comma separated |

```bash
npm run dev               # http://localhost:5000/api/health → {"status":"ok"}
npm test                  # runs the automated tests (no database needed)
```

### 2. Front end

In a second terminal, from the project root:

```bash
npx serve frontend -l 3000
# or: python -m http.server 3000 -d frontend
```
Open <http://localhost:3000>. On `localhost` the front end calls `http://localhost:5000/api` automatically.

### Test accounts

| Email | Password | Role |
|---|---|---|
| ali@university.edu | student123 | Student |
| sara@university.edu | student123 | Student |

The admin login is shared privately with the team and the instructor.

## API

Full reference with request and response examples: **[documentation/API.md](documentation/API.md)**

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/signup` | Public |
| POST | `/api/login` | Public |
| GET | `/api/events?search=&category=` | Public |
| GET | `/api/events/:id` | Public |
| POST | `/api/events` | Admin |
| PUT | `/api/events/:id` | Admin |
| DELETE | `/api/events/:id` | Admin |
| POST | `/api/register` | Signed in |
| GET | `/api/registrations` | Signed in (admin sees all) |
| DELETE | `/api/registrations/:eventId` | Signed in (own only) |

## Testing

- **Automated:** `cd backend && npm test`: 33 tests covering auth, validation, permissions, events and registrations. GitHub Actions runs them on every push and pull request.
- **Manual / Postman:** the Postman collection in `backend/tests/` covers every endpoint, including error cases.
- **Database:** insert, select, update and delete checks are documented in `documentation/`.

## Git Workflow

- `main` always holds the stable version; nobody commits to it directly.
- Each member works on their own `feature/*` branch and opens a pull request into `main`.
- The Team Lead reviews every pull request (approve or request changes) before merging.
- Work is tracked with GitHub Issues and labels (Frontend, Backend, Database, Bug, Documentation, Testing).

## Screenshots

See the [`screenshots/`](screenshots/) folder.

## Deployment notes

Both parts are deployed on Vercel from this repository, as two projects:

| Vercel project | Root directory | Notes |
|---|---|---|
| `campus-event-management` | `frontend` | Static site, no build step |
| `campushub-api` | `backend` | Express runs as a Vercel Function (`backend/api/index.js`, `backend/vercel.json`) |

- Every push to `main` redeploys both; every pull request gets preview URLs.
- The API's environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGINS`) are set in the Vercel project settings and are never committed.
- `CORS_ORIGINS` lists the live site and allows preview deployments with a `*` entry, e.g. `https://campus-event-management-*-hok-s-projects.vercel.app`.

## License

[MIT](LICENSE)
