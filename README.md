# GeoSmart

GeoSmart is a civic waste reporting and municipal operations platform. Citizens submit geotagged photos; municipal staff classify and prioritize reports, assign crews, plan collection routes, and track resolution.

## Architecture

- **Web:** React 19, TanStack Router/Start, TypeScript, Tailwind, React Query, Axios, Leaflet/OpenStreetMap, Recharts.
- **API:** Express, Node.js, Mongoose/MongoDB, JWT, bcrypt, Multer, Socket.IO.
- **AI:** The separate TensorFlow/Keras model is served by `GEOSMART-AI-MODEL/api.py`; Express calls it through `AI_SERVICE_URL`. The browser only calls Express. If the model is unavailable, users can choose a category manually and still submit a report.
- **Storage:** Local `server/uploads` during development. `storageService.js` is the replacement point for object storage.

```text
React client ── REST / Socket.IO ── Express API ── MongoDB
                                      ├── external AI model API
                                      └── local uploads (development)
```

The application’s data and authentication APIs use MongoDB.

## Run locally

Requirements: Node.js 20+, npm, and MongoDB Community or MongoDB Atlas.

1. Add the settings from `.env.example` to `.env` and set `MONGO_URI` to a running MongoDB instance and `JWT_SECRET` to a unique random secret (at least 24 characters). Preserve any existing provider keys in `.env`.
2. Install dependencies: `npm install`.
3. In a separate terminal, start the AI API using the commands below.
4. Create the demo accounts and reports: `npm run seed`.
5. Start Express and Vite together: `npm run dev`.
6. Open `http://localhost:8080/auth`. API health checks: `http://localhost:5000/api/health` and `http://127.0.0.1:8000/health`.

You can also run `npm run server` and `npm run client` in separate terminals from the application folder. The client is served on port `8080`; Express listens on port `5000`; the Python model API listens on port `8000`. `npm run build` creates the web production build. The Express service runs with `npm start`. If MongoDB is unavailable, Express still starts and returns a JSON `503` error for database-backed requests; registration and complaint persistence require a live database.

### Start the separate AI model

The model project requires Python 3.10–3.12 and the dependencies in its `requirements.txt`. From the application folder, open a terminal and run:

```powershell
cd ..\GEOSMART-AI-MODEL
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
$env:AI_PORT = "8000"
python api.py
```

The existing `saved_model/geosmart_model.keras` is loaded as-is. The model API accepts `POST /predict` with multipart field `image`, returns its model class and 0–1 confidence, and exposes `GET /health`. It binds only to `127.0.0.1`; it has no browser CORS interface.

### Environment

| Variable                  | Description                                                          |
| ------------------------- | -------------------------------------------------------------------- |
| `PORT`                    | Express port (default `5000`)                                        |
| `MONGO_URI`               | MongoDB connection URI                                               |
| `JWT_SECRET`              | Secret used to sign seven-day bearer tokens                          |
| `CLIENT_URL`              | Allowed client origin(s), comma separated                            |
| `VITE_API_URL`            | Browser API base URL (default `http://localhost:5000/api`)           |
| `VITE_SOCKET_URL`         | Socket.IO origin (default `http://localhost:5000`)                   |
| `PUBLIC_API_URL`          | Public API origin serving uploaded `/uploads` files                  |
| `AI_SERVICE_URL`          | Private model API base URL (default example `http://127.0.0.1:8000`) |
| `AI_SERVICE_TIMEOUT`      | Model request timeout in milliseconds (default `30000`)              |
| `DUPLICATE_RADIUS_METERS` | Nearby unresolved report search radius (default `100`)               |

## Demo accounts

| Role    | Email                     | Password             |
| ------- | ------------------------- | -------------------- |
| Admin   | `admin@geosmart.local`    | `GeoSmartAdmin2026!` |
| Worker  | `worker1@geosmart.local`  | `GeoSmartDemo2026!`  |
| Citizen | `citizen1@geosmart.local` | `GeoSmartDemo2026!`  |
| Admin   | `admin@geosmart.com`      | `GeoSmartAdmin2026!` |
| Worker  | `worker@geosmart.com`     | `GeoSmartDemo2026!`  |
| Citizen | `citizen@geosmart.com`    | `GeoSmartDemo2026!`  |

Public registration creates active citizen accounts and pending worker accounts. A municipal administrator must approve a worker before sign-in. Public administrator registration is rejected; admins can create users through the protected user-management page or `POST /api/admin/users`. Existing `.local` seed accounts are preserved when seeding the added `.com` demo accounts.

## API

Except health, routes require `Authorization: Bearer <token>`. JSON responses use `{ "success": true, "data": ... }`; errors use `{ "success": false, "message": "..." }`.

| Method         | Endpoint                                           | Access                        | Purpose                                                                         |
| -------------- | -------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------- |
| POST           | `/api/auth/register`                               | Public                        | Create citizen account or request worker approval; admin registration is denied |
| POST           | `/api/auth/login`                                  | Public                        | Sign in with email, password and matching selected role                         |
| GET/PATCH      | `/api/auth/me`                                     | Authenticated                 | Read/update profile                                                             |
| POST           | `/api/auth/logout`                                 | Authenticated                 | Client token logout acknowledgement                                             |
| GET/POST       | `/api/complaints`                                  | Authenticated / citizen       | List visible reports / submit multipart report (`image`, optional `extraImage`) |
| GET            | `/api/complaints/nearby?latitude=&longitude=`      | Citizen/admin                 | Nearby unresolved reports                                                       |
| GET            | `/api/complaints/:id`                              | Owner, admin, assigned worker | Complaint detail                                                                |
| GET            | `/api/complaints/:id/history`                      | Owner, admin, assigned worker | Status timeline                                                                 |
| PATCH          | `/api/complaints/:id/status`                       | Admin/assigned worker         | Validated status transition and history entry                                   |
| PATCH          | `/api/complaints/:id/assign`                       | Admin                         | Assign worker and notify them                                                   |
| POST           | `/api/complaints/:id/resolution`                   | Assigned worker               | Attach resolution image/comment and resolve                                     |
| GET            | `/api/workers`                                     | Authenticated                 | Admin worker list or worker’s own profile                                       |
| POST/PATCH     | `/api/workers` `/api/workers/:id`                  | Admin                         | Manage crew accounts and availability                                           |
| GET            | `/api/hotspots?days=7`                             | Authenticated                 | Geographic report clusters                                                      |
| POST           | `/api/routes/optimize`                             | Admin/worker                  | Order up to 25 report stops and save route                                      |
| GET            | `/api/analytics/overview`                          | Authenticated                 | Dashboard aggregates and chart series                                           |
| GET/PATCH      | `/api/notifications` `/api/notifications/:id/read` | Authenticated                 | List and mark notifications read                                                |
| POST           | `/api/ai/classify`                                 | Authenticated                 | Classify multipart image using the separate trained model                       |
| GET            | `/api/ai/health` `/api/ai/status`                  | Authenticated / admin         | Check private model API reachability                                            |
| POST           | `/api/ai/retrain`                                  | Admin                         | Queue external retraining integration                                           |
| GET/POST       | `/api/datasets`                                    | Admin                         | Dataset registry, optional file upload                                          |
| GET/POST/PATCH | `/api/admin/users` `/api/admin/users/:id`          | Admin                         | Filter/manage users, approve workers and create accounts; protects final admin  |
| GET            | `/api/health`                                      | Public                        | API liveness                                                                    |

### External AI contract

The model project contains a TensorFlow/Keras CNN with six classes: `cardboard`, `glass`, `metal`, `paper`, `plastic`, and `trash`. Its existing `predict.py` prepares a 224×224 image and returns JSON such as `{"class":"plastic","confidence":0.95}`. The lightweight `api.py` wrapper exposes that predictor over HTTP without changing its architecture or weights. Express maps those six real labels to GeoSmart categories and converts either 0–1 or 0–100 confidence to a percentage. Complaint submission continues with the citizen-selected category if the model service is unavailable; the standalone classify endpoint returns a clear 503.

### Socket.IO events

Authenticated clients join their private user room. The server emits `complaintCreated`, `complaintAssigned`, `complaintStatusUpdated`, `complaintResolved`, `newCriticalComplaint`, and `notificationCreated`. The client refreshes affected React Query data when events arrive.

## Data and security notes

Mongoose models include `User`, `Worker`, `Complaint`, `ComplaintHistory`, `Notification`, `Dataset`, and `Route`. Complaints have a `2dsphere` location index. Passwords are bcrypt-hashed and excluded from normal queries. Role checks run on protected API routes; uploaded complaint photos are restricted to JPG/PNG/WEBP and 10 MB. Configure HTTPS, a production object-storage adapter, token rotation/refresh, and a managed MongoDB deployment before production rollout.

## Troubleshooting

- **MongoDB connection fails:** verify `MONGO_URI`, local MongoDB service state, Atlas network access, and database credentials.
- **API unavailable in browser:** ensure both Vite and Express run and `VITE_API_URL` points at the Express `/api` base.
- **Map image/photo does not load after deployment:** configure `PUBLIC_API_URL`/API host routing and serve `/uploads` from the API or replace local storage with object storage.
- **AI unavailable:** check that the Python API is running at `AI_SERVICE_URL`, that its `/health` endpoint returns `{"status":"ok"}`, and that the trained `.keras` file and Python dependencies are present. Reports can still be submitted with a manually selected category.
- **Demo accounts missing:** run `npm run seed` after configuring MongoDB.
