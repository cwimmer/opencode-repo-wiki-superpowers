# repo-wiki-superpowers

An OpenCode plugin that integrates the **Karpathy LLM Wiki** documentation
workflow with **obra/superpowers**.

It ships two skills:

- **`llm-wiki`** — build, query, and audit a repo documentation wiki under
  `docs/wiki/` (each page cites its source files).
- **`wiki-context`** — make a Superpowers *brainstorming* session use that wiki
  as memory, grounded back to source.

> The wiki gives Brainstorming memory; the source-map rule keeps it honest.

## Install

See [docs/INSTALL.md](docs/INSTALL.md). Short version — add to each repo's
`opencode.json`:

```jsonc
{
  "plugin": [
    "superpowers@git+https://github.com/obra/superpowers.git",
    "repo-wiki-superpowers@git+https://github.com/cwimmer/opencode-repo-wiki-superpowers.git#v0.1.0"
  ]
}
```

## Develop

- `make test` — run the plugin test suite (bun is installed by
  `make postCreateCommand`).
- Skills live in `skills/`; the plugin is `plugins/repo-wiki-superpowers.js`.
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

`docs/INSTALL.md` is unchanged for content (it documents consumer install,
not developer ergonomics); markdownlint-cli2 may add blank lines around
headings/lists there on a future run, which is mechanical and unrelated to
the install spec.
