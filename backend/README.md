# INFRA LINK — Infrastructure Execution Intelligence Backend

**SIH 2026 | Problem Statement PS26122**
**Organization: Oil India Limited | Theme: Smart Automation**

> INFRA LINK bridges the gap between planned project schedules and actual field execution.
> It converts heterogeneous site reports into structured progress events, links them to planned activities,
> detects delays, and propagates downstream dependency risks.

---

## Core Pipeline

```
FIELD EXECUTION (PDF / TXT / Text API)
        ↓
  DATA EXTRACTION (LLM + Deterministic Fallback)
        ↓
    STRUCTURED EVENT
        ↓
  ACTIVITY MATCHING (4-level: Exact → Normalized → Keyword → Fuzzy)
        ↓
   SCHEDULE LINKING
        ↓
  PLANNED vs ACTUAL
        ↓
  DELAY DETECTION
        ↓
 DEPENDENCY ANALYSIS (BFS graph traversal)
        ↓
  DOWNSTREAM RISK
        ↓
   DASHBOARD API
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js v18+ |
| Framework | Express.js + TypeScript |
| Database | MongoDB (Atlas or local) |
| ORM | Mongoose |
| File Upload | Multer |
| XLSX Parsing | xlsx |
| PDF Parsing | pdf-parse |
| LLM Extraction | Google Gemini API (gemini-2.5-flash, configurable) |
| LLM Fallback | Deterministic regex parser |

---

## Prerequisites

- Node.js >= 18
- npm >= 9
- MongoDB Atlas URI **or** local MongoDB instance

---

## Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/pratyaksh
LLM_PROVIDER=gemini
LLM_MODEL=gemini-2.5-flash
LLM_API_KEY=your_google_api_key_here
```

> **Note:** If `LLM_API_KEY` is not set, the system will use the deterministic regex-based fallback parser. The demo scenario still works without an LLM key.

### 3. Seed the demo project

```bash
npm run seed
```

This creates:
- **Project:** Oil India Demo Infrastructure Project
- **Activities:** A001 Foundation → A002 Pillars → A003 Beams → A004 Road Surface, A001 → A005 Drainage
- **Dependencies:** A001→A002, A002→A003, A003→A004, A001→A005

Copy the printed `Project ID` for use in API calls.

### 4. Start the server

```bash
npm run dev      # development (ts-node-dev, hot reload)
npm run build && npm start   # production build
```

---

## API Reference

### Health

```
GET /api/health
```

```json
{
  "success": true,
  "data": { "status": "ok", "service": "pratyaksh-backend" }
}
```

---

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects` | Create project |
| GET | `/api/projects` | List all projects |
| GET | `/api/projects/:projectId` | Get project + activity count |

**Create project body:**
```json
{
  "name": "My Infrastructure Project",
  "organization": "Oil India Limited",
  "description": "Optional description",
  "plannedStartDate": "2026-06-01",
  "plannedEndDate": "2026-06-30"
}
```

---

### Schedule Import

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects/:projectId/schedule/upload` | Upload XLSX schedule |

Multipart form upload, field name: `file`

**Expected XLSX columns** (flexible header matching):
```
Activity Code | Activity Name | Planned Start | Planned End | Planned Progress | Dependency
```

---

### Activities

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:projectId/activities` | List activities with variance |
| GET | `/api/projects/:projectId/activities/:activityId` | Full activity detail |

Activity detail includes: planned/actual progress, variance, activityStatus, dependencyRisk, dependencies, execution updates, risks.

---

### Site Reports *(M2 — coming next)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects/:projectId/reports/upload` | Upload PDF / TXT |
| POST | `/api/projects/:projectId/reports/text` | Direct text input |
| GET | `/api/projects/:projectId/reports` | List reports |

---

### Dashboard *(M5 — coming)*

```
GET /api/projects/:projectId/dashboard
```

---

### Risks *(M4 — coming)*

```
GET /api/projects/:projectId/risks
GET /api/projects/:projectId/activities/:activityId/impact
```

---

## Response Format

All responses follow a consistent envelope:

**Success:**
```json
{ "success": true, "data": { ... } }
```

**Error:**
```json
{ "success": false, "message": "Description", "code": "ERROR_CODE" }
```

---

## Demo Scenario (PS26122 Core Test)

### Step 1: Seed demo data
```bash
npm run seed
# Note the Project ID printed
```

### Step 2: Upload schedule (optional — seed already creates it via code)
Upload `demo/schedule.xlsx` via:
```
POST /api/projects/<id>/schedule/upload
```

### Step 3: Submit site report
```
POST /api/projects/<id>/reports/text
{
  "text": "Foundation work is around 70% complete as of 10 June. Heavy rainfall affected today's work."
}
```

### Step 4: Observe
- Foundation: Planned 100% → Actual 70% → Variance -30% → Status: DELAYED
- Pillars: dependencyRisk → AT_RISK
- Beams: dependencyRisk → POTENTIAL_RISK
- Road Surface: dependencyRisk → POTENTIAL_RISK

---

## Architectural Notes

### AI Responsibility Boundary

```
LLM EXTRACTS FACTS:
  activity name, progress %, date, reason

BACKEND DECIDES EVERYTHING ELSE:
  variance, delay status, dependency risk, downstream impact
```

### Activity Status vs Dependency Risk

Two separate fields are maintained:
- `activityStatus` — intrinsic execution state (`NOT_STARTED | ON_TRACK | DELAYED | COMPLETED`)
- `dependencyRisk` — upstream propagated risk (`NONE | AT_RISK | POTENTIAL_RISK`)

This ensures a downstream activity's own execution record is never corrupted by upstream delays.

### Planned Progress (V1 Note)

In V1, `plannedProgress` is the value from the imported schedule (typically 100% for a target activity).
Future versions will support time-phased baseline calculation to derive planned progress at any evaluation date.

### Risk Recalculation

Risk records are recomputable. Calling `recalculateProjectRisks(projectId)` clears and regenerates all downstream risk state, ensuring consistency when upstream activity statuses change.

---

## Milestones

- [x] **M1** — Foundation + Database + Schedule Import
- [x] **M2: Site Execution Report Intelligence** - LLM-powered ingestion of daily site reports, extracting structured activity updates.
- [x] **M3: Schedule-Linking & Variance Engine** - Matching unstructured reports to planned schedule codes and calculating Planned vs Actual variance.
- [x] **M4: Dependency-Aware Downstream Impact + Explainable Risk Engine** - Deterministic BFS risk propagation with idempotent state reconciliation.
- [ ] **M5** — Dashboard + Deployment

---

## Project Structure

```
backend/
├── src/
│   ├── config/         env.ts, db.ts
│   ├── models/         Project, Activity, Dependency, ExecutionUpdate, Risk
│   ├── controllers/    project, schedule, activity, report, dashboard, risk
│   ├── routes/         project, schedule, activity, report, dashboard, risk
│   ├── services/       schedule, extraction, matching, progress, risk, dashboard
│   ├── parsers/        xlsx, pdf, text
│   ├── utils/          response, date.utils, confidence
│   ├── middleware/     upload, error
│   ├── types/          index.ts
│   ├── app.ts
│   └── server.ts
├── scripts/            seed.ts
├── uploads/
├── .env.example
├── package.json
└── tsconfig.json
```
