import YAML from "yaml";

/**
 * Validates Claude SKILL.md-style content: YAML frontmatter with --- delimiters
 * and required string keys `name` and `description`.
 */
export function validateClaudeSkillMarkdown(raw) {
  if (typeof raw !== "string") {
    return { ok: false, message: "Skill document must be text." };
  }

  const text = raw.replace(/^\uFEFF/, "");

  const fmMatch = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
  const match = text.match(fmMatch);
  if (!match) {
    return {
      ok: false,
      message:
        "Skill file must start with YAML frontmatter: opening ---, frontmatter body, then closing ---.",
    };
  }

  const fmRaw = match[1].trim();
  let data;
  try {
    data = YAML.parse(fmRaw);
  } catch {
    return { ok: false, message: "Invalid YAML in skill frontmatter." };
  }

  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, message: "Skill frontmatter must be a YAML mapping with name and description." };
  }

  const name = data.name;
  const description = data.description;

  if (typeof name !== "string" || !name.trim()) {
    return { ok: false, message: "Skill frontmatter must include a non-empty name field." };
  }
  if (typeof description !== "string" || !description.trim()) {
    return { ok: false, message: "Skill frontmatter must include a non-empty description field." };
  }

  return { ok: true };
}
