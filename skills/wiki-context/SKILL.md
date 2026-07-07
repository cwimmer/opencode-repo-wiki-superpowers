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
