---
title: Architecture
type: architecture
updated: 2026-07-07
confidence: high
---

# Architecture

The plugin is intentionally tiny: a single `config` hook that registers
`skills/` with OpenCode. Everything else — wiki reading/writing/auditing and
brainstorming-memory behavior — lives in the skills' markdown and runs
through OpenCode's built-in `read` / `write` / `edit` / `bash` / `webfetch`
tools. There is no other plugin logic and no network, no `os.homedir()`, and
no `~/.config/opencode` writes.

## Data flow (per session in a consuming repo)

1. OpenCode boots, loads plugins listed in `opencode.json`.
2. For each plugin, OpenCode calls the exported function and registers any
   `config` hook.
3. This plugin's `config` hook pushes `<pkg>/skills` onto
   `config.skills.paths` ([repo-map](repo-map.md)).
4. OpenCode discovers `*/SKILL.md` files in those paths and exposes them
   through the native `skill` tool.
5. When the user (or another skill) invokes a skill — or when an LLM
   auto-selects one from its `description` — the skill body runs against the
   current repo using built-in tools.
6. Wiki data is **written** to that repo's `docs/wiki/` (committed); the
   plugin holds no per-repo state of its own.

`wiki-context` (the brainstorming bridge) is invoked *before* design
questions; it reads `docs/wiki/README.md`, then the load-bearing pages, and
treats source/tests as the higher authority.

## Components

### 1. Plugin — `plugins/repo-wiki-superpowers.js`

ESM module, single export `RepoWikiSuperpowersPlugin`:

```js
export const RepoWikiSuperpowersPlugin = async () => {
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

Properties:

- Resolves `skills` relative to the plugin file so it works both from the
  working tree and from `~/.cache/opencode/node_modules/<pkg>/`.
- No `os.homedir()`, no env reads, no network, no tools, no
  message-transform. Idempotent registration (the test asserts running the
  hook twice adds the path exactly once).

### 2. Dogfood shim — `.opencode/plugins/repo-wiki-superpowers.js`

```js
export { RepoWikiSuperpowersPlugin } from "../../plugins/repo-wiki-superpowers.js";
```

OpenCode auto-loads `.opencode/plugins/` of the *current* project, so editing
`plugins/repo-wiki-superpowers.js` takes effect locally without an install
cycle. Consuming repos never load this file (they would not have a local
`plugins/` tree).

### 3. Skill — `llm-wiki` (build / query / audit)

- **Initialize** (`docs/wiki/` missing): scaffold `README.md`,
  `repo-map.md`, `architecture.md`, `open-questions.md` from
  `references/page-templates.md`, each stubbed with `## Source map` and
  `## Confidence / gaps`.
- **Build / ingest**: read the codebase (or a path / URL / pasted text),
  create or update pages, cross-link via `[wiki-links](wiki-links.md)`, list source files
  per page, bump `updated:`.
- **Query**: read the index, open only relevant pages, cite pages + paths.
- **Audit / lint**: run `references/audit-checklist.md` (contradictions,
  orphans, missing pages, stale claims, code-drift, index integrity,
  frontmatter); report, do not silently rewrite.
- **Rules**: source/tests win; only write under `docs/wiki/`; commit wiki
  diffs separately; do not regenerate wholesale; stay model-agnostic.

### 4. Skill — `wiki-context` (Brainstorming memory bridge)

Composes with `superpowers:brainstorming`; does not replace or fork it.
Procedure:

1. If `docs/wiki/README.md` exists, read the index.
2. Read `repo-map.md`, `architecture.md`, `open-questions.md` when present;
   then only the task-relevant additional pages.
3. Follow each consulted page's `## Source map` back to real files and
   verify.
4. Source/tests are higher authority — flag stale or contradicted wiki
   claims.
5. Skip questions the wiki + source already answer.
6. Do **not** modify the wiki unless explicitly asked (delegate to
   `llm-wiki`).
7. Always append two sections to the design proposal
   (`references/proposal-sections.md`):
   - **Wiki context used** — which pages informed the design.
   - **Source-grounding notes** — split into
     *Confirmed-from-source*, *Inferred-from-source*, *Still-uncertain*.

### 5. Wiki layout and page schema

```
docs/wiki/
├── README.md          # index (read first)
├── repo-map.md        # directory + module map
├── architecture.md    # components, data flow, boundaries
├── open-questions.md  # known unknowns / decisions pending
├── overview.md        # what the project is / does        (optional)
├── configuration.md   # config, env, flags               (optional)
├── testing.md         # how tests run                     (optional)
├── domain-model.md    # core entities / concepts          (optional)
├── integrations.md    # external systems                  (optional)
├── operations.md      # build / run / deploy              (optional)
└── glossary.md        # terms                             (optional)
```

Every content page carries:

```markdown
---
title: <title>
type: <one of the listed types>
updated: 2026-07-07
confidence: high | medium | low
---

<body, with [wiki-links](wiki-links.md)>

## Source map
- `path/to/file` — what this page draws from it

## Confidence / gaps
- Solid: …
- Uncertain / to verify: …
```

YAGNI applies to optional pages: only create them when there is real
content. This wiki starts with the load-bearing four plus `overview.md`,
`testing.md`, `operations.md`, and `integrations.md` — every one of those
has real source content to draw from.

### 6. Distribution

Public GitHub repo, installed over HTTPS, pinned to a tag — the same
pattern Superpowers uses ([integrations](integrations.md), [operations](operations.md)). The design
spec's goals include (per §2):

- "Works inside **devcontainers** with isolated filesystems and **no shared
  global home directory**" — the plugin makes no `~/` or `~/.config/`
  writes and ships no daemon.
- "Usable across **at least three** separate repositories with one config
  line each" — each consuming repo's `docs/wiki/` is independent.

## Boundaries

- **In scope:** registering two skills; the skills' markdown-defined
  workflows against the consuming repo's files; tests for the plugin and
  skill frontmatter/reference existence; install documentation.
- **Out of scope:** custom OpenCode tools; message-transformation or
  per-session bootstrap injection; private-GitHub-SSH default install;
  changing obra/superpowers; agents/commands beyond the two skills
  ([open-questions](open-questions.md) lists the residual risks).

## Source map

- `plugins/repo-wiki-superpowers.js` — the plugin and its `config` hook.
- `.opencode/plugins/repo-wiki-superpowers.js` — local dogfood re-export.
- `package.json` — `main` entry the loader reads.
- `skills/llm-wiki/SKILL.md` and `references/{wiki-schema,page-templates,audit-checklist}.md` —
  `llm-wiki` body + schema/templates/audit.
- `skills/wiki-context/SKILL.md` and `references/proposal-sections.md` —
  `wiki-context` body + proposal-section templates.
- `docs/superpowers/specs/2026-07-07-repo-wiki-superpowers-design.md` —
  design spec, especially §5 (architecture), §6 (plugin), §7 (`llm-wiki`),
  §7.1 (`docs/wiki/` layout + schema), §8 (`wiki-context`), §9 (distribution).

## Confidence / gaps

- Solid: skill-only plugin shape; the two skills' responsibilities;
  registration mechanism (`config.skills.paths`); idempotency; bridge
  composes-with-brainstorming.
- Uncertain / to verify: the precise OpenCode internals of auto-selecting a
  skill from its `description` (best-effort per the design spec §12);
  whether a tagged `v0.1.0` exists on GitHub for installation.
