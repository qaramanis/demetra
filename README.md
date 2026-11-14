# Field Shift

Field Shift is a map dashboard that shows crop-rotation risk, cost and yield for each
agricultural block. It is a NASA Space Apps 2026 project. The demo area is the Thessaly plain
and Central Macedonia, Greece.

## Repository

This is a pnpm workspace.

- `apps/web`: the Next.js dashboard.
- `packages/core`: the shared domain code (crop config, metric definitions, data interface).
- `packages/providers/*`: one package for each data provider.

## Run locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).
