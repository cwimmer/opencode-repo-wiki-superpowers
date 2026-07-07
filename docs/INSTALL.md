# Installing repo-wiki-superpowers

An OpenCode plugin that ships two skills:
- `llm-wiki` — build/query/audit a Karpathy-style repo wiki under `docs/wiki/`.
- `wiki-context` — make Superpowers brainstorming use that wiki as memory.

## Prerequisites
- OpenCode installed.
- Superpowers (recommended, for the brainstorming bridge).

## Install (public, HTTPS — recommended)
Add both plugins to each repo's `opencode.json`, pinning this plugin to a tag:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "superpowers@git+https://github.com/obra/superpowers.git",
    "repo-wiki-superpowers@git+https://github.com/cwimmer/opencode-repo-wiki-superpowers.git#v0.1.0"
  ]
}
```

Restart OpenCode. Verify with the `skill` tool — you should see `llm-wiki` and
`wiki-context` listed. No SSH, no npm token, no shared home directory required —
works in isolated devcontainers.

## Use across multiple repos
Add the same two lines to each repo's `opencode.json`. Each repo keeps its own
`docs/wiki/`; there is no shared state. To upgrade every repo, bump the tag
(e.g. `#v0.2.0`).

## Build a wiki
In a repo with the plugin installed:

> Use the llm-wiki skill to build the wiki for this repo.

The wiki is generated under `docs/wiki/` and committed with your repo.

## Wiki-aware brainstorming
Add one line to your Superpowers brainstorming prompt:

    Use the Superpowers brainstorming skill for this task.
    Use the wiki-context skill for this task.

### Optional: make it automatic per repo
Add an `AGENTS.md` note so brainstorming always consults the wiki in that repo:

```markdown
# Wiki-aware brainstorming
When brainstorming/designing in this repo, also use the `wiki-context` skill:
read `docs/wiki/README.md` first, follow each page's Source map back to source,
treat source and tests as the higher authority, and include "Wiki context used"
and "Source-grounding notes" in the design.
```

## Updating
OpenCode installs the plugin from the pinned git tag. To pick up a new version,
change the tag in `opencode.json` and restart. If an update does not appear,
clear OpenCode's cache: `rm -rf ~/.cache/opencode` and restart.

## Private-repo fallback (not the default)
If you keep the plugin repo private, HTTPS needs a credential. Prefer keeping it
public. If you must go private, use SSH (requires SSH auth inside the
devcontainer):

```
repo-wiki-superpowers@git+ssh://git@github.com/cwimmer/opencode-repo-wiki-superpowers.git#v0.1.0
```

## Local development / dogfooding
This repo loads its own plugin locally via
`.opencode/plugins/repo-wiki-superpowers.js` (a re-export of
`plugins/repo-wiki-superpowers.js`), so edits take effect without installing from
GitHub. Run the tests with `make test`.
