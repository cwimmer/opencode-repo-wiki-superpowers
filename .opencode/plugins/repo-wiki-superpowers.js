// Local dogfood loader: OpenCode auto-loads plugins from .opencode/plugins/.
// Re-export the real plugin so edits under plugins/ take effect without
// installing from GitHub. Consuming repos never load this file.
export { RepoWikiSuperpowersPlugin } from "../../plugins/repo-wiki-superpowers.js";
