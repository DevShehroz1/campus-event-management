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

- **Theme:** glass on dark — mid-tone indigo gradient (`#262c41 → #343c58`) with ambient blur glows, frosted translucent panels (`rgba(255,255,255,0.075)`), subtle highlight edges.
- **Typography:** Bricolage Grotesque (display headings), Manrope (body), IBM Plex Mono (labels + numbers).
- **Shape:** 999 px pill buttons / chips, 20 px glass cards, 14 px inputs.
- **Accent:** warm orange gradient (`#e8915f → #db7c4c`); danger `#f0a3ad`; success `#5fe0a9`.
- **Category badge accents:** workshop = orange, seminar = violet, competition = mint, sports = blue, conference = pink, society = magenta.
- Layout patterns are conventional (sticky top bar, hero + stats + category grid + event cards + detail/dashboard/forms) — just styled on the glass palette.
- No Tailwind, no build step — pure CSS in `css/style.css`.
