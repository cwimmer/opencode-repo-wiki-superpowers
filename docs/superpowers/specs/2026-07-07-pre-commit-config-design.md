# Pre-commit config design

Status: Approved (2026-07-07). Implementation plan will follow.

## Goal

Add a minimal `.pre-commit-config.yaml` so developers can run a fixed set of
local hygiene hooks (`pre-commit run`) without redesigning any CI. The hooks
catch YAML syntax issues, GitHub-Actions wiring problems, and broad-formatting
defects before commit. Editor and pre-commit must agree so a clean editor
means a clean `pre-commit run`.

## Non-goals

- No GitHub Actions workflow changes (none exist; per `docs/wiki/testing.md`
  the `bun test` suite remains the authoritative gate and explicitly avoids
  network).
- No language-specific JS formatting changes (no Prettier, no quote/semi
  rewrites).
- No markdown auto-formatter (no Prettier-on-Markdown; `markdownlint` is the
  signal, not the format).
- No new global CLI installation for users; `pre-commit` is the only new
  requirement and is opt-in.

## Components

Three new files at the repo root (`.pre-commit-config.yaml`,
`.markdownlint.yaml`, `eslint.config.js`), plus one small edit to the
devcontainer.

### `.pre-commit-config.yaml`

Registers four hook families. All hooks are well-maintained upstream
pre-commit hooks. No raw shell.

1. **`pre-commit/pre-commit-hooks` v5.x stdlib:**
   - `check-added-large-files` (default 500 KiB cap).
   - `check-merge-conflict` (catches `<<<<<<<` markers).
   - `check-json` with `exclude:` for `package-lock.json`,
     `.devcontainer/devcontainer-lock.json`, `node_modules/`, `.opencode/`.
   - `check-toml` (no TOML files exist today; cheap).
   - `end-of-file-fixer` and `trailing-whitespace` — autofix hooks; will
     mutate the three known offenders listed in §Data flow.

2. **`adrienverge/yamllint` v1.x** with `--strict` and the upstream `relaxed`
   preset via
   `args: ['--config-data={extends: relaxed, rules: {line-length: disable}}']`.
   `line-length` is disabled because plugin spec strings and git URLs are
   legitimately long. Runs against all `.yml`/`.yaml` files.

3. **`rhysd/actionlint` v1.x** — single-file hook that runs against
   `^\.github/workflows/.*\.(yml|yaml)$`. No-op today (no workflows);
   protective only.

4. **`DavidAnson/markdownlint-cli2` (markdownlint-cli2 v0.13.x hook)** — runs
   against staged `*.md`. Configured by `.markdownlint.yaml`.

5. **`eslint/eslint` v9.x with flat config.** `additional_dependencies`:
   `eslint`, `@eslint/js`, `globals`. Lints `plugins/**/*.js` and
   `.opencode/plugins/**/*.js`. Bug-only rules; no stylistic rules. See
   `eslint.config.js` below.

The `fail_fast` flag is left at its pre-commit default (off) so the dev sees
all findings in one pass.

### `.markdownlint.yaml`

Narrow config mirrors the VSCode-side `DavidAnson.vscode-markdownlint`
defaults already pre-installed in the devcontainer (see
`.devcontainer/devcontainer.json`).

```yaml
default: true
MD013: false   # line length — long sentences / tables are common
MD033: false   # inline HTML (used in tables and reference rows)
MD041: false   # first-line H1 not required (wiki/README files omit)
MD024: false   # duplicate sibling headings OK (design spec reuses names)
```

If markdownlint fires on existing content with another rule, the fix is per-
commit (small doc edit) OR an explicit rule-disable PR — both valid. We do
not silently disable more rules.

### `eslint.config.js` (new, ESLint v9 flat config)

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

Bug-finding only. `eslint --max-warnings 0` runs in the hook so editor and
pre-commit surface the same set of findings.

### `.devcontainer/devcontainer.json` edit

Add one VS Code extension to the `customizations.vscode.extensions` array:

```diff
   "extensions": [
     "ms-vscode.makefile-tools",
     "Gruntfuggly.todo-tree",
     "DavidAnson.vscode-markdownlint",
+    "dbaeumer.vscode-eslint",
     "sst-dev.opencode"
   ]
```

`postCreateCommand` and the existing `settings.[makefile]` block stay as-is.
No `npm install -g` calls.

## Data flow

1. Dev runs `pip install pre-commit && pre-commit install` once.
2. First commit (or `pre-commit run --all-files`) downloads hook repos into
   `~/.cache/pre-commit`. Subsequent commits run from cache offline — matches
   the "no network during normal commit execution" constraint.
3. For each staged file, pre-commit runs only the hooks whose `types`/`files`/
   `exclude` match.
4. `end-of-file-fixer` and `trailing-whitespace` mutate staged content and
   re-stage. Known offenders on the current tree:
   - `skills/wiki-context/SKILL.md` — missing trailing newline.
   - `skills/wiki-context/references/proposal-sections.md` — missing trailing
     newline.
   - `docs/superpowers/specs/2026-07-07-repo-wiki-superpowers-design.md`
     — trailing whitespace on one line.
   The fix to each is purely a trailing-newline add or a trim — no semantic
   change. These fixes land in the implementation commit, not as a follow-up.
5. JSON/TOML/YAML hooks only run on staged files, so `node_modules/` content
   never enters the pipeline.

## Error handling / failure modes

- **Editor shows a problem pre-commit does not**: impossible by construction;
  both run `eslint.config.js` / `.markdownlint.yaml`. If the divergence
  occurs, it's a config-drift bug to fix, not a feature.
- **Pre-commit fails to download a hook repo on first run**: covered by
  pre-commit's own error; we link the standard docs from README.
- **Auto-fixing hook produces an unwanted rewrite**: only ever *adds* a final
  newline or *trims* trailing whitespace; no semantic change.
- **dbaeumer.vscode-eslint missing in a manual local setup (not devcontainer)**:
  dev installs it; documented in README.

## Testing

1. After implementation, run `pre-commit run --all-files`. Expected green.
2. Run `make test` and confirm `bun test` still exits 0 (no plugin/
   test/source changes).
3. Smoke check: `pre-commit run check-yaml --files .pre-commit-config.yaml`
   confirms yamllint parses its own config; same for `end-of-file-fixer` on
   every committed file.
4. Smoke check: open one `.js` file in VSCode with the devcontainer and
   confirm the ESLint Problems panel shows the same findings `pre-commit run
   eslint` reports.

## Documentation

Append a short subsection to `README.md` under `## Develop`:

```markdown
### Pre-commit hooks (optional)

This repo includes a `.pre-commit-config.yaml` for local hygiene checks
(YAML, GitHub Actions, JSON/TOML, trailing whitespace, oversized files,
merge-conflict markers, markdownlint, ESLint). To enable locally:

pip install pre-commit
pre-commit install
```

Hooks then run automatically on `git commit`. To run against the whole
tree: `pre-commit run --all-files`. The
`DavidAnson.vscode-markdownlint` and `dbaeumer.vscode-eslint` extensions are
pre-installed in the devcontainer so editor and pre-commit stay aligned.

No changes to `docs/INSTALL.md` (it's about plugin install, not developer
ergonomics). Wiki updates handled by the post-implementation step (§Post-
implementation wiki refresh below).

## Wiki context used

- [repo-map.md](../wiki/repo-map.md) — confirmed file inventory: no `.yml`/
  `.yaml` files, no `.github/workflows`, many `.md` files, two `Makefile`s,
  bundled `node_modules` and a dogfood shim under `.opencode/plugins/`.
  This drives the JSON exclude list and the protective-only treatment of
  `actionlint`.
- [testing.md](../wiki/testing.md) — confirmed `bun test` is the authoritative
  gate and the suite explicitly avoids network. This is why the design has
  no GitHub Actions step: adding CI would be "designing the CI pipeline",
  which is a non-goal.
- [operations.md](../wiki/operations.md) — `make test` delegation pattern.
  This is why we don't wrap `pre-commit` in `make`; pre-commit's own CLI is
  the stable surface and the Makefile's only contract is `make test` /
  `make postCreateCommand`.
- [architecture.md](../wiki/architecture.md) — confirmed the skill-only
  plugin surface: `.devcontainer/devcontainer.json` is the only touched
  config file and no plugin surface changes.

## Source-grounding notes

- **Confirmed-from-source:** zero `.yml`/`.yaml` files in the repo (verified
  via `find`); the devcontainer pre-installs
  `DavidAnson.vscode-markdownlint` (verified in
  `.devcontainer/devcontainer.json`); three real hygiene offenders (verified
  by shell `tail`/`grep`); `bun test` is the only documented test entry
  (`Makefile`, `plugins/Makefile`); plugin source under
  `plugins/repo-wiki-superpowers.js` is 25 lines of ESM using double-quoted
  imports with semicolons.
- **Inferred-from-source:** the four markdownlint rules disabled by default
  were chosen from spot-reading wiki and skill files — frontmatter stanzas,
  embedded tables, and the design spec's repeated heading names. Other rules
  may fire on existing content; we'll address per-rule during implementation
  rather than bulk-disabling.
- **Still-uncertain:** whether `markdownlint-cli2` defaults match the older
  `markdownlint` defaults shipped with the VSCode extension precisely. Will
  resolve during implementation by running the hook and adjusting
  `.markdownlint.yaml` rule-by-rule if a divergence surfaces; if a clean
  matching config can't be achieved, fall back to whatever strict-subset of
  rules the devcontainer's extension actually enforces and add an explicit
  comment in `.markdownlint.yaml`.

## Post-implementation wiki refresh

After `make test` and `pre-commit run --all-files` both pass on the final
tree, invoke the `llm-wiki` skill to refresh `docs/wiki/`. The skill itself
decides which pages need updating; candidate pages from this design:

- `docs/wiki/operations.md` — add a "Pre-commit hooks (optional)" subsection
  under Develop/dogfood.
  - `docs/wiki/repo-map.md` — add the three new root-level files
    (`.pre-commit-config.yaml`, `.markdownlint.yaml`, `eslint.config.js`) and
    the devcontainer extension entry.
- `docs/wiki/testing.md` — add a note that the suite is the authoritative
  test gate and pre-commit is the pre-commit hygiene gate (kept separate on
  purpose).
- Possibly a new `docs/wiki/tooling.md` if the additions are substantial
  enough; defer to the skill's judgement.

This is captured as a final, distinct task in the implementation plan.

## YAGNI / not introduced

- Prettier for Markdown or JavaScript.
- A wrapping `make lint` target (pre-commit's CLI is stable and the Makefile
  contract stays "test + postCreateCommand").
- A GitHub Actions workflow that runs `pre-commit run --all-files`.
- Stylistic ESLint rules (`quotes`, `semi`, `indent`, etc.) — would cause
  unrelated diff churn.
- A new CONTRIBUTING.md — README's Develop section is the existing home for
  developer docs.
