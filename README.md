# Crow

A lite Airtable-style desktop app built with Electron. Create multiple projects, each with its own fields, records, and views.

- **Table view** — show/hide fields, filter rules, multi-sort, group by field, inline cell editing
- **Kanban view** — group by any single-select field, drag cards between columns
- **Gallery view** — pick any image field as the card cover
- **Field types** — text, number, single select, multi select, date, checkbox, URL, image (local file or URL)

## Stack

Electron (electron-vite) · React · TypeScript · Vite · Tailwind CSS v4 · shadcn/ui · TanStack Query · dnd-kit

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Agent CLI

`cli/crow.mjs` is a zero-dependency CLI that lets scripts and AI agents read and write projects — see [cli/README.md](cli/README.md). It edits the same JSON files the app uses, and the app picks up external changes live via a file watcher. Run `node cli/crow.mjs help` for the full agent-oriented reference, or `npm link` to get a global `crow` command.

## Data

Projects are stored as JSON files in Electron's `userData` directory (`~/Library/Application Support/crow/projects/` on macOS). Locally picked images are copied to `userData/images/` and served through a custom `app-image://` protocol. A demo project is seeded on first launch.
