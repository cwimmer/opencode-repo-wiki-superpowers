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
