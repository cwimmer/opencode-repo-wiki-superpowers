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
