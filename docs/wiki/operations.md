---
title: Operations
type: operations
updated: 2026-07-07
confidence: high
---

# Operations

Build, install, distribute, upgrade.

## Build

There is no build step. The plugin is plain ESM and ships as-is:

- `package.json` declares `"type": "module"` and points `main` at
  `plugins/repo-wiki-superpowers.js`.
- Skills are plain markdown with YAML frontmatter (no compile step).
- Tests use `bun test` against the source directly.

What you do need once in a fresh environment:

```
make postCreateCommand   # installs bun globally (npm install -g bun)
```

If you do not want the global install, you can run the test target by
calling `bun test` from `plugins/` directly, but the repo's only
documented entry point is `make test`.

## Test

```
make test
```

Equivalent to `bun test` in `plugins/`. See [testing](testing.md) for what each block
asserts.

## Install (into a consuming repo)

Add the plugin to a repo's `opencode.json` alongside `superpowers`, pinning
to a tag (per design spec §9 and `docs/INSTALL.md`):

```jsonc
{
  "plugin": [
    "superpowers@git+https://github.com/obra/superpowers.git",
    "repo-wiki-superpowers@git+https://github.com/cwimmer/opencode-repo-wiki-superpowers.git#v0.1.0"
  ]
}
```

Restart OpenCode. Verify with the `skill` tool — `llm-wiki` and
`wiki-context` should be listed. No SSH, no npm token, no shared home
directory required; works in isolated devcontainers ([integrations](integrations.md)).

## Develop / dogfood locally

This repo loads its own plugin locally via
`.opencode/plugins/repo-wiki-superpowers.js`, a one-line re-export of
`plugins/repo-wiki-superpowers.js`. Edits under `plugins/` therefore take
effect without installing from GitHub. `make test` runs the same `bun test`
suite either way. `docs/INSTALL.md` documents this in the "Local
development / dogfooding" section.

## Upgrade

OpenCode installs the plugin from the pinned git tag. To pick up a new
version:

1. Push a new tag to GitHub (e.g. `v0.2.0`).
2. Bump the tag in every consuming repo's `opencode.json`
   (`…#v0.1.0` → `…#v0.2.0`).
3. Restart OpenCode.

If an upgrade does not appear after restart, clear OpenCode's cache and
restart:

```
rm -rf ~/.cache/opencode
```

(This is documented in `docs/INSTALL.md` under "Updating".)

## Release (cutting a tag)

The public install spec resolves only after the tag exists on GitHub.
To cut `v0.1.0` (or a follow-up) when ready to publish:

```bash
git tag v0.1.0
git push origin HEAD --tags
```

For follow-ups, repeat with `v0.2.0` etc.

## Source map
- `Makefile` — `postCreateCommand` and `test` targets.
- `plugins/Makefile` — `test` → `bun test`.
- `package.json` — plugin manifest; `main` field for OpenCode.
- `docs/INSTALL.md` — install (public + private-fallback), upgrade,
  cache-clearing tip, local dogfood note.
- `README.md` — short install snippet and develop/test pointer.
- `docs/superpowers/specs/2026-07-07-repo-wiki-superpowers-design.md`
  §9 — distribution model; §10 — validation.
- `.devcontainer/devcontainer.json` — `postCreateCommand: make postCreateCommand`.

## Confidence / gaps
- Solid: build (none needed), test entry point, install snippet and the
  flow it triggers, upgrade flow, tag-cut commands.
- Uncertain / to verify: whether `v0.1.0` has been pushed on GitHub —
  required to resolve the documented install spec; see [open-questions](open-questions.md).
