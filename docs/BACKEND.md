# Backend

Visitors save a specification, share it as a link and ask for a test drive. Staff handle requests and prices at the front desk (`/admin.html`).

```
browser ── nginx (site, admin page, CSP) ── /api ── Spring Boot ── PostgreSQL
```

## Decisions

- **Session cookie, not a token in the browser.** The site and the API share an origin, so an HttpOnly cookie with CSRF protection is simpler and keeps credentials out of reach of scripts.
- **No default password.** The first account comes from the environment, and start-up fails if its password is shorter than 12 characters. Passwords are stored with bcrypt.
- **A saved design keeps the price it was saved with** and its options stay readable after they are withdrawn. Withdrawn options cannot be used in a new design.
- **Optimistic locking with the version sent by the page.** Two people editing one row get a conflict and a reload button, not a lost change. Hiding options locks the kind, so the last one cannot disappear in a race.
- **The audit entry is written in the same transaction** as the change it describes.
- **Nobody gets the same time twice.** Availability is weekly opening times, minus closed times, minus live requests. Booking takes a PostgreSQL advisory lock on the time, and a partial unique index on live requests refuses a duplicate even if the code is wrong. A test sends twelve bookings for one time at once and expects exactly one to succeed.
- **Times are stored as instants** and shown in the studio's zone, so daylight saving cannot move a booking.
- **My request needs the reference and the email together**, sent in the body so they never reach a log or a browser history. A wrong email and a wrong reference get the same answer, and attempts are limited per address. Moving a date asks for confirmation again; nothing can be changed in the last twelve hours.
- **CSV export** defuses cells that a spreadsheet would run as formulas.
- **Errors are RFC 9457 problem documents** with messages per field, which the forms show next to the inputs.
- **Flyway owns the schema**; Hibernate only validates it. Database checks repeat the important rules.
- **The film does not depend on the API.** If it cannot be reached the car still works, without prices. The GitHub Pages build contains no API code at all.

## API

| | | |
|---|---|---|
| GET | `/api/catalog` | Options on offer |
| POST | `/api/designs` | Save a design, returns its code and total |
| GET | `/api/designs/{code}` | Open a saved design |
| GET | `/api/availability` | Two weeks of times, free or not |
| POST | `/api/test-drives` | Request a test drive at a free time |
| POST | `/api/my-request`, `/move`, `/cancel` | See, move or cancel one's own request |
| GET | `/api/session` | Who is signed in |
| POST | `/api/login`, `/api/logout` | Form login |
| GET | `/api/admin/summary`, `/designs`, `/audit` | Staff only |
| GET, PATCH | `/api/admin/test-drives[/{id}]` | Search and handle requests |
| GET, POST, PUT | `/api/admin/options[/{id}]` | Catalogue |
| GET, PUT | `/api/admin/calendar`, `/opening-times`; GET `/bookings` | Week, closed times, weekly hours |
| GET | `/api/admin/report`, `/test-drives.csv` | Numbers and export |

## Limits, on purpose

- The rate limiter and sessions live in memory, so this runs as one instance. Several would need a shared store.
- The login limit counts per address, after nginx replaces any forwarded address sent by the client.
- No e-mail is sent, there is no password reset, and all staff have the same rights.
- Not deployed. Serve it over HTTPS with `COOKIE_SECURE=true`.
- Prices are invented. Requests hold personal data, so a real deployment needs a retention period.

## Tests

`backend`: 36 tests run the whole application against a real PostgreSQL in a container, and 1 covers the rate limiter. `tools/e2e.mjs` drives the running stack in Chrome: 59 checks, including axe, booking and moving a date, a second tab, a session that ends mid-edit, and the API being unreachable.

With Colima, Testcontainers needs `DOCKER_HOST=unix://$HOME/.colima/default/docker.sock` and `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock`.
