# repo-wiki-superpowers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a skill-only OpenCode plugin, installable over HTTPS from GitHub, that ships an `llm-wiki` skill (build/query/audit a Karpathy-style repo wiki) and a `wiki-context` skill (make Superpowers brainstorming use that wiki as source-grounded memory).

**Architecture:** A ~20-line plugin whose `config` hook appends the bundled `skills/` directory to `config.skills.paths` (the exact mechanism Superpowers uses), so both skills appear in OpenCode's native `skill` tool in any repo that installs the plugin. All wiki/brainstorming behavior lives in the skills' markdown and runs via OpenCode's built-in tools. Wiki data is repo-local under `docs/wiki/`. Validation is `bun test`, run through `make test`; the devcontainer installs bun in `make postCreateCommand`.

**Tech Stack:** Node ESM, OpenCode plugin API, `bun test`, GNU Make, git.

## Global Constraints

Copy these values verbatim; every task inherits them.

- Package `name`: `repo-wiki-superpowers` (must equal the plugin-spec left side in `opencode.json`).
- Plugin `main`: `plugins/repo-wiki-superpowers.js` (ESM; `"type": "module"`).
- Plugin export name: `RepoWikiSuperpowersPlugin`.
- Skills: `llm-wiki` and `wiki-context`. Each skill `name` MUST equal its directory name, match `^[a-z0-9]+(-[a-z0-9]+)*$` (≤64 chars), and have a `description` of 1–1024 chars.
- Wiki data path (in consuming repos): `docs/wiki/` — repo-local, committed.
- Public install spec (documented, used in the INSTALL test): `repo-wiki-superpowers@git+https://github.com/cwimmer/opencode-repo-wiki-superpowers.git#v0.1.0`
- Skill-only: NO custom tools, NO message-transform/bootstrap injection. The plugin's only behavior is registering the skills path (idempotently).
- No dependence on `~/.config/opencode`, `$HOME`, or any global filesystem state.
- Test runner: `bun test`. Bun is installed by `make postCreateCommand` via `npm install -g bun` (lands at `/usr/bin/bun`, on PATH).
- Makefile recipe lines MUST be indented with a literal TAB, not spaces.
- YAGNI: only four wiki pages are load-bearing (`README.md`, `repo-map.md`, `architecture.md`, `open-questions.md`); optional pages are created only when there is real content.

## Reference: final layout produced by this plan

```
opencode-repo-wiki-superpowers/
├── package.json
├── README.md
├── opencode.json                         # unchanged (keeps superpowers)
├── Makefile                              # modified: adds test + bun install
├── plugins/
│   ├── Makefile
│   ├── repo-wiki-superpowers.js
│   └── repo-wiki-superpowers.test.js
├── .opencode/plugins/repo-wiki-superpowers.js   # dogfood re-export shim
├── skills/
│   ├── llm-wiki/
│   │   ├── SKILL.md
│   │   └── references/{wiki-schema.md,page-templates.md,audit-checklist.md}
│   └── wiki-context/
│       ├── SKILL.md
│       └── references/proposal-sections.md
└── docs/
    ├── INSTALL.md
    └── superpowers/{specs,plans}/…
```

---

### Task 1: Toolchain + plugin core

**Files:**
- Create: `package.json`
- Create: `Makefile` (replaces the current 5-line stub)
- Create: `plugins/Makefile`
- Create: `plugins/repo-wiki-superpowers.js`
- Test: `plugins/repo-wiki-superpowers.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `export const RepoWikiSuperpowersPlugin = async () => ({ config })` where `config(config)` pushes `path.resolve(<plugin dir>, "../skills")` onto `config.skills.paths` idempotently. Test helpers `readFrontmatter(name)`, `expectValidSkill(name)`, `expectNonEmpty(relPath)`, and the constants `root`/`skillsDir` are defined in the test file and reused by later tasks.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "repo-wiki-superpowers",
  "version": "0.1.0",
  "description": "OpenCode plugin: Karpathy LLM Wiki workflow + Superpowers brainstorming memory bridge",
  "type": "module",
  "main": "plugins/repo-wiki-superpowers.js"
}
```

- [ ] **Step 2: Create the root `Makefile`** (indent recipe lines with a TAB)

```makefile
.PHONY: postCreateCommand test

postCreateCommand:
	@echo "Running post create command"
	@echo "Installing bun"
	npm install -g bun
	@echo "Post create command completed"

test:
	$(MAKE) -C plugins test
```

- [ ] **Step 3: Create `plugins/Makefile`** (indent recipe lines with a TAB)

```makefile
.PHONY: test

test:
	bun test
```

- [ ] **Step 4: Install bun via the postCreateCommand target**

Run: `make postCreateCommand`
Expected: ends with `Post create command completed`; then `bun --version` prints a version (e.g. `1.3.14`).
Verify: `bun --version`

- [ ] **Step 5: Write the failing test** — create `plugins/repo-wiki-superpowers.test.js`

```js
import { describe, expect, test } from "bun:test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { RepoWikiSuperpowersPlugin } from "./repo-wiki-superpowers.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const skillsDir = path.resolve(root, "skills");

const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function readFrontmatter(skillName) {
  const p = path.join(skillsDir, skillName, "SKILL.md");
  const content = fs.readFileSync(p, "utf8");
  const m = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) throw new Error(`missing frontmatter: ${p}`);
  const fm = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) {
      fm[line.slice(0, i).trim()] = line
        .slice(i + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
    }
  }
  return fm;
}

function expectValidSkill(name) {
  const fm = readFrontmatter(name);
  expect(fm.name).toBe(name);
  expect(NAME_RE.test(fm.name)).toBe(true);
  expect(fm.name.length).toBeLessThanOrEqual(64);
  expect(typeof fm.description).toBe("string");
  expect(fm.description.length).toBeGreaterThanOrEqual(1);
  expect(fm.description.length).toBeLessThanOrEqual(1024);
}

function expectNonEmpty(relPath) {
  const p = path.join(root, relPath);
  expect(fs.existsSync(p)).toBe(true);
  expect(fs.statSync(p).size).toBeGreaterThan(0);
}

describe("plugin registration", () => {
  test("exports a plugin function returning a config hook", async () => {
    expect(typeof RepoWikiSuperpowersPlugin).toBe("function");
    const hooks = await RepoWikiSuperpowersPlugin({});
    expect(typeof hooks.config).toBe("function");
  });

  test("config hook registers the bundled skills path", async () => {
    const hooks = await RepoWikiSuperpowersPlugin({});
    const config = {};
    await hooks.config(config);
    expect(config.skills.paths).toContain(skillsDir);
  });

  test("config hook is idempotent", async () => {
    const hooks = await RepoWikiSuperpowersPlugin({});
    const config = {};
    await hooks.config(config);
    await hooks.config(config);
    expect(config.skills.paths.filter((p) => p === skillsDir).length).toBe(1);
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `make test`
Expected: FAIL — bun cannot resolve `./repo-wiki-superpowers.js` (module not found).

- [ ] **Step 7: Implement the plugin** — create `plugins/repo-wiki-superpowers.js`

```js
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * repo-wiki-superpowers OpenCode plugin.
 *
 * Skill-only: registers the bundled skills/ directory so `llm-wiki` and
 * `wiki-context` are discoverable via the native `skill` tool in any repo that
 * installs this plugin. No tools, no message injection, no global-filesystem or
 * home-directory assumptions — safe in isolated devcontainers.
 */
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

- [ ] **Step 8: Run the test to verify it passes**

Run: `make test`
Expected: PASS — `3 pass`, `0 fail`.

- [ ] **Step 9: Commit**

```bash
git add package.json Makefile plugins/Makefile plugins/repo-wiki-superpowers.js plugins/repo-wiki-superpowers.test.js
git commit -m "feat: plugin core registers bundled skills path + toolchain"
```

---

### Task 2: Local dogfood shim

**Files:**
- Create: `.opencode/plugins/repo-wiki-superpowers.js`
- Test: `plugins/repo-wiki-superpowers.test.js` (append one `describe` block)

**Interfaces:**
- Consumes: `RepoWikiSuperpowersPlugin` from `plugins/repo-wiki-superpowers.js`.
- Produces: `.opencode/plugins/repo-wiki-superpowers.js` re-exporting the same symbol, so OpenCode auto-loads the plugin when THIS repo is opened locally.

- [ ] **Step 1: Write the failing test** — append this block to the END of `plugins/repo-wiki-superpowers.test.js`

```js
describe("dogfood shim", () => {
  test("re-exports a working plugin", async () => {
    const mod = await import("../.opencode/plugins/repo-wiki-superpowers.js");
    expect(typeof mod.RepoWikiSuperpowersPlugin).toBe("function");
    const hooks = await mod.RepoWikiSuperpowersPlugin({});
    const config = {};
    await hooks.config(config);
    expect(config.skills.paths).toContain(skillsDir);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `make test`
Expected: FAIL — cannot resolve `../.opencode/plugins/repo-wiki-superpowers.js`.

- [ ] **Step 3: Create the shim** — `.opencode/plugins/repo-wiki-superpowers.js`

```js
// Local dogfood loader: OpenCode auto-loads plugins from .opencode/plugins/.
// Re-export the real plugin so edits under plugins/ take effect without
// installing from GitHub. Consuming repos never load this file.
export { RepoWikiSuperpowersPlugin } from "../../plugins/repo-wiki-superpowers.js";
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `make test`
Expected: PASS — `4 pass`, `0 fail`.

- [ ] **Step 5: Commit**

```bash
git add .opencode/plugins/repo-wiki-superpowers.js plugins/repo-wiki-superpowers.test.js
git commit -m "feat: add local dogfood plugin shim"
```

---

### Task 3: `llm-wiki` skill (build / query / audit)

**Files:**
- Create: `skills/llm-wiki/SKILL.md`
- Create: `skills/llm-wiki/references/wiki-schema.md`
- Create: `skills/llm-wiki/references/page-templates.md`
- Create: `skills/llm-wiki/references/audit-checklist.md`
- Test: `plugins/repo-wiki-superpowers.test.js` (append one `describe` block)

**Interfaces:**
- Consumes: `expectValidSkill`, `expectNonEmpty` (from Task 1).
- Produces: a discoverable skill named `llm-wiki` with valid frontmatter and three non-empty reference files.

- [ ] **Step 1: Write the failing test** — append to the END of `plugins/repo-wiki-superpowers.test.js`

```js
describe("llm-wiki skill", () => {
  test("has valid frontmatter", () => {
    expectValidSkill("llm-wiki");
  });
  test("ships its reference files", () => {
    expectNonEmpty("skills/llm-wiki/references/wiki-schema.md");
    expectNonEmpty("skills/llm-wiki/references/page-templates.md");
    expectNonEmpty("skills/llm-wiki/references/audit-checklist.md");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `make test`
Expected: FAIL — `readFrontmatter` throws ENOENT for `skills/llm-wiki/SKILL.md`.

- [ ] **Step 3: Create `skills/llm-wiki/SKILL.md`**

```markdown
---
name: llm-wiki
description: Use when creating, updating, querying, or auditing a repository's living documentation wiki (Karpathy LLM Wiki pattern) under docs/wiki/ — ingest code and docs into wiki pages that cite their source files, answer questions from the wiki with citations, or audit the wiki for drift and gaps.
---

# LLM Wiki (repo documentation)

Maintain a Karpathy-style **repo wiki** under `docs/wiki/`: LLM-generated
markdown that documents THIS repository's codebase. Every page cites the real
source files it was built from, so the wiki stays a **map back to source, not a
replacement for it**.

References (read as needed):
- `references/wiki-schema.md` — layout, frontmatter, required sections.
- `references/page-templates.md` — per-page templates.
- `references/audit-checklist.md` — audit rules.

## When to use
- "Build/generate the wiki for this repo"
- "Update the wiki for the changes I just made"
- "What does the wiki say about X?" (query)
- "Audit/lint the wiki"

## Operations

### Initialize (first run)
If `docs/wiki/` does not exist, scaffold it:
1. Create `docs/wiki/README.md` (the index).
2. Create the load-bearing pages: `repo-map.md`, `architecture.md`,
   `open-questions.md`. Add optional pages only when there is content for them.
3. Start every page from `references/page-templates.md`, including the required
   `## Source map` and `## Confidence / gaps` sections.

### Build / ingest
The source may be the codebase itself (default), a specific path, a URL, or
pasted text.
1. Read the source. For code, trace the files/modules in scope.
2. Create or update the relevant wiki pages (see `references/wiki-schema.md`).
3. In each page's `## Source map`, list every source file it draws from, one
   line each.
4. In `## Confidence / gaps`, record what is solid vs. inferred/uncertain.
5. Maintain `[[wiki-links]]` between related pages.
6. Update `docs/wiki/README.md` so the index lists every page.
7. Set each touched page's `updated:` frontmatter to today's date.
8. Never invent behavior. If the source does not show it, say so under
   `## Confidence / gaps`.

### Query
1. Read `docs/wiki/README.md` to find relevant pages.
2. Open only those pages; synthesize an answer.
3. Cite the wiki pages AND the underlying source paths.
4. If the wiki looks stale or thin for the question, say so and read source.

### Audit / lint
Follow `references/audit-checklist.md`. Report (do not silently fix):
contradictions, orphan pages, referenced-but-missing pages, stale claims, and
**code-drift** (a page whose cited source files changed after the page's
`updated:` date). Offer to fix what you find.

## Rules
- Source code and tests are the higher authority; the wiki serves them.
- During a wiki operation, only write under `docs/wiki/` (unless the user
  explicitly asks you to change code).
- Commit wiki changes as their own reviewable diffs.
- Do not regenerate the whole wiki unless explicitly asked.
- Stay model-agnostic.

## Relationship to Superpowers
This skill maintains the memory that the `wiki-context` skill feeds into
Superpowers brainstorming. For large restructures of the wiki itself, consider
`superpowers:brainstorming` first.
```

- [ ] **Step 4: Create `skills/llm-wiki/references/wiki-schema.md`**

```markdown
# Wiki schema

Repo-local, committed knowledge base under `docs/wiki/`.

## Layout

    docs/wiki/
    ├── README.md          # index / table of contents (read first)
    ├── repo-map.md        # directory + module map
    ├── architecture.md    # components, data flow, boundaries
    ├── open-questions.md  # known unknowns / decisions pending
    ├── overview.md        # what the project is / does           (optional)
    ├── configuration.md   # config, env vars, flags              (optional)
    ├── testing.md         # how tests run, what they cover        (optional)
    ├── domain-model.md    # core entities / concepts             (optional)
    ├── integrations.md    # external systems                     (optional)
    ├── operations.md      # build / run / deploy                 (optional)
    └── glossary.md        # terms                                (optional)

Create the four load-bearing pages on init. Add optional pages only when there
is real content for them (YAGNI).

## Page frontmatter

Every content page begins with:

    ---
    title: <human title>
    type: overview | repo-map | architecture | domain | testing | configuration | integrations | operations | glossary | open-questions
    updated: YYYY-MM-DD
    confidence: high | medium | low
    ---

## Required sections

Every content page ends with:

    ## Source map
    - `path/to/file` — what this page draws from it

    ## Confidence / gaps
    - Solid: ...
    - Uncertain / to verify: ...

## Naming and links
- Filenames: kebab-case (`repo-map.md`).
- Internal links: `[[page-name]]` (omit the `.md`).
- Source references: always a repo-relative path in the Source map.
```

- [ ] **Step 5: Create `skills/llm-wiki/references/page-templates.md`**

```markdown
# Page templates

Copy the matching template. Fill every section. Keep Source map and
Confidence / gaps honest.

## README.md (index)

    # <Repo> Wiki

    LLM-maintained documentation for this repository. The source of truth is the
    code; each page's **Source map** links back to it.

    ## Pages
    - [[repo-map]] — directory and module map
    - [[architecture]] — components and data flow
    - [[open-questions]] — open questions and pending decisions
    <!-- add optional pages here as they are created -->

    _Updated: YYYY-MM-DD_

## Standard content page

    ---
    title: <title>
    type: <type>
    updated: YYYY-MM-DD
    confidence: high | medium | low
    ---

    # <title>

    <body, using [[links]] to related pages>

    ## Source map
    - `path/to/file` — <what this page draws from it>

    ## Confidence / gaps
    - Solid: <claims verified against source>
    - Uncertain / to verify: <inferences, TODOs>

## repo-map.md

    ---
    title: Repo Map
    type: repo-map
    updated: YYYY-MM-DD
    confidence: high | medium | low
    ---

    # Repo Map

    | Path | Purpose |
    | ---- | ------- |
    | `dir/` | <one line> |

    ## Source map
    - `<dir>/` — <what lives here>

    ## Confidence / gaps
    - Solid: ...
    - Uncertain / to verify: ...
```

- [ ] **Step 6: Create `skills/llm-wiki/references/audit-checklist.md`**

```markdown
# Audit checklist

Run these checks and report findings (with page + line references). Offer fixes;
do not silently rewrite.

1. **Contradictions** — claims that conflict across pages.
2. **Orphan pages** — pages with no incoming `[[link]]` and absent from the
   README index.
3. **Missing pages** — `[[links]]` or references to pages that do not exist.
4. **Stale claims** — statements the current source no longer supports.
5. **Code-drift** — for each page, compare the git history / mtimes of the files
   in its `## Source map` against the page's `updated:` date; flag pages whose
   sources changed later.
6. **Index integrity** — every page appears in `README.md`; no dead index entries.
7. **Frontmatter** — every content page has `title`, `type`, `updated`,
   `confidence`, plus `## Source map` and `## Confidence / gaps`.

Write findings as a short report in the chat. If asked to fix, update pages and
bump their `updated:` dates.
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `make test`
Expected: PASS — `6 pass`, `0 fail`.

- [ ] **Step 8: Commit**

```bash
git add skills/llm-wiki plugins/repo-wiki-superpowers.test.js
git commit -m "feat: add llm-wiki skill (build/query/audit repo wiki)"
```

---

### Task 4: `wiki-context` skill (Brainstorming memory bridge)

**Files:**
- Create: `skills/wiki-context/SKILL.md`
- Create: `skills/wiki-context/references/proposal-sections.md`
- Test: `plugins/repo-wiki-superpowers.test.js` (append one `describe` block)

**Interfaces:**
- Consumes: `expectValidSkill`, `expectNonEmpty` (from Task 1).
- Produces: a discoverable skill named `wiki-context` with valid frontmatter and one non-empty reference file.

- [ ] **Step 1: Write the failing test** — append to the END of `plugins/repo-wiki-superpowers.test.js`

```js
describe("wiki-context skill", () => {
  test("has valid frontmatter", () => {
    expectValidSkill("wiki-context");
  });
  test("ships its reference file", () => {
    expectNonEmpty("skills/wiki-context/references/proposal-sections.md");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `make test`
Expected: FAIL — `readFrontmatter` throws ENOENT for `skills/wiki-context/SKILL.md`.

- [ ] **Step 3: Create `skills/wiki-context/SKILL.md`**

```markdown
---
name: wiki-context
description: Use when brainstorming, planning, or designing changes in a repository that has a docs/wiki/ — load the wiki as project memory before asking questions or proposing a design, following each page's Source map back to source and treating source and tests as the higher authority.
---

# Wiki context (Brainstorming memory)

Give a Superpowers **brainstorming/design** session memory by consulting the
repo wiki under `docs/wiki/` BEFORE asking questions or proposing a design —
while treating the wiki as a **map back to source, not as truth**.

> The wiki gives Brainstorming memory; the source-map rule keeps it honest.

This skill **composes with** `superpowers:brainstorming`; it does not replace or
fork it. Use both together.

## When to use
At the very start of any brainstorming, planning, or design task in a repo that
has `docs/wiki/` — before the first clarifying question.

## Procedure (before design questions)
1. **Check for the wiki.** If `docs/wiki/README.md` exists, read it (the index).
   If it does NOT exist, note that and fall back to normal Superpowers
   context-gathering (files, docs, tests, recent commits); stop this procedure.
2. **Read the load-bearing pages** when present: `repo-map.md`,
   `architecture.md`, `open-questions.md`.
3. **Read only task-relevant additional pages** (use the README index to pick).
4. **Ground back to source.** For any wiki claim you will rely on, follow that
   page's `## Source map` to the real files and verify.
5. **Source and tests win.** Treat source code and tests as higher authority
   than the wiki. Explicitly flag wiki content that is stale, incomplete, or
   contradicted by the source.
6. **Do not re-ask what the repo answers.** Skip clarifying questions the wiki +
   source already answer; ask only genuine gaps.
7. **Do not modify the wiki** unless explicitly asked (use the `llm-wiki` skill
   for that).

## Design proposal additions
When you present the design, include the two sections from
`references/proposal-sections.md`:
- **Wiki context used** — which wiki pages informed the design.
- **Source-grounding notes** — split into *Confirmed-from-source*,
  *Inferred-from-source*, *Still-uncertain*.

## Wiring it into your prompt
Add one line to your Superpowers brainstorming prompt, next to
"Use the Superpowers brainstorming skill for this task.":

    Use the wiki-context skill for this task.

A repo may also add an `AGENTS.md` note to make this automatic (see the plugin's
`docs/INSTALL.md`).
```

- [ ] **Step 4: Create `skills/wiki-context/references/proposal-sections.md`**

```markdown
# Proposal sections (paste into the design)

## Wiki context used
- [[page-name]] — how it informed the design
- (list every wiki page you actually relied on; write "none" if the wiki was
  absent)

## Source-grounding notes
- **Confirmed-from-source:** claims you verified by reading the cited files
  (list file paths).
- **Inferred-from-source:** reasonable inferences not directly stated in source.
- **Still-uncertain:** open questions the source/wiki did not resolve.
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `make test`
Expected: PASS — `8 pass`, `0 fail`.

- [ ] **Step 6: Commit**

```bash
git add skills/wiki-context plugins/repo-wiki-superpowers.test.js
git commit -m "feat: add wiki-context skill (brainstorming memory bridge)"
```

---

### Task 5: Install docs + README

**Files:**
- Create: `docs/INSTALL.md`
- Create: `README.md`
- Test: `plugins/repo-wiki-superpowers.test.js` (append one `describe` block)

**Interfaces:**
- Consumes: `root`, `fs`, `path` (from Task 1).
- Produces: `docs/INSTALL.md` containing the exact public install spec; a root `README.md`.

- [ ] **Step 1: Write the failing test** — append to the END of `plugins/repo-wiki-superpowers.test.js`

```js
describe("install docs", () => {
  test("INSTALL.md documents the git+https install spec", () => {
    const txt = fs.readFileSync(path.join(root, "docs/INSTALL.md"), "utf8");
    expect(txt).toContain(
      "repo-wiki-superpowers@git+https://github.com/cwimmer/opencode-repo-wiki-superpowers.git"
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `make test`
Expected: FAIL — ENOENT for `docs/INSTALL.md`.

- [ ] **Step 3: Create `docs/INSTALL.md`**

````markdown
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
````

- [ ] **Step 4: Create `README.md`**

````markdown
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
````

- [ ] **Step 5: Run the test to verify it passes**

Run: `make test`
Expected: PASS — `9 pass`, `0 fail`.

- [ ] **Step 6: Commit**

```bash
git add docs/INSTALL.md README.md plugins/repo-wiki-superpowers.test.js
git commit -m "docs: add INSTALL guide and README"
```

---

### Task 6: Full verification + release readiness

**Files:**
- No new source. Verification + optional local dogfood + release notes.

**Interfaces:**
- Consumes: everything above.
- Produces: a green `make test` run and documented release/tag step.

- [ ] **Step 1: Run the whole suite from a clean state**

Run: `make test`
Expected: PASS — `9 pass`, `0 fail`, exit code 0.

- [ ] **Step 2: Confirm no stray/uncommitted files**

Run: `git status --short`
Expected: empty (clean working tree).

- [ ] **Step 3: (Optional) Local dogfood — confirm OpenCode loads the plugin and skills**

Run: `opencode run --print-logs "list your available skills" 2>&1 | grep -iE "llm-wiki|wiki-context|repo-wiki"`
Expected: at least one line mentioning the skills or the plugin loading. (Requires a configured model; if unavailable, skip — `make test` is the authoritative gate. The `.opencode/plugins/` shim is what makes local loading work.)

- [ ] **Step 4: (Release) Tag v0.1.0 so consuming repos can install via HTTPS**

The public install spec (`…git#v0.1.0`) resolves only after the tag exists on GitHub. When ready to publish:

```bash
git tag v0.1.0
git push origin HEAD --tags
```

Then in each consuming repo, add the two lines from `docs/INSTALL.md` to
`opencode.json` and restart OpenCode. To roll out a new version later, commit,
`git tag v0.2.0 && git push --tags`, and bump the tag in each repo.

- [ ] **Step 5: Final commit (if any docs/notes changed during verification)**

```bash
git add -A
git commit -m "chore: verification notes for v0.1.0" || echo "nothing to commit"
```

---

## Self-Review

**1. Spec coverage**

| Spec section | Task |
| --- | --- |
| §5.1 repo structure (`plugins/`, `.opencode/` shim, `skills/`, `docs/`) | 1, 2, 3, 4, 5 |
| §6 plugin (config hook, idempotent, `../skills`) | 1 |
| §7 `llm-wiki` skill (init/build/query/audit, Source map + Confidence/gaps) | 3 |
| §7.1 `docs/wiki/` layout + page schema | 3 (references) |
| §8 `wiki-context` bridge (read-before-ask, source-map rule, proposal sections) | 4 |
| §9 distribution (git+https tag-pinned, multi-repo, private fallback) | 5 (INSTALL) + 6 (tag) |
| §10 validation (`make test` → `bun test`; plugin + both skills) | 1–5 tests; 6 gate |
| §10 toolchain (bun via `postCreateCommand`) | 1 |

No spec section is left without a task.

**2. Placeholder scan:** No `TODO`/`TBD`/"handle later" in steps. The `<title>`,
`YYYY-MM-DD`, `<type>` tokens appear only inside skill *templates* (intended
fill-in guidance for the end user), not as plan gaps.

**3. Type/name consistency:** `RepoWikiSuperpowersPlugin` (plugin + shim +
tests), `repo-wiki-superpowers` (package/main/install spec), `skillsDir`/`root`
helpers defined in Task 1 and reused in Tasks 2–5, skill names `llm-wiki` /
`wiki-context` match their directories and their validation calls. Test counts
increase monotonically 3→4→6→8→9 as blocks are appended. Consistent.

## Execution Handoff

Choose how to implement.
