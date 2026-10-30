import "server-only";
import { db } from "./db";
import { SKILL_CATALOG } from "./skills-catalog";
import { slugify } from "./utils";

/**
 * Resolve skill names to Skill rows, creating custom skills on the fly so no
 * legitimate request is ever rejected for a missing category.
 */
export async function ensureSkills(names: string[], fallbackCategory = "Other") {
  const clean = [...new Set(names.map((n) => n.trim()).filter(Boolean))].slice(0, 15);
  const out = [];
  for (const name of clean) {
    const slug = slugify(name);
    if (!slug) continue;
    const known = SKILL_CATALOG.find((s) => slugify(s.name) === slug);
    const skill = await db.skill.upsert({
      where: { slug },
      update: {},
      create: { name: known?.name ?? titleCase(name), slug, category: known?.category ?? fallbackCategory, isCustom: !known },
    });
    out.push(skill);
  }
  return out;
}

function titleCase(s: string) {
  return s.replace(/\s+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
