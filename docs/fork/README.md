# Fork Management

This directory contains everything needed to keep fork features alive through upstream merges — automatically.

## Directory Structure

```
docs/fork/
├── README.md           ← this file
├── patches.json        ← machine-readable patch manifest
└── progress.md         ← current sync status
```

## How It Works

After `git merge upstream/main`, run:

```bash
bun run check:fork      # detect which fork patches are missing
bun run apply:fork      # re-apply missing patches automatically
```

The system uses 3 automatic layers:

| Layer | Method | Coverage |
|---|---|---|
| L0 — New files | git merge preserves them | All new files (Header.tsx, translate.ts, etc.) |
| L1 — Patches | Text-based insert from `patches.json` | Type additions, schema fields, route entries |
| L2 — Feature branches | git cherry-pick each feature commit | Logic changes (Settings.tsx, ChatInput.tsx, etc.) |

## Full Upstream Sync Workflow

```bash
# 1. Fetch latest upstream
git fetch upstream
git checkout main

# 2. Merge upstream into main
git merge upstream/main --no-edit

# 3. Auto-apply all fork patches
bun run apply:fork

# 4. Verify everything survived
bun run check:fork
bun run check:desktop

# 5. Update fork/develop with all features
git checkout fork/develop
git merge main --no-edit
bun run check:desktop
```

## Feature Branches

Each feature lives on `fork/feature/<name>`. When merging upstream:

- L0-L1 patches are detected + applied by `apply:fork`
- L2 (logic changes) uses cherry-pick from each feature branch onto the new `main`
- If cherry-pick fails, `patches.json` contains the precise text snippets as fallback
