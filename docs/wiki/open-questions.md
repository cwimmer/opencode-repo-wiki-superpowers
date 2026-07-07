---
title: Open Questions
type: open-questions
updated: 2026-07-07
confidence: medium
---

# Open Questions

Known unknowns and decisions still pending. Each entry tries to cite the
file and section it comes from.

## 1. Is `v0.1.0` published on GitHub?

**Where from.** The install spec documented in `README.md`, `docs/INSTALL.md`,
and asserted in `plugins/repo-wiki-superpowers.test.js` is
`…git#v0.1.0`. The tag has to exist on GitHub for OpenCode to resolve the
spec.

**Status / to verify.** Confirm with `git ls-remote --tags
https://github.com/cwimmer/opencode-repo-wiki-superpowers.git` (no network
available to me here). If not yet pushed, the release step in [operations](operations.md)
applies.

## 2. Does OpenCode auto-select `wiki-context` from its `description`?

**Where from.** Design spec §12: "Skill auto-selection vs explicit
invocation: `wiki-context` is most reliable when named in the prompt
template; description-based auto-selection is best-effort."

**Why it matters.** Best-case the user gets brainstorms that automatically
consult `docs/wiki/`; worst-case `wiki-context` is silently skipped.

**Documented mitigation.** `docs/INSTALL.md` makes the prompt-template line
`Use the wiki-context skill for this task.` explicit, and documents an
optional `AGENTS.md` snippet for per-repo automation. Treat name-in-prompt
as the load-bearing mechanism.

## 3. Does OpenCode load a plugin from a `git+https` install when the root
   `package.json` `main` points to a subdirectory?

**Where from.** Design spec §12 again, listed under "OpenCode git+https
from a subdir-`main` package" — "verified conceptually against the plugin
docs (main can be any path in the package). Implementation will confirm
the plugin loads from a tagged install."

**Status / to verify.** Confirmed conceptually but not from a tagged
install. If a tagged install fails to load, the workaround is to move the
plugin file to the root or to expose it via a thin root file. The
`package.json` `main` field already points to `plugins/`, so this is a
runtime, not design, question.

## 4. Coverage for `wiki-context`'s design-proposal sections

**Where from.** `skills/wiki-context/SKILL.md` requires the design to
include **Wiki context used** and **Source-grounding notes**
(*Confirmed-from-source* / *Inferred-from-source* / *Still-uncertain*).
The templates live in
`skills/wiki-context/references/proposal-sections.md`.

**Why it's open.** Nothing in this repo enforces that those sections
actually appear in a produced design. Validation is the
`superpowers:brainstorming` / `superpowers:requesting-code-review`
workflow downstream. If a future release wants a stronger gate, the test
suite here could mock a sample brainstorm invocation — not in scope.

## 5. Audit the wiki regularly?

**Where from.** `skills/llm-wiki/SKILL.md` "Audit / lint" operation, and
`references/audit-checklist.md`.

**Status.** The skill is shipped but no cron / hook runs it. Audits are
operator-initiated ("Audit the wiki" prompt). Consider: is a periodic
audit (e.g. after every tagged release) worth adding to `make test`?
Current answer: no — YAGNI and stays model-agnostic.

## Source map
- `docs/superpowers/specs/2026-07-07-repo-wiki-superpowers-design.md` §12
  — explicit list of risks/open questions from the design.
- `docs/INSTALL.md` — install spec, prompt-template, `AGENTS.md` snippet.
- `README.md` — short pitch + install snippet.
- `plugins/repo-wiki-superpowers.test.js` — install spec string assertion.
- `package.json` — `main` field (`plugins/repo-wiki-superpowers.js`).
- `skills/wiki-context/SKILL.md` and
  `skills/wiki-context/references/proposal-sections.md` — proposed design
  sections.
- `skills/llm-wiki/SKILL.md` and
  `skills/llm-wiki/references/audit-checklist.md` — audit operation.
- [operations](operations.md) — tag-cut commands.
- [integrations](integrations.md) — integration surface (OpenCode + Superpowers).

## Confidence / gaps
- Solid: the questions themselves and where each came from.
- Uncertain / to verify: the answers to #1, #2, #3 (each requires network or
  an actual tagged install to confirm).
