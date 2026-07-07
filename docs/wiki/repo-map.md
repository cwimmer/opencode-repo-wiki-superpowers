---
title: Repo Map
type: repo-map
updated: 2026-07-07
confidence: high
---

# Repo Map

Top-level layout of this repo, derived from `git ls-files` and the design
spec's §5.1. Optional paths are omitted when not present.

| Path | Purpose |
| ---- | ------- |
| `package.json` | OpenCode plugin manifest; `name` + `main` that the plugin loader reads. |
| `opencode.json` | Repo-local OpenCode config: registers the `superpowers` plugin. |
| `Makefile` | Root targets: `postCreateCommand` (installs `bun`) and `test` (delegates to `plugins/Makefile`). |
| `README.md` | Short pitch, install snippet, develop/test pointer. |
| `plugins/` | Plugin source and tests (see below). |
| `.opencode/plugins/` | Local dogfood shim that re-exports the plugin so editing it takes effect without re-installing from GitHub. |
| `skills/` | Two skills (`llm-wiki`, `wiki-context`) that the plugin registers. |
| `docs/INSTALL.md` | Multi-repo HTTPS install, optional `AGENTS.md` snippet, private-fallback SSH. |
| `docs/superpowers/specs/` | Design spec(s) for this plugin. |
| `docs/superpowers/plans/` | Implementation plan(s) the builder followed. |
| `docs/wiki/` | This wiki (initialized from the `llm-wiki` skill that this repo itself ships). |
| `.devcontainer/` | Dev container image + `postCreateCommand` wiring (`make postCreateCommand`). |
| `.superpowers/sdd/` | Local-only ledger of self-drive-dev progress (gitignored). |

## `plugins/`

| Path | Purpose |
| ---- | ------- |
| `plugins/Makefile` | `test` target → `bun test`. |
| `plugins/repo-wiki-superpowers.js` | The plugin. ESM; exports `RepoWikiSuperpowersPlugin` returning a `config` hook that appends `<pkg>/skills` to `config.skills.paths` idempotently. |
| `plugins/repo-wiki-superpowers.test.js` | `bun test` suite: plugin export shape, idempotent registration, dogfood shim, both skills' frontmatter + reference files, `INSTALL.md` spec string. |

## `skills/`

| Path | Purpose |
| ---- | ------- |
| `skills/llm-wiki/SKILL.md` | `llm-wiki` skill body: initialize / build / query / audit a `docs/wiki/`. |
| `skills/llm-wiki/references/wiki-schema.md` | `docs/wiki/` layout, page frontmatter, required sections. |
| `skills/llm-wiki/references/page-templates.md` | Per-page templates (index + content + repo-map). |
| `skills/llm-wiki/references/audit-checklist.md` | Audit rules (contradictions / orphans / stale / code-drift). |
| `skills/wiki-context/SKILL.md` | `wiki-context` skill body: read-before-ask procedure for Superpowers brainstorming. |
| `skills/wiki-context/references/proposal-sections.md` | Templates for **Wiki context used** + **Source-grounding notes**. |

## `.opencode/plugins/`

| Path | Purpose |
| ---- | ------- |
| `.opencode/plugins/repo-wiki-superpowers.js` | One-line re-export of `RepoWikiSuperpowersPlugin` so editing `plugins/repo-wiki-superpowers.js` takes effect locally. OpenCode auto-loads `.opencode/plugins/` of the *current* project, not of installed dependencies. |

## Source map

- `package.json` — plugin manifest.
- `opencode.json` — repo's own OpenCode config (does not yet list this plugin;
  the plugin is loaded via the local dogfood shim).
- `Makefile` — root build/test targets.
- `plugins/Makefile`, `plugins/repo-wiki-superpowers.js`,
  `plugins/repo-wiki-superpowers.test.js` — plugin source and tests.
- `.opencode/plugins/repo-wiki-superpowers.js` — dogfood shim.
- `skills/llm-wiki/SKILL.md` and its `references/`.
- `skills/wiki-context/SKILL.md` and its `references/`.
- `docs/INSTALL.md` — install doc.
- `docs/superpowers/specs/2026-07-07-repo-wiki-superpowers-design.md` §5.1 —
  reference layout this repo was built to.
- `.devcontainer/devcontainer.json` — dev environment glue.
- `.gitignore` — excludes `.superpowers/sdd/` (local SDD ledger).

## Confidence / gaps

- Solid: top-level layout, plugin location, skill location, doc location.
- Uncertain / to verify: nothing — every path listed above exists and was
  verified by `read`.
