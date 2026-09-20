# INFRA LINK

> **Connect Plans. Track Progress. Predict Impact.**

**Smart India Hackathon 2026**  
**Problem Statement PS26122** — Intelligent Data Capture & Schedule-Linking Layer for Infrastructure Project Management: Real-Time Actual Progress Tracking (Planning-to-Execution Bridge)

---

## 1. Executive Summary

Major infrastructure projects routinely experience significant cost and time overruns due to a fundamental disconnect between **planned schedules** (Primavera P6, MS Project, Excel WBS) and **fragmented field reality** (daily site progress reports, contractor submissions, PDF field memos, and supervisory inspections). 

**INFRA LINK** bridges this divide. It serves as an intelligent data capture and topological schedule-linking layer that:
1. Ingests heterogeneous field evidence (PDFs, spreadsheets, text memos, structured field updates).
2. Automatically maps field updates to planned WBS activities using a 4-tier matching engine.
3. Quantifies progress variance against baseline milestones.
4. Identifies evidence discrepancies via tolerance-based reconciliation.
5. Propagates delay risks downstream across schedule dependencies using graph traversal.
6. Generates mathematically deterministic milestone forecasts without probabilistic hallucination.

---

## 2. System Architecture

```
[Field Data: PDF / XLSX / TXT / Manual Forms]
                     │
                     ▼
       ┌─────────────────────────────┐
       │   M2: EVIDENCE EXTRACTION   │ (Process-Isolated Parser + LLM / Regex Fallback)
       └─────────────┬───────────────┘
                     ▼
       ┌─────────────────────────────┐
       │   M3: ACTIVITY MATCHING     │ (Exact Code → Exact Name → Jaccard → Levenshtein)
       └──────┬───────────────┬──────┘
              │               │
       [Auto-Matched]    [Review Queue] (Manual Match / Discard)
              │               │
              ▼               ▼
       ┌─────────────────────────────┐
       │  M6: EXECUTION EVENT CAPTURE│
       └─────────────┬───────────────┘
                     ▼
       ┌─────────────────────────────┐
       │ M7: RECONCILIATION ENGINE   │ (≤5 pp: Aligned | >5 pp: Conflict Resolution)
       └─────────────┬───────────────┘
                     ▼
       ┌─────────────────────────────┐
       │ M4: DEPENDENCY RISK ENGINE  │ (Topological BFS Graph Traversal & Cycle Protection)
       └─────────────┬───────────────┘
                     ▼
       ┌─────────────────────────────┐
       │ M8: DETERMINISTIC FORECAST  │ (Velocity Formulation & Dependency Constraint Dates)
       └─────────────┬───────────────┘
                     ▼
       ┌─────────────────────────────┐
       │ M5: EXECUTIVE COMMAND CENTER│ (Decision First, Evidence Second, Zero Clutter)
       └─────────────────────────────┘
```

---

## 3. Technology Stack

### Frontend
- **Framework**: React 18 / 19 with Vite 8
- **Language**: TypeScript 5.6
- **Styling**: Tailwind CSS 3.4 & Vanilla CSS (Pristine White Enterprise Design System)
- **Icons**: Lucide React
- **Architecture**: Single Page Application (SPA) with tabbed workspaces and slide-out inspectors

### Backend
- **Runtime**: Node.js v20+ LTS
- **Framework**: Express.js 4.21 with TypeScript 5.8
- **Database**: MongoDB Atlas v7.0 with Mongoose 8.9 ODM
- **File Parsing**: `xlsx` (Worksheets), `pdf-parse` (Child-process isolated execution), `multer` (Upload streaming)
- **Extraction**: Google Gemini API (`@google/genai`) with zero-latency deterministic regex fallback

---

## 4. M1–M8 Capability Pipeline

| Module | Name | Functionality & Engineering Guarantees |
|---|---|---|
| **M1** | **Baseline Schedule Ingestion** | Ingests WBS schedule workbooks (`.xlsx`), parses activities, milestones, planned dates, and Finish-to-Start dependency linkages without edge reversal. |
| **M2** | **Multi-Modal Field Extraction** | Extracts activity codes, progress percentages, dates, and execution remarks from PDFs, TXT reports, and spreadsheets using isolated parsers. |
| **M3** | **Activity Matching Engine** | 4-tier matching hierarchy (Exact Code $\to$ Exact Name $\to$ Token Similarity $\to$ Levenshtein). Unknown activities route to the Review Queue rather than silent assignment. |
| **M4** | **Dependency & Risk Engine** | Directed graph model evaluated via BFS. Upstream delays flag direct successors as `AT_RISK` and transitive downstream activities as `POTENTIAL_RISK` with cycle protection. |
| **M5** | **Command Center Workspace** | High-level executive dashboard presenting project health, progress variance (pp), delay counts, exposed successors, and actionable attention items. |
| **M6** | **Execution Event Capture** | Records structured field reports, maintaining trusted activity actuals and timestamped audit trails. |
| **M7** | **Evidence Reconciliation** | Detects conflicting field reports on the same activity and date. Variations $> 5\text{ pp}$ trigger supervisor conflict resolution (`ACCEPT_EVIDENCE` vs `KEEP_CURRENT_STATE`). |
| **M8** | **Deterministic Forecasting** | Computes velocity $(\Delta\text{Progress} / \Delta\text{Time})$ across distinct logical observation dates. Strictly deterministic with zero hallucinated "confidence %" metrics. |

---

## 5. Repository Structure

```
INFRA-LINK/
│
├── backend/
│   ├── src/
│   │   ├── config/             # Database connection & environment parsing
│   │   ├── controllers/        # Express route controllers (M1–M8)
│   │   ├── middleware/         # Upload filters, error handling, ObjectId validation
│   │   ├── models/             # Mongoose schemas (Project, Activity, Dependency, Risk, etc.)
│   │   ├── parsers/            # XLSX, isolated PDF, and TXT parsers
│   │   ├── providers/          # Gemini LLM and deterministic fallback extraction providers
│   │   ├── routes/             # REST API endpoint definitions
│   │   ├── services/           # Core domain business logic (Matching, Risk BFS, Forecasting)
│   │   ├── utils/              # Variance calculations, dates, response helpers
│   │   ├── app.ts              # Express application configuration
│   │   └── server.ts           # Server bootstrap and port listener
│   ├── scripts/                # Database seeding utilities (e.g. seed.ts)
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example            # Backend environment template
│
├── frontend/
│   ├── src/
│   │   ├── components/         # Workspaces: CommandCenter, DataIntake, Schedule, Risks, etc.
│   │   ├── lib/                # API base URL configuration helper
│   │   ├── types.ts            # TypeScript interface definitions
│   │   ├── App.tsx             # Root application shell and view router
│   │   ├── main.tsx            # React application entry point
│   │   └── index.css           # Design tokens and custom utilities
│   ├── public/                 # Brand assets (logo-light.svg, logo-dark.svg, favicon.svg)
│   ├── package.json
│   ├── vite.config.ts
│   ├── vercel.json             # Vercel SPA routing rewrite configuration
│   └── .env.example            # Frontend environment template
│
├── README.md                   # Project documentation
└── .gitignore                  # Git exclusion rules
```

---

## 6. Local Setup & Quickstart

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ LTS recommended)
- **npm**: v9.0.0 or higher
- **MongoDB**: MongoDB Atlas connection string or local MongoDB instance

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/infra-link.git
cd infra-link
```

### 2. Backend Setup
```bash
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env and supply your MONGODB_URI and optional LLM_API_KEY

# Start backend in development mode
npm run dev
```
The backend will initialize and listen on `http://localhost:5000`.  
Verify health endpoint: `http://localhost:5000/api/health`.

### 3. Frontend Setup
```bash
cd ../frontend
npm install

# Optional: configure API URL (defaults to http://localhost:5000/api)
cp .env.example .env

# Start frontend development server
npm run dev
```
Open `http://localhost:5173` in your browser to launch the INFRA LINK interface.

---

## 7. Environment Configuration

### Backend (`backend/.env`)
| Variable | Required | Default | Description |
|---|:---:|:---:|---|
| `PORT` | No | `5000` | Port for Express server |
| `NODE_ENV` | No | `development` | Runtime environment (`development` / `production`) |
| `MONGODB_URI` | **Yes** | — | MongoDB Atlas connection string |
| `LLM_PROVIDER` | No | `gemini` | Primary extraction provider (`gemini`) |
| `LLM_MODEL` | No | `gemini-2.5-flash` | Gemini model version |
| `LLM_API_KEY` | No | — | Google Gemini API key (optional; regex fallback triggers if empty) |
| `UPLOAD_MAX_SIZE_MB` | No | `10` | Maximum file upload size in megabytes |
| `MATCH_AUTO_THRESHOLD` | No | `0.90` | Match score threshold for automatic activity linking |
| `MATCH_REVIEW_THRESHOLD` | No | `0.70` | Match score threshold for Review Queue routing |

### Frontend (`frontend/.env`)
| Variable | Required | Default | Description |
|---|:---:|:---:|---|
| `VITE_API_BASE_URL` | No | `http://localhost:5000/api` | Full URL to the backend API |

---

## 8. Deployment Overview

### Deploying Frontend to Vercel
1. Import the repository into [Vercel](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Build Settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Environment Variables:
   - Set `VITE_API_BASE_URL` to your live Render backend URL (e.g., `https://infra-link-backend.onrender.com/api`).
5. Vercel SPA routing is automatically handled by the included `frontend/vercel.json`.

### Deploying Backend to Render
1. Create a new **Web Service** on [Render](https://render.com).
2. Connect your repository and specify the **Root Directory** as `backend`.
3. Runtime Settings:
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Environment Variables:
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: `<Your MongoDB Atlas connection URI>`
   - `LLM_API_KEY`: `<Your Gemini API key>` (optional)
5. Health Check Path: `/api/health`.

---

## 9. Methodological Principles

- **No Probabilistic Hallucination:** Forecast completion dates are computed strictly through transparent velocity physics $(\Delta \text{Progress} / \Delta \text{Time})$ and topological dependency constraints. M8 does not output arbitrary "confidence percentages".
- **Truthful Status Quantification:** Schedule slippage is reported in precise percentage points of variance ($\text{pp}$) unless planned finish calendar mathematics exist.
- **Strict Tenant & Project Isolation:** All activities, dependencies, and execution logs are partitioned at the database query layer by unique project identifiers.

---

## 10. License & Submission Details

- **Program**: Smart India Hackathon 2026
- **Problem Statement ID**: PS26122
- **Team**: INFRA LINK Engineering Team
