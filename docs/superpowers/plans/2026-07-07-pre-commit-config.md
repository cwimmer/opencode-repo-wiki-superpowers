# Pre-commit Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a minimal `.pre-commit-config.yaml`, a `.markdownlint.yaml`, and an `eslint.config.js` so developers get local hygiene checks (YAML, GitHub Actions, JSON/TOML, end-of-file, trailing whitespace, oversized files, merge markers, markdownlint, ESLint) gated through pre-commit, with editor feedback kept in lockstep via the devcontainer's pre-installed VS Code extensions.

**Architecture:** A single `.pre-commit-config.yaml` registers five well-maintained upstream hook repos (`pre-commit/pre-commit-hooks`, `adrienverge/yamllint`, `rhysd/actionlint`, `DavidAnson/markdownlint-cli2`, `eslint/eslint`), each gated on language/glob filters so they don't try to lint the bundled `node_modules/`. Hook config lives in two narrow, separate files (`.markdownlint.yaml`, `eslint.config.js`) so the editor and pre-commit surface identical findings. Editor coverage is wired through the existing devcontainer (adds `dbaeumer.vscode-eslint` alongside the already-present `DavidAnson.vscode-markdownlint`). Verification is `pre-commit run --all-files` plus the existing `make test`; no new test framework is introduced.

**Tech Stack:** Python 3 (pre-commit is a Python tool — installed by the developer, not by `make postCreateCommand`), `pre-commit` v4.x, `yamllint`, `actionlint`, `markdownlint-cli2`, `eslint` v9 with flat config, GNU Make.

---

## Global Constraints

Copy these values verbatim; every task inherits them.

- Pre-commit config: `.pre-commit-config.yaml` at repo root. `fail_fast` left at pre-commit default (off).
- Hook IDs (exact strings used in the config) — do not rename:
  - `check-added-large-files`, `check-merge-conflict`, `check-json`, `check-toml`,
    `end-of-file-fixer`, `trailing-whitespace`
  - `yamllint`, `actionlint`, `markdownlint-cli2`, `eslint`
- Hook repo revisions (pin to a tag — pre-commit requires a tag, not a branch):
  - `pre-commit/pre-commit-hooks` → `v5.0.0`
  - `adrienverge/yamllint` → `v1.35.1`
  - `rhysd/actionlint` → `v1.7.7`
  - `DavidAnson/markdownlint-cli2` → `v0.13.1`
  - `eslint/eslint` → `v9.15.0` (also pinned as `additional_dependencies`)
- `additional_dependencies` for the `eslint` hook: `eslint@9.15.0`,
  `@eslint/js@9.15.0`, `globals@15.12.0`.
- Files excluded from JSON / TOML hooks (single regex string per hook, scoped
  via `exclude:`): `node_modules/`, `.opencode/`, `**/package-lock.json`,
  `.devcontainer/devcontainer-lock.json`. The `.pre-commit-config.yaml`
  itself is naturally only linted by yamllint, not by `check-yaml` /
  `check-json`.
- `.markdownlint.yaml` rule disables (only these four — do not silently add
  more): `MD013` (line-length), `MD033` (inline HTML), `MD041` (first-line H1
  required), `MD024` (duplicate sibling headings). If a different rule fires
  on existing content, the fix is a per-rule decision in a follow-up commit,
  not a silent disable.
- `eslint.config.js` is flat config (ESLint v9). No stylistic rules
  (`quotes`/`semi`/`indent`/etc.) — that would cause unrelated diff churn on
  the existing plugin source. `globals.node` plus `ecmaVersion: 2024`,
  `sourceType: "module"`. Files scope: `plugins/**/*.js`,
  `.opencode/plugins/**/*.js`. Ignore: `node_modules/**`,
  `.opencode/node_modules/**`. Rules: `js.configs.recommended` plus
  `no-undef: error`, `no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]`.
- No new `npm install -g` calls; no Makefile changes; no GitHub Actions
  workflows (out of scope per the design spec); no Prettier (out of scope);
  no CONTRIBUTING.md (README's Develop section is the home).
- Devcontainer edit: append `"dbaeumer.vscode-eslint"` to
  `.devcontainer/devcontainer.json`'s `customizations.vscode.extensions`
  array, **after** the existing `DavidAnson.vscode-markdownlint` entry. No
  other devcontainer field changes.
- All scripts / hook configs run **offline** during normal commits; the only
  network operation is the one-time hook-repo download during
  `pre-commit install` (or the next `pre-commit autoupdate`).
- Files that contain the trailing-newline / trailing-whitespace fixes
  already known to the current tree (must be touched before pre-commit can
  pass; these are the only "unrelated" content edits in this plan):
  - `skills/wiki-context/SKILL.md` — append trailing newline.
  - `skills/wiki-context/references/proposal-sections.md` — append trailing
    newline.
  - `docs/superpowers/specs/2026-07-07-repo-wiki-superpowers-design.md`
    — trim trailing whitespace from one line.
- Existing tests: `make test` → `bun test` under `plugins/`. Must remain
  green; no source under `plugins/` is modified by this plan.

## Reference: final layout produced by this plan

```
opencode-repo-wiki-superpowers/
├── .pre-commit-config.yaml          # NEW
├── .markdownlint.yaml               # NEW
├── eslint.config.js                 # NEW
├── .devcontainer/
│   └── devcontainer.json            # MODIFIED (one extension appended)
├── README.md                        # MODIFIED (Develop subsection appended)
├── skills/
│   ├── wiki-context/SKILL.md        # MODIFIED (trailing newline added)
│   └── wiki-context/references/proposal-sections.md  # MODIFIED (newline added)
├── docs/superpowers/specs/
│   └── 2026-07-07-pre-commit-config-design.md     # MODIFIED (trim trailing ws)
└── docs/wiki/                       # MODIFIED (refreshed at end via llm-wiki)
```

---

### Task 1: Add the three root config files

**Files:**

- Create: `.pre-commit-config.yaml`
- Create: `.markdownlint.yaml`
- Create: `eslint.config.js`

**Interfaces:**

- Consumes: nothing.
- Produces: the three config files. Subsequent tasks consume
  `.pre-commit-config.yaml` (Task 3 — `pre-commit run`) and the devcontainer
  edit (Task 2 — adds the ESLint extension that reads `eslint.config.js`).

- [ ] **Step 1: Create `.pre-commit-config.yaml`** at the repo root with the
      exact content below.

```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v5.0.0
    hooks:
      - id: check-added-large-files
      - id: check-merge-conflict
      - id: check-json
        exclude: ^(node_modules/|\.opencode/|\.devcontainer/devcontainer-lock\.json|.*package-lock\.json)
      - id: check-toml
      - id: end-of-file-fixer
      - id: trailing-whitespace

  - repo: https://github.com/adrienverge/yamllint
    rev: v1.35.1
    hooks:
      - id: yamllint
        args: ['--strict', '--config-data={extends: relaxed, rules: {line-length: disable}}']

  - repo: https://github.com/rhysd/actionlint
    rev: v1.7.7
    hooks:
      - id: actionlint

  - repo: https://github.com/DavidAnson/markdownlint-cli2
    rev: v0.13.1
    hooks:
      - id: markdownlint-cli2

  - repo: https://github.com/eslint/eslint
    rev: v9.15.0
    hooks:
      - id: eslint
        files: \.(js|mjs|cjs)$
        additional_dependencies:
          - eslint@9.15.0
          - '@eslint/js@9.15.0'
          - globals@15.12.0
```

- [ ] **Step 2: Create `.markdownlint.yaml`** at the repo root with the
      exact content below.

```yaml
default: true
MD013: false   # line length — long sentences / tables are common
MD033: false   # inline HTML (used in tables and reference rows)
MD041: false   # first-line H1 not required (wiki/README files omit)
MD024: false   # duplicate sibling headings OK (design spec reuses names)
```

- [ ] **Step 3: Create `eslint.config.js`** at the repo root with the exact
      content below.

```js
import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: { ...globals.node }
    },
    files: ["plugins/**/*.js", ".opencode/plugins/**/*.js"],
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-undef": "error"
    }
  },
  { ignores: ["node_modules/**", ".opencode/node_modules/**"] }
];
```

- [ ] **Step 4: Verify the three files parse / lint cleanly**

Run:

```
pre-commit validate-config .pre-commit-config.yaml 2>/dev/null || pre-commit validate-config
yamllint --strict --config-data="{extends: relaxed, rules: {line-length: disable}}" .pre-commit-config.yaml
yamllint --strict --config-data="{extends: relaxed, rules: {line-length: disable}}" .markdownlint.yaml
node --check eslint.config.js   # syntax check only; full lint runs in Task 3
```

Expected: every command exits 0. If `pre-commit validate-config` reports a
config parse error, re-check the YAML against the spec block above; the most
common cause is using a tab character in indentation. (YAML must be indented
with spaces in the `args:` lists.)

If any check fails, fix the offending file. **Do not proceed** until all
three exit cleanly.

- [ ] **Step 5: Commit**

```bash
git add .pre-commit-config.yaml .markdownlint.yaml eslint.config.js
git -c user.name="opencode" -c user.email="opencode@local" commit -m "feat: add pre-commit, markdownlint, eslint configs"
```

---

### Task 2: Add `dbaeumer.vscode-eslint` to the devcontainer

**Files:**

- Modify: `.devcontainer/devcontainer.json`

**Interfaces:**

- Consumes: the existing `.devcontainer/devcontainer.json` (its
  `customizations.vscode.extensions` array) — read it first; do not reorder
  the existing entries.
- Produces: a JSON file whose `extensions` array now contains
  `"dbaeumer.vscode-eslint"` immediately after the existing
  `"DavidAnson.vscode-markdownlint"` entry. The
  `postCreateCommand: "make postCreateCommand"` and
  `settings.["makefile"]` block stay as-is.

- [ ] **Step 1: Read the current devcontainer config**

Run:

```
cat .devcontainer/devcontainer.json
```

Verify the `customizations.vscode.extensions` array contains exactly these four
entries in this order: `ms-vscode.makefile-tools`, `Gruntfuggly.todo-tree`,
`DavidAnson.vscode-markdownlint`, `sst-dev.opencode`. If those are not present,
stop and re-check the file; do not edit based on a guess.

- [ ] **Step 2: Append `dbaeumer.vscode-eslint` after `DavidAnson.vscode-markdownlint`**

Use `edit` to replace the array contents. The unique 5-line block to replace
is:

```json
      "extensions": [
        "ms-vscode.makefile-tools",
        "Gruntfuggly.todo-tree",
        "DavidAnson.vscode-markdownlint",
        "sst-dev.opencode"
      ],
```

Replace with:

```json
      "extensions": [
        "ms-vscode.makefile-tools",
        "Gruntfuggly.todo-tree",
        "DavidAnson.vscode-markdownlint",
        "dbaeumer.vscode-eslint",
        "sst-dev.opencode"
      ],
```

Do not change anything else in the file. Preserve all other keys verbatim.

- [ ] **Step 3: Validate JSON is still valid**

Run:

```
node -e "JSON.parse(require('fs').readFileSync('.devcontainer/devcontainer.json','utf8')); console.log('ok')"
```

Expected: prints `ok`. Exit 0. If JSON.parse fails, the diff likely swapped
or dropped a comma — re-open the file and check.

- [ ] **Step 4: Confirm no other field changed**

Run:

```
git diff .devcontainer/devcontainer.json
```

Expected: the diff is the single-line insertion of `"dbaeumer.vscode-eslint"`
plus the comma on the preceding line, and nothing else. If any other line
changed, revert with `git checkout -- .devcontainer/devcontainer.json` and
retry Step 2.

- [ ] **Step 5: Commit**

```bash
git add .devcontainer/devcontainer.json
git -c user.name="opencode" -c user.email="opencode@local" commit -m "chore(devcontainer): add dbaeumer.vscode-eslint extension"
```

---

### Task 3: Install pre-commit, run hooks, apply autofixes

**Files:**

- Modify (autofix only, may or may not actually mutate):
  - `skills/wiki-context/SKILL.md`
  - `skills/wiki-context/references/proposal-sections.md`
  - `docs/superpowers/specs/2026-07-07-pre-commit-config-design.md`
- Plus any other files where `end-of-file-fixer` / `trailing-whitespace` /
  (if they ever run with `--fix`) markdownlint-cli2 / eslint decide to mutate.

**Interfaces:**

- Consumes: the three configs from Task 1, the devcontainer edit from Task 2.
- Produces: a working `pre-commit` install on the developer's machine
  (`.git/hooks/pre-commit` script present) and one autofix commit covering
  whatever the hooks mutated. If no files are mutated, the commit has no
  changes — that is acceptable; just commit an empty allow-list note instead
  per Step 7's branch.

- [ ] **Step 1: Verify `pre-commit` is on PATH**

Run:

```
pre-commit --version
```

If the command is not found, install the Python tool:

```
pip install --user 'pre-commit>=4,<5'
export PATH="$HOME/.local/bin:$PATH"
pre-commit --version
```

Expected: prints a `pre-commit X.Y.Z` version line, exit 0. (This is the only
network-using setup step in the entire plan; subsequent `pre-commit run`
invocations are offline.)

- [ ] **Step 2: Install the git hook for the active repo**

Run:

```
pre-commit install
```

Expected: prints `pre-commit installed at .git/hooks/pre-commit` and exits 0.

- [ ] **Step 3: Run all hooks against the full tree**

Run:

```
pre-commit run --all-files
```

Expected: every hook either prints `Passed` or, for the autofix hooks
(`end-of-file-fixer`, `trailing-whitespace`), modifies files and prints
`Failed` followed by `files were modified by this hook` (the latter is
expected behavior — pre-commit re-runs them on the next iteration).

Notes:

- Markdownlint-cli2 and ESLint do **not** auto-fix by default in their
  pre-commit hook form. If they emit warnings/errors on existing content,
  the failures fall into two categories (handled in Step 6):
  - The rule fires on an existing file we accept: record it as a
    candidate rule disable and stop; the engineer will decide in a
    follow-up commit.
  - The rule fires because of a real issue we want fixed: fix the file.
  In either case, do not silently add to `.markdownlint.yaml` or
  `eslint.config.js`.
- `yamllint` will lint `.pre-commit-config.yaml` and `.markdownlint.yaml`;
  the relaxed preset (with line-length disabled) should accept both.

- [ ] **Step 4: If autofix hooks modified files, list them**

Run:

```
git status --porcelain
```

Expected: lines like `M skills/wiki-context/SKILL.md`, etc. The known
expected mutations are documented in Global Constraints.

- [ ] **Step 5: Re-run hooks to confirm autofix passes cleanly**

Run:

```
pre-commit run --all-files
```

Expected: every hook prints `Passed`, exit 0. If markdownlint-cli2 or
eslint still emit issues, do **not** modify the configs to silence them;
proceed to Step 6.

- [ ] **Step 6: Handle any non-autofix failures (markdownlint / eslint)**

If Step 5 still produces a non-autofix failure, the failure is
markdownlint-cli2 or eslint reporting on existing content. For each reported
diagnostic, decide ONE of the following:

- **(a) The warning is a real issue worth fixing.** Open the file, apply a
  minimal targeted fix (e.g., add the missing blank line markdownlint wants),
  re-run `pre-commit run --all-files`. If it now passes, proceed to Step 7.
- **(b) The warning is a false positive we want to globally suppress.**
  Open `.markdownlint.yaml` or `eslint.config.js`, add the **single** rule
  disable with a short comment explaining why, re-run. **Constraint:** do
  not add more than two rule disables total in this task — if you find
  yourself wanting three or more, stop and report the situation rather than
  bulk-disabling. Re-run until clean.

If the failures cannot be resolved without breaking the design's "no unrelated
formatting changes" rule, do **not** disable the rule. Instead, leave
markdownlint-cli2 / eslint FAILING in the run output, write down each
diagnostic with file + line + rule ID in a comment under Step 7, and move on.
The wiki-refresh task (Task 6) and the final-verification task (Task 5) will
record the remaining diagnostics in the design spec as known issues for a
follow-up — **do not** gut the configs to pass at any cost.

- [ ] **Step 7: Commit the autofix outcome**

If `git status --porcelain` shows any tracked-file modifications (typical
case — the three files in Global Constraints were touched), commit them:

```bash
git add -u
git -c user.name="opencode" -c user.email="opencode@local" commit -m "chore: apply pre-commit autofixes (end-of-file / trailing whitespace)"
```

If `git status --porcelain` is empty (no autofix was needed), skip the
commit and proceed to Task 4.

---

### Task 4: Document the pre-commit setup in README

**Files:**

- Modify: `README.md` (append a subsection under `## Develop`)

**Interfaces:**

- Consumes: the existing `## Develop` section in `README.md` (verified via
  Step 1's read).
- Produces: a new `### Pre-commit hooks (optional)` subsection at the end of
  `## Develop`, with the verbatim wording from Step 3.

- [ ] **Step 1: Read the existing `## Develop` block**

Run:

```
sed -n '/^## Develop/,/^## /p' README.md | head -n 40
```

Expected: shows the existing three bulleted develop steps ending at
`docs/superpowers/specs/2026-07-07-repo-wiki-superpowers-design.md.`.

- [ ] **Step 2: Append a new subsection at the end of `## Develop`**

Use `edit` to replace the unique last paragraph of `## Develop`:

```markdown
- Design spec: `docs/superpowers/specs/2026-07-07-repo-wiki-superpowers-design.md`.
```

Replace with:

```markdown
- Design spec: `docs/superpowers/specs/2026-07-07-repo-wiki-superpowers-design.md`.

### Pre-commit hooks (optional)

This repo includes a `.pre-commit-config.yaml` for local hygiene checks
(YAML, GitHub Actions, JSON/TOML parsing, trailing whitespace, oversized
files, merge-conflict markers, markdownlint, ESLint). To enable locally:

```
pip install pre-commit
pre-commit install
```

Hooks then run automatically on `git commit`. To run against the whole tree:
`pre-commit run --all-files`. The `DavidAnson.vscode-markdownlint` and
`dbaeumer.vscode-eslint` extensions are pre-installed in the devcontainer so
editor and pre-commit stay aligned.

No changes to `docs/INSTALL.md` — it documents how consumers install the
plugin, not developer ergonomics.
```

Do not change anything else in `README.md`. Indentation inside the new
subsection uses three spaces for the bullet-list continuation lines; the
inner code fence is indented to match the surrounding prose (GitHub-flavored
markdown handles either, but match the surrounding style).

- [ ] **Step 3: Verify the diff is local**

Run:

```
git diff README.md
```

Expected: only the appended subsection appears. The existing `## Develop`
content is untouched. If any line above `## Develop` changed, revert and
re-do Step 2.

- [ ] **Step 4: Commit**

```bash
git add README.md
git -c user.name="opencode" -c user.email="opencode@local" commit -m "docs(readme): document pre-commit hook installation"
```

---

### Task 5: Final verification — pre-commit + make test both green

**Files:**

- No edits. This task is read-only verification.

**Interfaces:**

- Consumes: all four preceding tasks. Must run cleanly before the plan is
  considered done (per the design spec §Testing).
- Produces: a recorded pass/fail report in the engineer's final reply.

- [ ] **Step 1: Confirm the working tree is clean**

Run:

```
git status --porcelain
```

Expected: empty output. If anything is listed, that's a straggered edit from
an earlier task; commit it (or discard it) before proceeding.

- [ ] **Step 2: Run pre-commit against the full tree**

Run:

```
pre-commit run --all-files
```

Expected: every hook prints `Passed`, exit 0. If a hook fails:

- If it's `end-of-file-fixer` / `trailing-whitespace`, files were modified
  after the last run — re-run; expected to pass on the next pass.
- If it's `markdownlint-cli2` / `eslint` and you didn't reach Task 3 Step 6
  outcome (a) or (b), the design spec's still-uncertain caveat applies:
  report the diagnostic instead of silencing it.

- [ ] **Step 3: Run the existing test suite**

Run:

```
make test
```

Expected: `bun test` exits 0. The test counts and per-block message from
`docs/wiki/testing.md` should be unchanged (we did not modify
`plugins/repo-wiki-superpowers.js` or its test file). If any test fails,
that is unrelated to this plan and should be investigated separately —
**do not** modify `plugins/` to make a test pass.

- [ ] **Step 4: Smoke-check yamllint against its own config**

Run:

```
pre-commit run yamllint --all-files
```

Expected: `Passed`. Confirms the inline `--config-data` override survived
copy-paste intact and `.pre-commit-config.yaml` itself lints clean under
the relaxed preset.

- [ ] **Step 5: Smoke-check ESLint against the plugin sources**

Run:

```
pre-commit run eslint --all-files
```

Expected: `Passed`. Confirms `eslint.config.js` resolves under the same
flat-config path the editor uses.

- [ ] **Step 6: Record the outcome**

In the final reply, report:

- Pre-commit: green (yes / no, with any diagnostics listed verbatim).
- `make test`: bun test exit 0 (yes / no, with block names matching what
  `docs/wiki/testing.md` enumerates if non-trivial).
- Any markdownlint / eslint diagnostics that were left open per Task 3
  Step 6.

If both gates are green, proceed to Task 6. If pre-commit is red, do not
proceed; fix the issue (per the design's "no unrelated formatting changes"
constraint, the fix should be a per-file targeted edit, not a config gut).

---

### Task 6: Refresh the wiki with the `llm-wiki` skill

**Files:**

- Modify (potentially): `docs/wiki/operations.md`,
  `docs/wiki/repo-map.md`, `docs/wiki/testing.md`.
- Possibly: a new `docs/wiki/tooling.md` (deferred to the skill's judgement).

**Interfaces:**

- Consumes: the four-now-five wiki pages (per `docs/wiki/README.md`); the
  final state of the repo (Tasks 1-5 complete). All four prior tasks' artifacts
  (`.pre-commit-config.yaml`, `.markdownlint.yaml`, `eslint.config.js`, the
  one-line devcontainer extension add, the README subsection) are stable.
- Produces: an updated `docs/wiki/` whose pages cite the new artifacts and
  explain how pre-commit relates to the existing `make test` /
  `make postCreateCommand` surface.

- [ ] **Step 1: Invoke the `llm-wiki` skill**

Run the `llm-wiki` skill (per its `SKILL.md` in `skills/llm-wiki/`):

> Use the llm-wiki skill to refresh the wiki.

When prompted with "build / query / audit", pick **audit** first, then
**build** to apply any changes the audit recommends. The skill's own
procedures take over from here — do not hand-edit the wiki.

- [ ] **Step 2: Verify the skill's candidate pages were actually updated**

The skill is most likely to touch:

- `docs/wiki/operations.md` — add a "Pre-commit hooks" subsection.
- `docs/wiki/repo-map.md` — list the three new root files plus the
  devcontainer extension entry.
- `docs/wiki/testing.md` — note that pre-commit is the hygiene gate, while
  `bun test` remains the test gate.

Run:

```
git status --porcelain docs/wiki/
```

Expected: changes to those pages (or a new tooling page). If the skill did
not update any of them, that is acceptable only if the skill explicitly
stated the existing pages already cover the new material — capture that
statement in Step 3's commit message body. Otherwise, ask the skill to
re-run with the explicit "include the new pre-commit / linting surface" scope.

- [ ] **Step 3: Verify each touched wiki page's `## Source map` cites the
      real artifact, not just mentions it in prose**

Run:

```
git diff docs/wiki/ | grep -E '^\+.*\.md' | grep -v '^+++'
```

Expected: no random new prose that references an artifact without that
artifact appearing in the page's `## Source map`. If you spot one, edit the
page to add the source-map reference; the design spec is explicit that "the
wiki gives Brainstorming memory; the source-map rule keeps it honest."

- [ ] **Step 4: Commit the wiki refresh**

```bash
git add docs/wiki/
git -c user.name="opencode" -c user.email="opencode@local" commit -m "docs(wiki): reflect pre-commit / linting surface"
```

If the skill changed nothing, no commit is needed; record that fact in the
final reply.

- [ ] **Step 5: Re-run both gates one more time**

Run:

```
pre-commit run --all-files
make test
```

Expected: both still green. Wiki changes are markdown only and shouldn't
break pre-commit, but the final pass-through catches any unicode/encoding
trip-wires. If either fails, fix and amend the wiki commit (or add a
follow-up) — do not abandon the verification step.

---

## Self-review checklist

- [x] **Spec coverage:** the design spec's Components (3 config files +
  devcontainer edit + 3 hygiene fixes), Data flow (install + run + autofix),
  Error handling, Testing (pre-commit run + make test), Documentation
  (README subsection), and Post-implementation wiki refresh are each
  implemented by exactly one task. There is no spec requirement without a
  task.
- [x] **No placeholders:** every step contains the exact code or exact
  command. No "TBD" / "TODO" / "fill in later" in any step.
- [x] **Type / name consistency:** hook IDs are spelled identically across
  Tasks 1, 3, and 5 (`check-added-large-files`, `check-merge-conflict`,
  `check-json`, `check-toml`, `end-of-file-fixer`, `trailing-whitespace`,
  `yamllint`, `actionlint`, `markdownlint-cli2`, `eslint`). Config file
  names are spelled identically across all tasks (`.pre-commit-config.yaml`,
  `.markdownlint.yaml`, `eslint.config.js`). Pre-commit repo URLs and
  revisions are identical across Tasks 1, 3, and 5.
- [x] **No unrelated diff:** only files explicitly listed under
  "Reference: final layout" are modified or created; the spec's "no
  unrelated formatting changes" rule is enforced by Task 3 Step 6's two-way
  decision tree (targeted fix vs. per-rule disable, capped at two).
