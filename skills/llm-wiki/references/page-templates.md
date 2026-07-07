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
