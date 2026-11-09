# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.

- Presentation tier decision: Keep route components focused on rendering and interaction, and use the shared API client for all requests. Each capability shows accessible loading, success, empty, and error states.
- Logic tier decision: Keep HTTP handling in `/api` routes and business rules in explicit service functions. Validate request shape and references before persistence, return deliberate 4xx responses for invalid or missing resources, and avoid exposing Mongoose cast errors as 500 responses.
- Data tier decision: Enforce required fields and sensible constraints in Mongoose schemas, retain ObjectId references between users, teams, and activities, and preserve the seed script's idempotent upsert behavior without clearing unrelated records.
- Activity tracking approach: Accept `userId`, `teamId`, `type`, and positive `minutes`; validate both IDs and confirm the referenced user and team exist. Persist the references, activity details, computed points (one point per minute), and an `occurredAt` timestamp.
- Team management approach: Require a non-empty name, accept the mascot and optional member IDs, persist member references, and return created and listed teams with their submitted names and mascots.
- Leaderboard approach: Sum activity points by team, sort by total points descending, and return each team's name, total, and 1-based rank.
- Workout suggestions approach: Find the user by email or return 404. Use that user's goal and recent activity to choose relevant workouts, prioritizing the goal when appropriate and including a short reason for the recommendation.

## Test plan

Record the commands you run and what each failure means.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend` — run after schema and seed changes; failures indicate model constraints or seed behavior violate the data contract. Baseline: 4 failed, 1 passed; the four model validation checks failed and idempotent seeding passed.
- API command: `npm run test:api --prefix octofit-tracker/backend` — run after service and route changes; failures indicate incorrect validation/status codes, persisted API behavior, ranking, or recommendation results. Baseline: 4 failed; activity/team validation returned 501, leaderboard was empty, and a suggestion lacked its reason.
- Frontend command: `npm test --prefix octofit-tracker/frontend` — run after route/component changes; failures indicate rendering, API request, or accessible loading/empty/error-state regressions. Baseline: 15 failed across the four capability routes.
- Backend build command: `npm run build --prefix octofit-tracker/backend` — run after backend changes; failures indicate TypeScript errors. Not run in the current baseline.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend` — run after frontend changes; failures indicate TypeScript or Vite build errors. Not run in the current baseline.
