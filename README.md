# GeoSmart City

Build a complete production-style full-stack web application called GeoSmart – Smart Waste Management Platform using the MERN stack.

1. Project Overview

GeoSmart is an AI-powered municipal waste management platform.

Citizens can report waste problems by uploading an image and capturing their GPS location. The system sends the image to an external AI classification service, receives the waste classification and confidence score, stores the complaint in MongoDB, and displays it to municipal administrators.

Municipal authorities can view complaints on a map, identify waste hotspots, prioritize complaints based on severity, assign complaints to municipal workers, optimize collection routes, track complaint status, and view analytics.

The AI image classification model will be trained separately by another team member. Do NOT build or train the CNN model inside this project. Instead, create a clean API integration layer so that the trained AI model can be connected later.

2. Mandatory Technology Stack

Frontend

Use:

React.js

Vite

JavaScript or TypeScript

React Router

Axios

Tailwind CSS

Responsive design

Leaflet + OpenStreetMap for maps

Recharts or another suitable chart library

Socket.IO client for real-time updates

Backend

Use:

Node.js

Express.js

MongoDB

Mongoose

JWT authentication

bcrypt/password hashing

Multer for image upload

Socket.IO for real-time updates

Axios for communicating with the external AI service

dotenv

CORS

Express middleware for authentication and authorization

Do NOT use Firebase or Supabase as the primary backend/database because this project must demonstrate a proper MERN architecture.

3. Architecture

Create a clear architecture:

React Frontend
|
| REST API / Socket.IO
↓
Node.js + Express Backend
|
├── MongoDB
|
├── AI Classification API
|
├── Map/GIS Services
|
└── Route Optimization Service

The AI model should be treated as an external service.

For example:

POST /api/ai/classify

Request:

image

Expected response:

{
"class": "plastic",
"confidence": 0.94,
"severity": "high"
}

Create a configurable environment variable:

AI_SERVICE_URL=http://localhost:8000

Do not hardcode the AI URL.

If the AI service is unavailable during development, provide a mock/demo classification mode so the rest of the application can still be tested.

4. User Roles

Implement authentication with three roles:

Citizen

Can:

Register

Login

Submit waste complaint

Upload waste image

Capture GPS location

View AI classification

View complaint status

View complaint history

View complaint details

Receive status updates

Municipal Admin

Can:

Login

View dashboard

View all complaints

View complaints on map

Filter complaints

Prioritize complaints

Assign complaints to workers

Change complaint status

View waste hotspots

View analytics

Upload datasets

Trigger AI model retraining API

View workers

Manage users

Municipal Worker

Can:

Login

View assigned complaints

View assigned route

View complaint location on map

Update status

Mark waste as collected/resolved

Upload resolution image

View navigation route

5. Authentication

Create complete authentication.

Pages:

Login

Register

Forgot Password UI

Unauthorized page

Profile

Backend:

POST /api/auth/register
POST /api/auth/login
GET /api/auth/me

Use JWT.

Store authentication securely and protect private routes.

Implement role-based authorization middleware.

Example:

requireAuth
requireRole("admin")
requireRole("worker")

Do not expose passwords in API responses.

6. Citizen Complaint Workflow

Create a modern complaint submission page.

Fields:

Waste image upload

Complaint title

Description

Waste category

GPS latitude

GPS longitude

Address/location

Optional additional image

Allow the user to click:

"Use My Current Location"

Use browser geolocation API.

Show the selected location on a Leaflet map.

After submission:

Image is uploaded.

Complaint is created.

Backend sends image to AI classification service.

AI returns classification and confidence.

Backend calculates severity.

Complaint is saved.

Admin dashboard receives real-time notification.

Complaint status workflow:

PENDING
→ ASSIGNED
→ IN_PROGRESS
→ RESOLVED

Also support:

REJECTED

Display the status using a visual timeline.

7. Waste Categories

Support categories such as:

Plastic Waste

Organic Waste

E-Waste

Construction Waste

Glass Waste

Paper Waste

Metal Waste

Mixed Waste

Illegal Dumping

Other

The AI classification result should automatically populate the category when possible.

Allow admin to correct the AI classification.

8. AI Classification Integration

Create a dedicated backend service:

aiService.js

It should communicate with the external model API.

Example:

POST /api/ai/classify

The backend should send the uploaded image to:

${AI_SERVICE_URL}/predict

Expected AI response:

{
"class": "plastic",
"confidence": 0.94
}

Normalize the response into:

{
"category": "Plastic Waste",
"confidence": 94,
"severity": "HIGH"
}

Display:

AI Classification:
Plastic Waste

Confidence:
94%

Severity:
HIGH

Make the AI integration modular so the model endpoint can be replaced later without changing the frontend.

9. Severity Scoring

Create a severity score from:

AI classification

AI confidence

waste category

complaint age

duplicate reports

location hotspot density

Example:

Severity Levels:

LOW
MEDIUM
HIGH
CRITICAL

Show severity using badges and visual indicators.

Do not rely only on frontend calculations. Important severity calculations should be performed by the backend.

10. Duplicate Complaint Detection

Implement basic duplicate detection.

When a new complaint is submitted, check for nearby complaints within a configurable geographical radius.

For example:

DUPLICATE_RADIUS_METERS=100

If a nearby unresolved complaint already exists, show:

"Similar complaint found nearby."

Allow the citizen to continue or view the existing complaint.

Store duplicate relationship information.

11. Admin Dashboard

Create a professional municipal dashboard.

Dashboard cards:

Total Complaints

Pending

Assigned

In Progress

Resolved

Critical Complaints

Active Workers

Today's Complaints

Charts:

Complaints by day

Complaints by waste category

Complaints by severity

Resolved vs pending

Monthly complaint trends

Include:

Recent complaints

Critical complaints

Worker workload

Top waste hotspots

Use responsive cards and charts.

12. GIS Waste Hotspot Map

Create an interactive full-screen map.

Use:

Leaflet

OpenStreetMap

Display complaint markers.

Marker information should include:

Complaint ID

Waste category

Severity

Status

Location

Created time

Use marker clustering if necessary.

Create hotspot visualization based on complaint density.

Show:

Low density

Medium density

High density

Critical hotspot

The backend should expose:

GET /api/hotspots

Return data such as:

{
"latitude": 17.3850,
"longitude": 78.4867,
"complaintCount": 25,
"severityScore": 87
}

Create a heatmap/hotspot visualization on the frontend.

13. Complaint Management

Admin complaint page should support:

Search:

Complaint ID

Category

Citizen

Location

Filters:

Status

Severity

Waste category

Date

Assigned worker

Sorting:

Newest

Oldest

Highest severity

Nearest hotspot

Complaint detail page should show:

Complaint ID

Citizen

Uploaded image

AI classification

Confidence

Severity

Description

GPS coordinates

Map

Created date

Assigned worker

Status timeline

Resolution image

Admin notes

14. Worker Management

Admin should be able to:

View workers

Add workers

Assign complaints

View workload

View worker location if available

View completed complaints

Worker dashboard:

Assigned complaints

Today's tasks

Pending tasks

Completed tasks

Route map

15. Route Optimization

Create a route optimization module.

Use A* algorithm logic on the backend for route planning.

Create API:

POST /api/routes/optimize

Request:

{
"workerId": "...",
"startLocation": {
"latitude": 17.3850,
"longitude": 78.4867
},
"complaintIds": ["...", "..."]
}

Response should contain:

Ordered complaints

Route coordinates

Estimated distance

Estimated duration

Display the optimized route on a Leaflet map.

The UI should show:

Start
↓
Complaint 1
↓
Complaint 2
↓
Complaint 3
↓
Complaint 4
↓
End

Keep the routing algorithm modular so it can later be replaced with a more advanced routing API.

16. Complaint Lifecycle

Implement complete lifecycle management.

PENDING
↓
ASSIGNED
↓
IN_PROGRESS
↓
RESOLVED

Every status change should create a history record.

Example:

{
"status": "IN_PROGRESS",
"changedBy": "...",
"timestamp": "...",
"comment": "Worker reached location"
}

Display this as a timeline.

17. Resolution Workflow

Worker can open an assigned complaint.

Display:

Complaint image

Location

Category

Severity

Description

Map

Worker can:

Start task

Upload resolution image

Add resolution comment

Mark as resolved

When resolved:

Status becomes:

RESOLVED

Notify the citizen in real time.

18. Real-Time Updates

Use Socket.IO.

Real-time events:

complaintCreated
complaintAssigned
complaintStatusUpdated
complaintResolved
newCriticalComplaint

Example:

When a citizen submits a complaint:

Admin dashboard automatically updates without refreshing.

When admin assigns a complaint:

Worker dashboard automatically receives the assignment.

When worker resolves a complaint:

Citizen dashboard automatically receives the update.

19. Dataset Management

Create an Admin "AI Dataset" page.

Features:

Upload dataset

View dataset information

Upload CSV metadata

Upload image dataset ZIP if supported

Dataset statistics

Number of classes

Number of images

Last training date

Create API placeholders:

POST /api/ai/dataset/upload
POST /api/ai/retrain
GET /api/ai/training-status

The actual model training will be handled by the separate AI service.

The frontend should show:

Training Status:

Not Started

Queued

Training

Completed

Failed

Do not implement actual CNN training in Node.js.

20. Analytics

Create an Analytics page.

Include:

Complaint Analytics

Daily complaints

Weekly complaints

Monthly complaints

Resolved percentage

Average resolution time

Waste Analytics

Most common waste category

Category distribution

Severity distribution

GIS Analytics

Top hotspots

Highest complaint areas

Complaint density

Worker Analytics

Complaints assigned

Complaints resolved

Average resolution time

Worker workload

Use interactive charts.

21. REST API Structure

Create a clean Express backend structure:

server/
controllers/
routes/
models/
middleware/
services/
utils/
config/
sockets/
uploads/
app.js
server.js

API routes:

/api/auth
/api/users
/api/complaints
/api/ai
/api/hotspots
/api/routes
/api/workers
/api/analytics
/api/datasets
/api/notifications

Example complaint APIs:

POST /api/complaints
GET /api/complaints
GET /api/complaints/:id
PUT /api/complaints/:id
DELETE /api/complaints/:id
PATCH /api/complaints/:id/status
PATCH /api/complaints/:id/assign
POST /api/complaints/:id/resolution

22. MongoDB Models

Create Mongoose models.

User

Fields:

name

email

password

role

phone

address

createdAt

Complaint

Fields:

complaintId

citizen

title

description

imageUrl

category

aiCategory

aiConfidence

severity

latitude

longitude

address

status

assignedWorker

duplicateOf

createdAt

updatedAt

resolvedAt

ComplaintHistory

Fields:

complaint

status

changedBy

comment

timestamp

Worker

Fields:

user

employeeId

department

availability

currentLocation

Hotspot

Fields:

latitude

longitude

complaintCount

severityScore

radius

Notification

Fields:

user

title

message

type

read

createdAt

Use MongoDB geospatial indexes where appropriate.

23. Frontend Pages

Create these pages:

PUBLIC:

/login
/register
/about

CITIZEN:

/citizen/dashboard
/citizen/report
/citizen/complaints
/citizen/complaints/:id
/citizen/profile

ADMIN:

/admin/dashboard
/admin/complaints
/admin/complaints/:id
/admin/map
/admin/hotspots
/admin/workers
/admin/routes
/admin/analytics
/admin/dataset
/admin/users
/admin/settings

WORKER:

/worker/dashboard
/worker/tasks
/worker/tasks/:id
/worker/routes
/worker/profile

24. UI/UX Design

Create a modern professional civic-tech dashboard.

Design theme:

Clean

Modern

Environmental

Professional

Municipal/government dashboard style

Use a green/environment-inspired visual identity, but maintain excellent accessibility and contrast.

Desktop:

Sidebar navigation

Top navbar

Notification icon

User profile menu

Mobile:

Responsive sidebar

Bottom navigation where appropriate

Responsive maps

Mobile-friendly complaint form

Use cards, badges, tables, charts, modals and timeline components.

Avoid excessive animations.

Use loading skeletons and proper empty states.

25. Citizen Landing Page

Create an attractive landing page.

Hero:

"Report Waste. Clean Your City."

Subtitle:

"GeoSmart uses AI and location intelligence to help municipalities detect, prioritize, and resolve waste problems faster."

Buttons:

"Report Waste"
"Explore GeoSmart"

Sections:

How It Works

AI-Powered Detection

Smart GIS Hotspots

Faster Complaint Resolution

Route Optimization

Real-Time Monitoring

26. API Error Handling

Implement centralized Express error handling.

Return consistent responses:

Success:

{
"success": true,
"data": {}
}

Error:

{
"success": false,
"message": "Error message"
}

Handle:

400

401

403

404

409

500

Frontend should display proper toast notifications.

27. Security

Implement:

JWT authentication

Password hashing with bcrypt

Role-based authorization

CORS configuration

Input validation

File type validation

Image size limits

Environment variables

Do not expose secrets

Do not commit .env files

Create:

.env.example

Example:

MONGO_URI=
JWT_SECRET=
PORT=5000
CLIENT_URL=http://localhost:5173
AI_SERVICE_URL=http://localhost:8000

28. Image Upload

Use Multer.

Accept:

JPG

JPEG

PNG

WEBP

Limit image size.

Create a service abstraction for image storage so it can later be connected to Cloudinary, AWS S3, or another storage provider.

For development, local uploads are acceptable.

29. Seed Data

Create realistic demo data so the dashboard does not appear empty.

Include:

Citizens

Admin

Workers

Complaints

Different waste categories

Different statuses

Different severity levels

Different locations

Hotspots

Create a seed script.

Example demo accounts should be clearly documented in README.

30. API Documentation

Create a complete README explaining:

Project architecture

Technologies

Installation

Environment variables

MongoDB setup

Frontend setup

Backend setup

AI API integration

API endpoints

Authentication

Running the application

Demo credentials

Deployment

Also create an API documentation section with request and response examples.

If possible, generate Swagger/OpenAPI documentation for the Express APIs.

31. Important AI Integration Requirement

The AI model is NOT part of the MERN application.

Treat it as an external service.

The expected architecture is:

React
↓
Express API
↓
AI Service API
↓
Trained CNN Model

The AI service should return:

{
"class": "plastic",
"confidence": 0.94
}

The Express backend should convert that into the application's internal format.

Make the AI service URL configurable through:

AI_SERVICE_URL

Create a mock AI service/fallback for development so the project works even when the trained model API is offline.

32. Future Extensibility

Design the code so these features can be added later:

IoT smart bin integration

Smart bin sensor monitoring

Multi-stop Vehicle Routing Problem

Traffic-aware route optimization

ETA prediction

Real-time GPS worker tracking

Advanced AI classification

Object detection

Waste quantity estimation

Predictive hotspot forecasting

Do not implement these future features unless required. Create modular architecture that allows them to be added later.

33. Development Requirements

Generate actual working code rather than only static UI mockups.

The frontend must communicate with the Express backend using Axios.

Do not hardcode complaint data in React components.

Use API services such as:

api/authApi.js
api/complaintApi.js
api/adminApi.js
api/workerApi.js
api/aiApi.js
api/routeApi.js
api/analyticsApi.js

Use reusable components:

Navbar
Sidebar
DashboardCard
ComplaintCard
ComplaintTable
ComplaintTimeline
MapView
HotspotMap
SeverityBadge
StatusBadge
ImageUploader
LocationPicker
RouteMap
NotificationPanel
LoadingSpinner
EmptyState
Modal
Toast

Use proper React state management. Context API is acceptable for authentication/global user state.

34. Final Expected Result

The final application should feel like a real municipal smart-city product, not a simple college CRUD project.

A complete flow should work:

Citizen registers
↓
Citizen logs in
↓
Citizen reports waste
↓
Image + GPS sent to backend
↓
Backend sends image to AI classification API
↓
AI returns category + confidence
↓
Backend stores complaint in MongoDB
↓
Admin receives real-time notification
↓
Admin views complaint on dashboard/map
↓
System calculates severity
↓
Admin assigns worker
↓
Worker receives task
↓
Worker views optimized route
↓
Worker reaches location
↓
Worker uploads resolution image
↓
Worker marks complaint as resolved
↓
Citizen receives real-time update
↓
Analytics update automatically

Build the application with clean reusable code, proper folder structure, responsive UI, working REST APIs, MongoDB integration, authentication, role-based access, map functionality, Socket.IO real-time updates, and a clearly separated AI API integration layer.

Prioritize functionality and clean architecture over decorative UI.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://vision-waste-resolve.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/635a5561-f6d1-4bc1-8d3c-5b7ca53bcf2a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
