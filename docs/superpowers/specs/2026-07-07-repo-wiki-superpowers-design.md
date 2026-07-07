# Design: `repo-wiki-superpowers` OpenCode plugin

- Date: 2026-07-07
- Status: Approved (pre-implementation)
- Repo: `cwimmer/opencode-repo-wiki-superpowers`

## 1. Summary

An OpenCode plugin, installable from GitHub over HTTPS (exactly like the
Superpowers plugin), that integrates the **Karpathy LLM Wiki** documentation
workflow with the **obra/superpowers** development framework.

The plugin ships two skills and nothing else executable:

1. **`llm-wiki`** — build, query, and audit a Karpathy-style repo wiki
   (`docs/wiki/`) generated from the codebase.
2. **`wiki-context`** — a bridge that makes a Superpowers **Brainstorming**
   session consult that wiki as **memory** before it asks questions or proposes
   a design, while treating the wiki as a *map back to source, not as truth*.

Guiding principle (from the originating design conversation):
> The wiki gives Brainstorming memory; the source-map rule keeps it honest.

## 2. Goals

- Valid OpenCode plugin that OpenCode can load.
- Installable via an **HTTPS GitHub URL**, pinned to a tag, like Superpowers.
- Works inside **devcontainers** with isolated filesystems and **no shared
  global home directory**; depends on nothing outside the current repo unless a
  repo explicitly opts in.
- Usable across **at least three** separate repositories with one config line
  each.
- Repository-local configuration and data (`docs/wiki/`) over global machine
  state.
- Minimal and YAGNI.

## 3. Non-goals

- No documentation *site* generator.
- No syncing service or daemon.
- No custom OpenCode tools, no per-session bootstrap injection (skill-only).
- No private-GitHub-SSH default install path.
- No changes to obra/superpowers itself (compose, do not fork).
- No agents/commands or workflow automation beyond the two skills above.

## 4. Background

### 4.1 Karpathy LLM Wiki (the documentation workflow)

An AI-maintained markdown knowledge base. Layers: immutable **sources**, an
LLM-generated **wiki**, and a **schema** that defines structure and operations
(ingest / query / lint). Applied here to a **code repository**: the wiki
documents the repo itself, and every wiki page links back to real source files.

### 4.2 OpenCode plugin + skill mechanics (verified against Superpowers 6.1.1)

- A plugin is a JS/TS module exporting a function that returns hooks.
- Plugins can be loaded from a git-backed package spec in `opencode.json`:
  `"<pkgName>@git+https://github.com/<owner>/<repo>.git#<tag>"`, where
  `<pkgName>` must equal the `name` in the repo's root `package.json`, and
  OpenCode reads that package's `main` entry to find the plugin file.
- OpenCode also auto-loads local plugins from `.opencode/plugins/`.
- A plugin's **`config` hook** can append a directory to `config.skills.paths`;
  OpenCode then discovers `*/SKILL.md` there through the native `skill` tool.
  Superpowers uses exactly this to expose bundled skills with **no symlinks and
  no shared home directory** — the mechanism that makes this design
  devcontainer-safe.
- Skills are `SKILL.md` files with YAML frontmatter; recognized fields are
  `name`, `description`, `license`, `compatibility`, `metadata`. `name` must be
  `^[a-z0-9]+(-[a-z0-9]+)*$`, 1–64 chars, and match its directory.
  `description` must be 1–1024 chars.

## 5. Architecture

Skill-only plugin. The single line of behavior is: **register the bundled
`skills/` directory** so both skills appear in the `skill` tool in any repo that
installs the plugin. All wiki reading/writing/auditing and all
brainstorming-memory behavior lives in the skills' markdown and is executed by
the agent using OpenCode's built-in `read`/`write`/`edit`/`bash`/`webfetch`
tools.

Data (`docs/wiki/`) is **repo-local and committed** in each consuming repo. The
plugin holds no per-repo state and makes no global-filesystem assumptions.

### 5.1 Repository structure

```
opencode-repo-wiki-superpowers/
├── package.json                 # name: "repo-wiki-superpowers", type: "module",
│                                #   main: "plugins/repo-wiki-superpowers.js"
├── opencode.json                # existing; superpowers stays
├── Makefile                     # root: `test` -> $(MAKE) -C plugins test  (+ existing postCreateCommand)
├── plugins/
│   ├── Makefile                 # `test` -> bun test
│   ├── repo-wiki-superpowers.js         # the plugin (config hook only)
│   └── repo-wiki-superpowers.test.js    # bun test (validation)
├── .opencode/
│   └── plugins/
│       └── repo-wiki-superpowers.js     # 1-line re-export shim for LOCAL dogfood auto-load
├── skills/
│   ├── llm-wiki/
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── wiki-schema.md           # docs/wiki layout + page frontmatter + naming
│   │       ├── page-templates.md        # per-page-type templates (Source map + Confidence/gaps)
│   │       └── audit-checklist.md       # contradictions / orphans / stale / code-drift
│   └── wiki-context/
│       ├── SKILL.md
│       └── references/
│           └── proposal-sections.md     # "Wiki context used" + "Source-grounding notes" templates
└── docs/
    ├── INSTALL.md                       # multi-repo HTTPS install + optional AGENTS.md snippet + private fallback
    └── superpowers/specs/2026-07-07-repo-wiki-superpowers-design.md
```

Rationale for the `plugins/` directory: keeps plugin source, its Makefile, and
its test together, and lets the **root Makefile `test` target delegate** to
`plugins/Makefile`. OpenCode still loads the plugin because the **root**
`package.json` `main` points into `plugins/`. The `.opencode/plugins/` re-export
is only for dogfooding this repo locally (so local edits load without pulling
from GitHub); consuming repos never see it.

## 6. Component: the plugin

`plugins/repo-wiki-superpowers.js` (ESM):

```js
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const RepoWikiSuperpowersPlugin = async () => {
  // Resolves to <pkg>/skills both locally and inside ~/.cache/opencode/node_modules/<pkg>/
  const skillsDir = path.resolve(__dirname, "../skills");
  return {
    config: async (config) => {
      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];
      if (!config.skills.paths.includes(skillsDir)) {
        config.skills.paths.push(skillsDir);
      }
    },
  };
};
```

`.opencode/plugins/repo-wiki-superpowers.js` (local dogfood shim):

```js
export { RepoWikiSuperpowersPlugin } from "../../plugins/repo-wiki-superpowers.js";
```

Properties:

- No `os.homedir()`, no `process.env` home assumptions, no network, no tools,
  no message-transform. Registration is idempotent.
- When installed via `git+https`, OpenCode reads root `package.json` `main` and
  loads `plugins/repo-wiki-superpowers.js`; the `config` hook registers
  `<pkg>/skills`, exposing both skills through the `skill` tool in that repo.

## 7. Component: skill `llm-wiki` (build / query / audit the repo wiki)

Purpose: document the consuming repo's **codebase** as a Karpathy-style wiki
under repo-local `docs/wiki/`.

Frontmatter:

- `name: llm-wiki`
- `description`: names all three triggers so the agent can pick it, e.g.
  *"Use when creating, updating, querying, or auditing a repository's living
  documentation wiki (Karpathy LLM Wiki pattern) under docs/wiki/ — ingest
  code/docs into wiki pages that cite source, answer questions with citations,
  or check the wiki for drift."*

Body (checklist-driven):

- **Initialize**: if `docs/wiki/` is missing, scaffold `README.md` (index) plus
  the page set below, each stubbed with `Source map` and `Confidence / gaps`.
- **Build / ingest**: read the codebase (and any source given as a path, URL, or
  pasted text) → create/update wiki pages → maintain cross-links → update the
  `README.md` index. Each claim must trace to a file listed in the page's
  `Source map`.
- **Query**: read `README.md` → open only relevant pages → answer with citations
  to wiki pages and to source paths.
- **Audit / lint**: report contradictions, orphan pages, referenced-but-missing
  pages, stale claims, and **code-drift** (pages whose cited files changed since
  the page's `updated` date).
- **Commit** wiki changes as reviewable diffs. Do not rewrite the wiki wholesale
  unless explicitly asked.
- Model-agnostic: no model IDs are hard-coded.

`references/` holds the schema, page templates, and audit checklist so
`SKILL.md` stays lean.

### 7.1 `docs/wiki/` layout and page schema

Index + curated top-level pages (create pages only as they earn their keep):

```
docs/wiki/
├── README.md          # index / table of contents (read first)
├── repo-map.md        # directory + module map
├── architecture.md    # components, data flow, boundaries
├── open-questions.md  # known unknowns / decisions pending
├── overview.md        # what the project is / does           (optional)
├── configuration.md   # config, env, flags                   (optional)
├── testing.md         # how tests run, what they cover        (optional)
├── domain-model.md    # core entities / concepts              (optional)
├── integrations.md    # external systems                      (optional)
├── operations.md      # build/run/deploy                      (optional)
└── glossary.md        # terms                                 (optional)
```

Every page carries YAML frontmatter and two required sections:

```markdown
---
title: <page title>
type: overview | repo-map | architecture | domain | testing | ... 
updated: YYYY-MM-DD
confidence: high | medium | low
---

<page body with [[wiki-links]]>

## Source map
- `path/to/file.ts` — what this page draws from it
- `path/to/other` — ...

## Confidence / gaps
- Known-solid: ...
- Uncertain / needs verification: ...
```

`README.md` is the index brainstorming reads first. (An append-only `log.md`
operation log is intentionally omitted as YAGNI; git history is the audit
trail.)

## 8. Component: skill `wiki-context` (Brainstorming memory bridge)

Purpose: make a Superpowers Brainstorming/design session use `docs/wiki/` as
memory, grounded back to source. **Composes with** `superpowers:brainstorming`;
does not replace or fork it.

Frontmatter:

- `name: wiki-context`
- `description`: *"Use when brainstorming, planning, or designing changes in a
  repository that has a docs/wiki/ — load the wiki as project memory before
  asking questions or proposing a design, following each page's Source map back
  to source and treating source/tests as the higher authority."*

Body (checklist, run **before** design questions):

1. If `docs/wiki/README.md` exists, read it (index). If not, note the wiki is
   absent and fall back to normal Brainstorming context-gathering.
2. Read `repo-map.md`, `architecture.md`, `open-questions.md` when present, then
   only the additional pages relevant to the task.
3. Follow each consulted page's **Source map** back to real files and verify.
4. Treat **source code and tests as higher authority** than the wiki; explicitly
   flag any stale, incomplete, or contradicted wiki content.
5. Use the wiki to **avoid re-asking** questions the repo already answers.
6. Do **not** regenerate or rewrite the wiki unless explicitly asked.
7. Ensure the final design proposal includes two sections (templates in
   `references/proposal-sections.md`):
   - **Wiki context used** — which pages informed the design.
   - **Source-grounding notes** — split into *Confirmed-from-source*,
     *Inferred-from-source*, *Still-uncertain*.

### 8.1 How it is invoked (no fork, skill-only)

- **Prompt template**: add one line to the existing Superpowers brainstorming
  prompt: `Use the wiki-context skill for this task.` (alongside
  `Use the Superpowers brainstorming skill for this task.`).
- **Discovery**: because the plugin registers the skills path, the agent can
  also select `wiki-context` from its description when brainstorming in a repo
  that has a `docs/wiki/`.
- **Optional per-repo automation**: `INSTALL.md` documents an `AGENTS.md`
  snippet a consuming repo may add so wiki-aware brainstorming is automatic
  there. This is repo-local opt-in, shipped as documentation, not code.

## 9. Distribution and multi-repo install

Public GitHub repo, installed over HTTPS, pinned to a tag — same pattern as
Superpowers. Each consuming repo's `opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "superpowers@git+https://github.com/obra/superpowers.git",
    "repo-wiki-superpowers@git+https://github.com/cwimmer/opencode-repo-wiki-superpowers.git#v0.1.0"
  ]
}
```

- **No auth** for a public repo. No SSH keys, no npm publish, no `NPM_TOKEN`, no
  `~/.config/opencode` dependency → clean in devcontainers.
- **≥3 repos**: identical two lines per repo; each repo's `docs/wiki/` is
  independent. No shared state.
- **Upgrades**: bump the tag (`#v0.2.0`) across repos. (OpenCode/Bun may cache a
  resolved git dep; `INSTALL.md` documents clearing `~/.cache/opencode` if an
  update does not appear.)
- **Private-repo fallback** (documented, not default): `git+ssh://git@github.com/…`
  which requires SSH auth in the container. HTTPS public is the recommended path.

`package.json` (root):

```jsonc
{
  "name": "repo-wiki-superpowers",
  "version": "0.1.0",
  "type": "module",
  "main": "plugins/repo-wiki-superpowers.js"
}
```

## 10. Validation

`make test` → `$(MAKE) -C plugins test` → `bun test` on
`plugins/repo-wiki-superpowers.test.js`, asserting:

1. The module exports a plugin function; calling it returns hooks including a
   `config` function.
2. Running `config` on `{}` adds the resolved `skills/` path to
   `config.skills.paths`, and is **idempotent** (a second run adds no
   duplicate).
3. For **each** skill (`llm-wiki`, `wiki-context`): `SKILL.md` exists, its
   frontmatter `name` matches its directory, matches
   `^[a-z0-9]+(-[a-z0-9]+)*$`, and its `description` is 1–1024 chars.

Root `Makefile` keeps the existing `postCreateCommand` target and adds `test`.
`plugins/Makefile` provides `test: bun test`.

## 11. Success-criteria mapping

- *Valid loadable plugin* → §6 (config-hook plugin, root `main`).
- *HTTPS GitHub URL install* → §9 (`git+https`, tag-pinned).
- *Workflow discoverable from OpenCode/Superpowers* → §5/§7/§8 (both skills in
  the `skill` tool; `wiki-context` composes with brainstorming).
- *Works in devcontainer w/o external files* → §5/§6 (skill-only registration,
  repo-local `docs/wiki/`, no home-dir assumptions).
- *Docs for multi-repo install* → §9 + `docs/INSTALL.md`.
- *Tests/validation pass* → §10 (`make test`).
- *Small, reviewed before implementation* → this spec.

## 12. Risks and open questions

- **OpenCode git+https from a subdir-`main` package**: relies on root
  `package.json` `main` pointing to `plugins/…js`. Verified conceptually against
  the plugin docs (main can be any path in the package). Implementation will
  confirm the plugin loads from a tagged install.
- **Skill auto-selection vs explicit invocation**: `wiki-context` is most
  reliable when named in the prompt template; description-based auto-selection is
  best-effort. Documented accordingly.
- **Page set breadth**: the optional pages are YAGNI-gated; only `README.md`,
  `repo-map.md`, `architecture.md`, `open-questions.md` are load-bearing for the
  bridge.
```
