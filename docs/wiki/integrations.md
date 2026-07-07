---
title: Integrations
type: integrations
updated: 2026-07-07
confidence: high
---

# Integrations

This plugin's whole reason to exist is integration: it (a) loads into
OpenCode, and (b) bridges with `obra/superpowers`. Beyond that it touches no
external systems.

## OpenCode — the host platform

**Mechanism.** A plugin is a JS/TS module exporting a function that returns
hooks. OpenCode resolves `<pkg>@git+https://github.com/<owner>/<repo>.git#<tag>`,
reads the root `package.json` of the resolved package, follows its `main`
field, and loads that file. The plugin's `config` hook can mutate the
effective config; OpenCode applies the result before discovering skills.

This package's config in `package.json`:

```json
{ "name": "repo-wiki-superpowers", "type": "module", "main": "plugins/repo-wiki-superpowers.js" }
```

**Skill discovery.** OpenCode scans any directory listed in
`config.skills.paths` for `*/SKILL.md` files and exposes them through the
native `skill` tool. Our `config` hook appends
`path.resolve(__dirname, "../skills")` — i.e. `<pkg>/skills` — exactly the
mechanism Superpowers itself uses (§4 of the design spec).

**Local auto-load.** OpenCode also auto-loads `.opencode/plugins/` of the
current project. The dogfood shim
`.opencode/plugins/repo-wiki-superpowers.js` re-exports
`RepoWikiSuperpowersPlugin` so editing `plugins/repo-wiki-superpowers.js`
takes effect in this repo without re-installing from GitHub.

## Superpowers — `superpowers:brainstorming`

The design goal is **composition, not fork** (§3, §8.1). The plugin does not
modify obra/superpowers; it relies on the existing
`superpowers:brainstorming` skill and adds **one line** to its prompt
template, per `docs/INSTALL.md`:

```
Use the Superpowers brainstorming skill for this task.
Use the wiki-context skill for this task.
```

`wiki-context` runs **before** design questions and is documented to compose
with the host `brainstorming` skill. It also exposes two design-proposal
sections (`Wiki context used` and `Source-grounding notes`) defined in
`skills/wiki-context/references/proposal-sections.md`.

Optional per-repo automation is documented in `docs/INSTALL.md` as an
`AGENTS.md` snippet a consuming repo can add so wiki-aware brainstorming is
automatic there. This is repo-local opt-in via documentation, not code
inside the plugin.

## GitHub — distribution channel

- **Public install spec (recommended, no auth):**
  `repo-wiki-superpowers@git+https://github.com/cwimmer/opencode-repo-wiki-superpowers.git#v0.1.0`
  — referenced verbatim by `README.md`, `docs/INSTALL.md`, and the test
  suite (`plugins/repo-wiki-superpowers.test.js`).
- **Private/SHM-fallback:** the SSH form
  `git+ssh://git@github.com/cwimmer/opencode-repo-wiki-superpowers.git#v0.1.0`
  is documented in `docs/INSTALL.md` but is **not** the default; it
  requires SSH auth inside the devcontainer.
- **Upgrades:** bump the tag (`#v0.2.0` etc.) in each consuming repo's
  `opencode.json` and restart OpenCode. If an upgrade doesn't appear,
  clear `~/.cache/opencode` and restart — also documented in
  `docs/INSTALL.md`.

## Devcontainer — local glue

`.devcontainer/devcontainer.json` pins the image, mounts an `opencode-data`
volume, and sets `postCreateCommand: make postCreateCommand` so `npm install
-g bun` runs once at container creation. Root `Makefile`'s `postCreateCommand`
target is responsible for that install; `plugins/Makefile`'s `test` target
runs `bun test`.

## Source map

- `package.json` — plugin `name`, `type`, `main` (OpenCode loader contract).
- `plugins/repo-wiki-superpowers.js` — `config` hook uses
  `config.skills.paths`.
- `.opencode/plugins/repo-wiki-superpowers.js` — dogfood shim
  (`re-export only`).
- `opencode.json` — repo-local OpenCode config; declares the `superpowers`
  plugin (this plugin is loaded via the dogfood shim, not via this file).
- `docs/INSTALL.md` — public HTTPS install spec, private/SHM fallback,
  prompt template line, optional `AGENTS.md` snippet, cache-clearing tip.
- `skills/wiki-context/SKILL.md` and
  `skills/wiki-context/references/proposal-sections.md` — bridge definition
  and design proposal sections.
- `.devcontainer/devcontainer.json` — image, mount,
  `postCreateCommand: make postCreateCommand`.
- `Makefile` — `postCreateCommand` target that installs `bun`.

## Confidence / gaps

- Solid: integration surface is exactly OpenCode + Superpowers + GitHub;
  HTTPS-public is the documented default; one prompt-template line is the
  full bridge; `wiki-context` composes with the host `brainstorming` skill.
- Uncertain / to verify: nothing material about the integration surface;
  see [open-questions](open-questions.md) for residual risks (tag presence, OpenCode
  auto-selection semantics).
