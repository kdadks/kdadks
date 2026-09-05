# AGENTS.md — Agent Instructions

> This file provides core instructions to the Kilo coding agent for the KDADKS Website project.

## Project Memory Maintenance

**After every implementation task, the Kilo agent MUST update `memory.md`** at the project root to ensure it reflects the current state of the codebase.

### When to Update memory.md

Update `memory.md` whenever any of the following occur:
- A new file is created or deleted in `src/`
- A new service is added or an existing service is significantly modified
- A new component is added or an existing component is significantly modified
- A new type definition is added or an existing type is modified
- A new database migration is added
- A new npm package dependency is added
- A new route is added or an existing route is changed
- A new utility function is added
- Project conventions, patterns, or architecture change
- Environment variables are added or changed
- The git history shows meaningful new commits that introduce features

### How to Update memory.md

1. Read the current `memory.md` to find relevant sections.
2. Update the affected section(s) to reflect the change.
3. Update the "Last updated" timestamp at the top of `memory.md` to the current date/time.
4. If a new section is needed for a major new feature, add it.
5. Commit the updated `memory.md` alongside any code changes (only when committing is requested).

### Memory Update Command

You can also invoke the dedicated memory update command at any time:

```
/kilo command:memory-update
```

This command will scan the project for changes and update `memory.md` accordingly.

## General Development Guidelines

- Follow existing code conventions — see `memory.md` for project-specific patterns
- All data access goes through the service layer (`src/services/`)
- All types are defined in `src/types/` — do not define types inline in components
- Use `useCompanyContext()` for entity filtering in admin components
- Use `useToast()` for success/error notifications
- Use `useConfirmDialog()` for destructive action confirmations
- Multi-country support via `getCompanyTaxFields()` and `getCompanyBankingFields()` in `src/utils/taxUtils.ts`
- Run `npm run lint` and `npm run build` after making changes
- `.env` is gitignored — never commit environment credentials

## Code Style

- TypeScript with strict typing (no `any` unless absolutely necessary — use `// eslint-disable-next-line @typescript-eslint/no-explicit-any`)
- Tailwind CSS for styling (utility-first classes)
- Lucide React for icons
- Framer Motion for animations (sparingly)
- Prettier formatting (no trailing commas in some configs, check existing files)
- JSDoc comments on service methods

## Testing & Functional Verification Protocol

- Run `npx tsc --noEmit` and `npm run build` after making any code changes to verify TypeScript compilation and build output.
- Execute the high-level functional test suite defined in `test.md` covering all affected modules and dependent workflows.
- **Production Database Safety & Cleanup:** Any test records created during verification MUST use `TEST_AGENT_` prefixes and MUST be 100% deleted immediately after test completion. Never edit or delete production user data.
- **Test Suite Maintenance:** Review and update `test.md` whenever code changes introduce new critical paths, modify existing functionality, or render prior tests obsolete.

