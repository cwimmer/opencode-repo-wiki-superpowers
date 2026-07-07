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
