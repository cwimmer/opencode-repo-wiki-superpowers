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
