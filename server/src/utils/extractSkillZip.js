import AdmZip from "adm-zip";

/**
 * Reads a Claude `.skill` ZIP and returns the markdown from `<name>/SKILL.md` (single top-level folder).
 */
export function extractSkillMarkdownFromSkillZip(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    buffer = Buffer.from(buffer);
  }

  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    return { ok: false, message: "Skill archive is not a valid ZIP file." };
  }

  let zip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    return { ok: false, message: "Invalid or corrupted .skill ZIP archive." };
  }

  const entries = zip.getEntries().filter((entry) => !entry.isDirectory);
  const matches = entries.filter((entry) => {
    const name = entry.entryName.replace(/\\/g, "/").replace(/^\.\/+/, "");
    return /^[^/]+\/SKILL\.md$/i.test(name);
  });

  if (matches.length === 0) {
    return {
      ok: false,
      message: 'Skill archive must contain "<folder>/SKILL.md" at the top level of the ZIP.',
    };
  }

  if (matches.length > 1) {
    return {
      ok: false,
      message: "Skill archive must contain exactly one SKILL.md inside a single top-level folder.",
    };
  }

  let markdown;
  try {
    markdown = matches[0].getData().toString("utf8");
  } catch {
    return { ok: false, message: "Could not read SKILL.md from the archive." };
  }

  return { ok: true, markdown };
}
