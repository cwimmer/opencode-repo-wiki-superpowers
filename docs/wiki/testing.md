---
title: Testing
type: testing
updated: 2026-07-07
confidence: high
---

# Testing

The plugin ships one `bun test` suite under `plugins/`. It is the
authoritative gate (per design spec §10 and plan Task 6).

## How to run

From the repository root:

```
make test
```

Root `Makefile` delegates to `plugins/Makefile`, which runs `bun test`.
`bun` is installed by `make postCreateCommand` (which the devcontainer
invokes via its own `postCreateCommand`). If you need it outside the
devcontainer, the same command (`npm install -g bun`) installs it; on the
default prefix `/usr` it lands at `/usr/bin/bun`, on `PATH`.

## What the suite covers

File: `plugins/repo-wiki-superpowers.test.js`. Five `describe` blocks, with
test counts increasing through Tasks 1–5 (3 → 4 → 6 → 8 → 9). The blocks:

1. **`plugin registration`**
   - Plugin export is a function; calling it returns an object whose
     `config` field is a function.
   - Running `config({})` adds the resolved `<repo>/skills` path to
     `config.skills.paths`.
   - Running `config` twice adds the path exactly once (idempotent).

2. **`dogfood shim`**
   - `import("../.opencode/plugins/repo-wiki-superpowers.js")` exports a
     working `RepoWikiSuperpowersPlugin` whose `config` hook behaves the
     same way.

3. **`llm-wiki skill`** — runs `expectValidSkill("llm-wiki")` plus
   `expectNonEmpty` on each of the three reference files. The
   `expectValidSkill` helper enforces:
   - frontmatter `name` equals the directory name,
   - `name` matches `^[a-z0-9]+(-[a-z0-9]+)*$` and is ≤ 64 chars,
   - `description` is a non-empty string of length 1–1024.
   Reference files asserted:
   `skills/llm-wiki/references/{wiki-schema,page-templates,audit-checklist}.md`.

4. **`wiki-context skill`** — same shape, asserts the skill plus its single
   reference file `skills/wiki-context/references/proposal-sections.md`.

5. **`install docs`** — `docs/INSTALL.md` contains the verbatim public
   install spec string
   `repo-wiki-superpowers@git+https://github.com/cwimmer/opencode-repo-wiki-superpowers.git`.

The helpers (`readFrontmatter`, `expectValidSkill`, `expectNonEmpty`,
`NAME_RE`, `root`, `skillsDir`) are defined once near the top of the file
and reused across blocks — that is intentional; the plan notes "Test
counts increase monotonically 3 → 4 → 6 → 8 → 9 as blocks are appended."

## What the suite does **not** cover

By design (per the design spec §3 non-goals and the skill-only surface):

- No tests for skill *behavior* end-to-end. The two skills' value is the
  markdown workflow they describe; running them requires an LLM and a
  consuming repo, neither of which is in scope for this repo's test
  suite.
- No tests for OpenCode itself. The plugin relies on OpenCode loading it
  and calling its `config` hook exactly as documented; this is verified
  manually by loading the plugin in a consuming repo.
- No tests for installation over HTTPS (would require network + a tag on
  GitHub). The "install docs" block is a substring assertion on
  `docs/INSTALL.md`, sufficient to catch drift in the documented spec.

## Toolchain note

The devcontainer image ships Node v26 and OpenCode but **not** `bun` on
PATH. `make postCreateCommand` runs `npm install -g bun` once on container
creation. `npm`'s `allow-scripts` warning is benign: the modern `bun`
package ships the native binary as an optional dependency, so the postinstall
script is unnecessary. The plugin's plan documents the verification command
`bun --version` (typically `1.3.14`) and `make test` exiting 0 on green.

## Test gate vs. pre-commit (hygiene) gate

`make test` is the **authoritative test gate** — the single `bun test` suite
in `plugins/` asserts plugin shape, dogfood shim, skill frontmatter +
reference existence, and the install-doc spec string. Nothing else runs in
test mode.

`pre-commit run --all-files` is a **separate, opt-in hygiene gate** wired
through `.pre-commit-config.yaml` (see [operations](operations.md) for
install). It runs `markdownlint-cli2 --fix`, `eslint`, `yamllint`,
`actionlint`, and the pre-commit-hooks set (`check-json`, `check-toml`,
`trailing-whitespace`, etc.) over the working tree. It does **not** run
`bun test`, and `make test` does **not** run the lint hooks. The two gates
are complementary: `make test` proves the plugin still works; pre-commit
keeps markdown, YAML, JSON, and JS clean across the repo. Both must be
green before a tagged release.

## Source map

- `Makefile` — `test` target delegates to `plugins/Makefile`.
- `plugins/Makefile` — `test` target runs `bun test`.
- `plugins/repo-wiki-superpowers.test.js` — the suite; describes, helpers,
  and the `NAME_RE` regex.
- `plugins/repo-wiki-superpowers.js` — the unit under test (plugin +
  `config` hook).
- `.opencode/plugins/repo-wiki-superpowers.js` — the dogfood shim under
  test (one block).
- `skills/llm-wiki/SKILL.md` and `skills/llm-wiki/references/{wiki-schema,page-templates,audit-checklist}.md` —
  validated by the `llm-wiki skill` block.
- `skills/wiki-context/SKILL.md` and
  `skills/wiki-context/references/proposal-sections.md` — validated by
  the `wiki-context skill` block.
- `docs/INSTALL.md` — substring asserted by `install docs`.
- `docs/superpowers/specs/2026-07-07-repo-wiki-superpowers-design.md` §10
  — validation rules and toolchain notes.
- `.devcontainer/devcontainer.json` — `postCreateCommand: make postCreateCommand`.
- `.pre-commit-config.yaml` — the separate hygiene gate (`markdownlint-cli2 --fix`,
  `eslint`, `yamllint`, `actionlint`, pre-commit-hooks); not part of `make test`.
- `.markdownlint.yaml` — rule disables that justify the markdown style.
- `eslint.config.js` — flat-config ESLint for the test target's source files.

## Confidence / gaps

- Solid: how to run; what the suite covers block-by-block; what it
  intentionally does not cover; toolchain install path; the
  `make test` vs `pre-commit run --all-files` separation.
- Uncertain / to verify: nothing material to the test surface.
