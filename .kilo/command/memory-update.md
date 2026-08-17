---
description: Update memory.md to reflect the current state of the codebase after implementation
---

# Memory Update Command

Scans the project for changes and updates `memory.md` at the project root.

## Instructions

You are an autonomous agent. Your task is to update `memory.md` to ensure it accurately reflects the current state of the codebase. Follow these steps:

1. Run `git diff HEAD~1 --name-only` and `git log --oneline -10` to identify recently changed, added, or deleted files.
2. Run `find src/ -type f \( -name "*.ts" -o -name "*.tsx" \) | sort` to get the current file tree.
3. Read the current `memory.md` to establish the baseline.
4. Compare the codebase state against `memory.md` and identify discrepancies:
   - New or deleted files in `src/` (components, services, types, utils, contexts, config, constants, data, database, examples)
   - New or modified services in `src/services/`
   - New or modified type definitions in `src/types/`
   - New or changed routes in `src/components/Router.tsx` and `src/components/admin/SimpleAdminDashboard.tsx`
   - New npm dependencies (check `package.json`)
   - New database migrations in `database/migrations/`
   - New environment variables (check `.env.example`)
   - Changes to conventions or patterns (e.g., new utility functions, auth changes)
5. Update the relevant sections of `memory.md`:
   - Section 3 (Codebase Structure) — add/remove files as needed
   - Section 4 (Key Patterns & Conventions) — update patterns
   - Section 7 (Development Workflow) — add new scripts or env vars
   - Section 8 (Key Files Reference) — add new key files
   - Section 9 (Critical Gotchas) — add new gotchas
   - Section 10 (Reporting Pattern) — add new reporting components
   - Section 11 (Recent Changes) — add new git commits
   - Section 2 (Architecture) — update routing/component changes
6. Update the "Last updated" timestamp at the top of `memory.md` to the current date/time.
7. Report what was changed.

If no changes are detected, confirm that `memory.md` is up to date.
