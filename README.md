# GeoSmart

GeoSmart is a civic waste reporting and municipal operations platform. Citizens submit geotagged photos; municipal staff classify and prioritize reports, assign crews, plan collection routes, and track resolution.

## Architecture

- **Web:** React 19, TanStack Router/Start, TypeScript, Tailwind, React Query, Axios, Leaflet/OpenStreetMap, Recharts.
- **API:** Express, Node.js, Mongoose/MongoDB, JWT, bcrypt, Multer, Socket.IO.
- **AI:** A separate model service configured with `AI_SERVICE_URL`; the Node API never trains or embeds the CNN. When that service cannot be reached, the development classifier supplies a mock result.
- **Storage:** Local `server/uploads` during development. `storageService.js` is the replacement point for object storage.

```text
React client ── REST / Socket.IO ── Express API ── MongoDB
                                      ├── external AI model API
                                      └── local uploads (development)
```

The application’s data and authentication APIs use MongoDB.

## Run locally

Requirements: Node.js 20+, npm, and MongoDB Community or MongoDB Atlas.

1. Copy `.env.example` to `.env` and set `MONGO_URI` and a unique `JWT_SECRET` (at least 24 characters). `AI_SERVICE_URL` is optional.
2. Install dependencies: `npm install`.
3. Create the demo accounts and reports: `npm run seed`.
4. Start the API and Vite client together: `npm run dev`.
5. Open `http://localhost:5173`. The API health check is `http://localhost:5000/api/health`.

You can also run `npm run server` and `npm run client` in separate terminals. `npm run build` creates the web production build. The Express service runs with `npm start`.

### Environment

| Variable                  | Description                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------- |
| `PORT`                    | Express port (default `5000`)                                                          |
| `MONGO_URI`               | MongoDB connection URI                                                                 |
| `JWT_SECRET`              | Secret used to sign seven-day bearer tokens                                            |
| `CLIENT_URL`              | Allowed client origin(s), comma separated                                              |
| `VITE_API_URL`            | Browser API base URL (default `http://localhost:5000/api`)                             |
| `VITE_SOCKET_URL`         | Socket.IO origin (default `http://localhost:5000`)                                     |
| `PUBLIC_API_URL`          | Public API origin serving uploaded `/uploads` files                                    |
| `AI_SERVICE_URL`          | External model base URL; classifier calls `POST /predict` with multipart field `image` |
| `DUPLICATE_RADIUS_METERS` | Nearby unresolved report search radius (default `100`)                                 |

## Demo accounts

| Role    | Email                     | Password             |
| ------- | ------------------------- | -------------------- |
| Admin   | `admin@geosmart.local`    | `GeoSmartAdmin2026!` |
| Worker  | `worker1@geosmart.local`  | `GeoSmartDemo2026!`  |
| Citizen | `citizen1@geosmart.local` | `GeoSmartDemo2026!`  |

Public registration creates citizen accounts only. Seeded admin/worker accounts avoid letting an anonymous visitor grant themselves municipal privileges.

## API

Except health, routes require `Authorization: Bearer <token>`. JSON responses use `{ "success": true, "data": ... }`; errors use `{ "success": false, "message": "..." }`.

| Method     | Endpoint                                           | Access                        | Purpose                                                                         |
| ---------- | -------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------- |
| POST       | `/api/auth/register`                               | Public                        | Create citizen account                                                          |
| POST       | `/api/auth/login`                                  | Public                        | Sign in and receive JWT                                                         |
| GET/PATCH  | `/api/auth/me`                                     | Authenticated                 | Read/update profile                                                             |
| POST       | `/api/auth/logout`                                 | Authenticated                 | Client token logout acknowledgement                                             |
| GET/POST   | `/api/complaints`                                  | Authenticated / citizen       | List visible reports / submit multipart report (`image`, optional `extraImage`) |
| GET        | `/api/complaints/nearby?latitude=&longitude=`      | Citizen/admin                 | Nearby unresolved reports                                                       |
| GET        | `/api/complaints/:id`                              | Owner, admin, assigned worker | Complaint detail                                                                |
| GET        | `/api/complaints/:id/history`                      | Owner, admin, assigned worker | Status timeline                                                                 |
| PATCH      | `/api/complaints/:id/status`                       | Admin/assigned worker         | Validated status transition and history entry                                   |
| PATCH      | `/api/complaints/:id/assign`                       | Admin                         | Assign worker and notify them                                                   |
| POST       | `/api/complaints/:id/resolution`                   | Assigned worker               | Attach resolution image/comment and resolve                                     |
| GET        | `/api/workers`                                     | Authenticated                 | Admin worker list or worker’s own profile                                       |
| POST/PATCH | `/api/workers` `/api/workers/:id`                  | Admin                         | Manage crew accounts and availability                                           |
| GET        | `/api/hotspots?days=7`                             | Authenticated                 | Geographic report clusters                                                      |
| POST       | `/api/routes/optimize`                             | Admin/worker                  | Order up to 25 report stops and save route                                      |
| GET        | `/api/analytics/overview`                          | Authenticated                 | Dashboard aggregates and chart series                                           |
| GET/PATCH  | `/api/notifications` `/api/notifications/:id/read` | Authenticated                 | List and mark notifications read                                                |
| POST       | `/api/ai/classify`                                 | Authenticated                 | Classify multipart image                                                        |
| GET        | `/api/ai/status`                                   | Admin                         | External model health / fallback status                                         |
| POST       | `/api/ai/retrain`                                  | Admin                         | Queue external retraining integration                                           |
| GET/POST   | `/api/datasets`                                    | Admin                         | Dataset registry, optional file upload                                          |
| GET/PATCH  | `/api/users` `/api/users/:id`                      | Admin                         | User management; prevents disabling final admin                                 |
| GET        | `/api/health`                                      | Public                        | API liveness                                                                    |

### External AI contract

The model service should accept `POST ${AI_SERVICE_URL}/predict` with an image and return `{"class":"plastic","confidence":0.94}`. GeoSmart maps model labels to its waste categories and derives severity server-side. An unavailable AI endpoint does not block complaint submission.

### Socket.IO events

Authenticated clients join their private user room. The server emits `complaintCreated`, `complaintAssigned`, `complaintStatusUpdated`, `complaintResolved`, `newCriticalComplaint`, and `notificationCreated`. The client refreshes affected React Query data when events arrive.

## Data and security notes

Mongoose models include `User`, `Worker`, `Complaint`, `ComplaintHistory`, `Notification`, `Dataset`, and `Route`. Complaints have a `2dsphere` location index. Passwords are bcrypt-hashed and excluded from normal queries. Role checks run on protected API routes; uploaded complaint photos are restricted to JPG/PNG/WEBP and 10 MB. Configure HTTPS, a production object-storage adapter, token rotation/refresh, and a managed MongoDB deployment before production rollout.

## Troubleshooting

- **MongoDB connection fails:** verify `MONGO_URI`, local MongoDB service state, Atlas network access, and database credentials.
- **API unavailable in browser:** ensure both Vite and Express run and `VITE_API_URL` points at the Express `/api` base.
- **Map image/photo does not load after deployment:** configure `PUBLIC_API_URL`/API host routing and serve `/uploads` from the API or replace local storage with object storage.
- **AI unavailable:** reports still submit through the mock classifier; check the model service `/health` and `/predict` contract.
- **Demo accounts missing:** run `npm run seed` after configuring MongoDB.
