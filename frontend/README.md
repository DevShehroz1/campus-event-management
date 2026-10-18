# CampusHub frontend

Vanilla HTML + Tailwind CSS (via CDN) + plain JavaScript. No build step, no npm packages.
All data comes from the REST API in `../backend/`.

## Pages

| File | Purpose |
|---|---|
| `index.html` | Home — hero, stats, category chips, featured events |
| `events.html` | Searchable + filterable directory of every event |
| `event-details.html` | Single event + 6 registration states (logged out / admin / past / registered / full / default form) |
| `login.html` | Sign in + create account tabs with live validation |
| `dashboard.html` | Student registrations OR admin management (events + registrations tables) |
| `create-event.html` | Admin create (`POST`) and edit (`PUT ?id=`) form |
| `404.html` | Not-found page using the shared chrome |

## Shared modules (`js/`)

- `api.js` — fetch client for every endpoint; auto-switches base URL between local and production; handles 401 / network errors.
- `ui.js` — shared header + footer, hamburger menu, toast + confirm modal, event cards, skeleton / empty / error states, `requireAuth` / `requireAdmin` guards.
- `validation.js` — reusable form validation rules + `validateForm` / `attachLiveValidation` / `showServerError`.
- `pages/<name>.js` — one script per page.

## Running locally

Serve the folder with any static file server, e.g.:

```bash
# option 1 — npx (no install)
npx serve frontend -l 3000

# option 2 — Python
python3 -m http.server 3000 -d frontend
```

Then open <http://localhost:3000>.

## Configuring the API URL

By default `api.js` targets `http://localhost:5000/api` when running on `localhost` and a production backend otherwise. To point every page at a custom backend without touching the code, set a global before the other scripts load, e.g. in `index.html`:

```html
<script>window.API_BASE_URL = 'https://my-backend.example.com/api';</script>
<script src="js/api.js"></script>
```

Or edit the fallback URL inside `js/api.js`.

## Design system

- **Colours:** stone-based neutrals (`stone-50` background, `stone-900` ink), orange `#f97316` accent.
- **Typography:** Inter (UI) + Instrument Serif italic (hero accent).
- **Shape:** pill-shaped buttons, 3xl rounded cards, soft elevation via `.elevate-1/2/3` CSS helpers.
- **Category colours:** workshop = orange, seminar = violet, competition = emerald, sports = sky, conference = rose, society = fuchsia.
