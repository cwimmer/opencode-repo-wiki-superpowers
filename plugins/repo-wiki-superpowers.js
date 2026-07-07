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
