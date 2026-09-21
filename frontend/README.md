# INFRA LINK — Frontend Client

> **Connect Plans. Track Progress. Predict Impact.**  
> Smart India Hackathon 2026 | Problem Statement 26122  
> **Organization & Department:** Oil India Limited | **Category:** Software | **Theme:** Smart Automation

---

## Overview

The INFRA LINK frontend is an enterprise web application providing an intuitive planning-to-execution intelligence layer for infrastructure projects.

### Key Workspaces
- **Command Center**: Executive progress metrics, delayed packages, exposed successors, and critical attention items.
- **Data Intake**: Multi-modal document ingestion, structured field updates, review queue for unmatched signals, and tolerance-based reconciliation queue.
- **Schedule & Activities**: WBS milestone explorer, activity details, and baseline XLSX schedule upload.
- **Risks & Forecast**: Topological dependency risk propagation graph and deterministic velocity-based milestone completion forecasts.

---

## Tech Stack
- **Framework**: React 18 / 19 with Vite 8
- **Language**: TypeScript 5.6
- **Styling**: Tailwind CSS 3.4 + Custom Enterprise CSS
- **Icons**: Lucide React

---

## Local Development

```bash
npm install
npm run dev
```

The application will run at `http://localhost:5173`.

### Environment Configuration
Copy `.env.example` to `.env`:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```
When left unset, it automatically defaults to `http://localhost:5000/api` for local development.

---

## Production Build

```bash
npm run build
```
Generates production bundle in `dist/`.
