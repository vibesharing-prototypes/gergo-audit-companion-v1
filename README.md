## Diligent Evidence Companion

Agentic GRC helper (Electron) for tracking evidence report statuses: **Cases → Project detail → Agent chat**.

### Run

From this folder:

```bash
npm install
npm run dev
```

### What’s implemented (UI MVP)

- **3-column layout + top bar**: dark tokens, draggable Electron top bar.
- **Resizable splitters**: left + right columns with min/max constraints, persisted via `localStorage`.
- **Cases list**: search, filter chips, sort, selection highlight, right-click context menu.
- **Project detail**: sticky header, KPI chips, evidence checklist with hover inline actions, blockers, timeline, audit notes.
- **Evidence pack drawer**: slide-in preview with index table.
- **Agentic chat**: mode/objective/next-action header + action cards + approval gates + simulated responses.

