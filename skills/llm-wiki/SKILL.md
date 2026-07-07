---
name: llm-wiki
description: Use when creating, updating, querying, or auditing a repository's living documentation wiki (Karpathy LLM Wiki pattern) under docs/wiki/ — ingest code and docs into wiki pages that cite their source files, answer questions from the wiki with citations, or audit the wiki for drift and gaps.
---

# LLM Wiki (repo documentation)

Maintain a Karpathy-style **repo wiki** under `docs/wiki/`: LLM-generated
markdown that documents THIS repository's codebase. Every page cites the real
source files it was built from, so the wiki stays a **map back to source, not a
replacement for it**.

References (read as needed):
- `references/wiki-schema.md` — layout, frontmatter, required sections.
- `references/page-templates.md` — per-page templates.
- `references/audit-checklist.md` — audit rules.

## When to use
- "Build/generate the wiki for this repo"
- "Update the wiki for the changes I just made"
- "What does the wiki say about X?" (query)
- "Audit/lint the wiki"

## Operations

### Initialize (first run)
If `docs/wiki/` does not exist, scaffold it:
1. Create `docs/wiki/README.md` (the index).
2. Create the load-bearing pages: `repo-map.md`, `architecture.md`,
   `open-questions.md`. Add optional pages only when there is content for them.
3. Start every page from `references/page-templates.md`, including the required
   `## Source map` and `## Confidence / gaps` sections.

### Build / ingest
The source may be the codebase itself (default), a specific path, a URL, or
pasted text.
1. Read the source. For code, trace the files/modules in scope.
2. Create or update the relevant wiki pages (see `references/wiki-schema.md`).
3. In each page's `## Source map`, list every source file it draws from, one
   line each.
4. In `## Confidence / gaps`, record what is solid vs. inferred/uncertain.
5. Maintain standard Markdown cross-links between related pages using
   `[page-name](page-name.md)` (or the appropriate relative path from the
   current file to the target). Do NOT use wiki-link syntax (double square
   brackets around a page name) — it does not render in VS Code's built-in
   Markdown reader (CommonMark) and other non-Obsidian viewers.
6. Update `docs/wiki/README.md` so the index lists every page.
7. Set each touched page's `updated:` frontmatter to today's date.
8. Never invent behavior. If the source does not show it, say so under
   `## Confidence / gaps`.

### Query
1. Read `docs/wiki/README.md` to find relevant pages.
2. Open only those pages; synthesize an answer.
3. Cite the wiki pages AND the underlying source paths.
4. If the wiki looks stale or thin for the question, say so and read source.

### Audit / lint
Follow `references/audit-checklist.md`. Report (do not silently fix):
contradictions, orphan pages, referenced-but-missing pages, stale claims, and
**code-drift** (a page whose cited source files changed after the page's
`updated:` date). Offer to fix what you find.

## Rules
- Source code and tests are the higher authority; the wiki serves them.
- During a wiki operation, only write under `docs/wiki/` (unless the user
  explicitly asks you to change code).
- Commit wiki changes as their own reviewable diffs.
- Do not regenerate the whole wiki unless explicitly asked.
- Stay model-agnostic.

## Relationship to Superpowers
This skill maintains the memory that the `wiki-context` skill feeds into
Superpowers brainstorming. For large restructures of the wiki itself, consider
`superpowers:brainstorming` first.
