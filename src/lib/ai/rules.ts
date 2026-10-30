// Offline, rule-based work-request parser. Used in DEMO mode when no LLM key is
// configured. Understands common English + Hinglish phrasing; it is honest
// about what it could not figure out by returning follow-up questions.
import { SKILL_CATALOG } from "../skills-catalog";
import { findCityInText } from "../geo";
import type { ExtractedJob } from "./schema";

const NUM_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5, chhe: 6, saat: 7, aath: 8, nau: 9, das: 10,
  dozen: 12, twenty: 20, fifty: 50, hundred: 100, bees: 20, pachas: 50, sau: 100,
};

const PEOPLE_WORDS = "(?:people|persons?|workers?|labou?rers?|labou?r|helpers?|log|logo|aadmi|bande|banda|ladke|staff|members?|hands|packers|guards?|cooks?|drivers?|electricians?|plumbers?|painters?|developers?|designers?)";

function toNum(s: string) {
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : NUM_WORDS[s.toLowerCase()];
}

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseWithRules(text: string, today = new Date()): ExtractedJob {
  const raw = text.trim();
  const t = ` ${raw.toLowerCase().replace(/\s+/g, " ")} `;

  // Skills: keyword hits, longest keyword wins ties
  const hits = new Map<string, { score: number; category: string }>();
  for (const s of SKILL_CATALOG) {
    for (const k of s.k) {
      const kw = k.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
      if (new RegExp(`(^|[^a-z])${kw}([^a-z]|$)`).test(t)) {
        const prev = hits.get(s.name);
        const score = k.length;
        if (!prev || prev.score < score) hits.set(s.name, { score, category: s.category });
      }
    }
  }
  const ranked = [...hits.entries()].sort((a, b) => b[1].score - a[1].score);
  // "factory" alone is context; prefer a more specific industrial skill if present
  let skills = ranked.map(([n]) => n);
  if (skills.length > 1 && skills.includes("Factory Worker")) skills = skills.filter((s) => s !== "Factory Worker");
  skills = skills.slice(0, 3);
  const category = ranked.find(([n]) => n === skills[0])?.[1].category ?? "General";

  // Number of workers
  let workersNeeded = 1;
  const m1 = t.match(new RegExp(`(\\d+|${Object.keys(NUM_WORDS).join("|")})\\s+(?:[a-z]+\\s+)?${PEOPLE_WORDS}`));
  if (m1) workersNeeded = toNum(m1[1]!) ?? 1;
  else {
    const m2 = t.match(/need\s+(\d+)\s/);
    if (m2) workersNeeded = Number(m2[1]);
  }
  workersNeeded = Math.max(1, Math.min(workersNeeded, 1000));

  // Date
  let date: string | null = null;
  const d = new Date(today);
  if (/\b(tomorrow|kal)\b/.test(t)) { d.setDate(d.getDate() + 1); date = iso(d); }
  else if (/\b(day after tomorrow|parso|parson)\b/.test(t)) { d.setDate(d.getDate() + 2); date = iso(d); }
  else if (/\b(today|aaj|abhi|right now|tonight)\b/.test(t)) date = iso(d);
  else {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const di = days.findIndex((x) => t.includes(x));
    if (di >= 0) { d.setDate(d.getDate() + ((di - d.getDay() + 7) % 7 || 7)); date = iso(d); }
    const md = t.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
    if (md) {
      const y = md[3] ? (md[3].length === 2 ? 2000 + Number(md[3]) : Number(md[3])) : today.getFullYear();
      date = iso(new Date(y, Number(md[2]) - 1, Number(md[1])));
    }
  }

  // Start time
  let startTime: string | null = null;
  const tm = t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|baje)\b/);
  if (tm) {
    let h = Number(tm[1]);
    if (tm[3] === "pm" && h < 12) h += 12;
    if (tm[3] === "am" && h === 12) h = 0;
    if (tm[3] === "baje" && h < 7) h += 12;
    startTime = `${String(h).padStart(2, "0")}:${tm[2] ?? "00"}`;
  } else if (/\bmorning|subah\b/.test(t)) startTime = "09:00";
  else if (/\bevening|shaam\b/.test(t)) startTime = "17:00";

  // Duration
  let durationHours: number | null = null;
  let durationText: string | null = null;
  const hm = t.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|ghante|ghanta|ghante ke liye)/);
  const dm = t.match(/(\d+)\s*(?:days?|din)/);
  const wm = t.match(/(\d+)\s*(?:weeks?|hafte)/);
  const mm = t.match(/(\d+)\s*(?:months?|mahine)/);
  if (hm) { durationHours = Number(hm[1]); durationText = `${hm[1]} hours`; }
  if (dm) durationText = `${dm[1]} day${dm[1] === "1" ? "" : "s"}`;
  if (wm) durationText = `${wm[1]} week${wm[1] === "1" ? "" : "s"}`;
  if (mm) durationText = `${mm[1]} month${mm[1] === "1" ? "" : "s"}`;

  // Budget
  let budgetMin: number | null = null;
  let budgetMax: number | null = null;
  let budgetUnit: ExtractedJob["budgetUnit"] = null;
  const bm = t.match(/(?:₹|rs\.?|inr|rupees?)\s*([\d,]+)(?:\s*(?:-|to)\s*(?:₹|rs\.?)?\s*([\d,]+))?|([\d,]+)\s*(?:rs|rupees?|rupaye|₹)/);
  if (bm) {
    budgetMin = toNum(bm[1] ?? bm[3] ?? "") ?? null;
    budgetMax = bm[2] ? toNum(bm[2]) ?? null : budgetMin;
    if (/per\s*(?:hour|hr|ghanta)|\/\s*hr|hourly/.test(t)) budgetUnit = "HOUR";
    else if (/per\s*(?:day|din)|\/\s*day|daily|dihadi|rozana/.test(t)) budgetUnit = "DAY";
    else if (/per\s*month|monthly|salary|mahina/.test(t)) budgetUnit = "MONTH";
    else budgetUnit = "TOTAL";
  }

  // Work type
  let workType: ExtractedJob["workType"] = "ONE_TIME";
  if (/full[- ]?time/.test(t)) workType = "FULL_TIME";
  else if (/part[- ]?time/.test(t)) workType = "PART_TIME";
  else if (/permanent|naukri|monthly salary/.test(t)) workType = "PERMANENT";
  else if (/intern/.test(t)) workType = "INTERNSHIP";
  else if (/\b(build|develop|design|app|website|project)\b/.test(t) && category === "Technology") workType = "PROJECT";
  else if (wm || /weekly/.test(t)) workType = "WEEKLY";
  else if (dm || /daily|dihadi|per day/.test(t)) workType = "DAILY";
  else if (hm) workType = "HOURLY";

  const isRemote = /\bremote|work from home|wfh|online\b/.test(t);
  const city = findCityInText(raw);
  const urgency: ExtractedJob["urgency"] = /urgent|asap|turant|jaldi|emergency|abhi|right now/.test(t)
    ? "URGENT"
    : date && (date === iso(today) || /tomorrow|kal/.test(t)) ? "HIGH" : "NORMAL";

  const exp = t.match(/(\d+)\+?\s*(?:years?|yrs?|saal)\s*(?:of\s*)?(?:experience|exp|anubhav)?/);
  const experienceRequired = exp ? `${exp[1]}+ years` : /experienced|anubhavi/.test(t) ? "Experienced preferred" : "Not mandatory";

  const hinglish = /\b(kal|aaj|chahiye|ghante|log|aadmi|kaam|karna|mujhe|hai|ke liye|wala|wali|banda)\b/.test(t);

  const primary = skills[0] ?? "General Helper";
  const title = workersNeeded > 1 ? `${workersNeeded} × ${primary}${city ? ` in ${city.name}` : ""}` : `${primary}${city ? ` in ${city.name}` : ""}`;

  const followUpQuestions: string[] = [];
  if (!city && !isRemote) followUpQuestions.push("Where is the work located (city / area)?");
  if (!date && workType !== "FULL_TIME" && workType !== "PERMANENT") followUpQuestions.push("When should the work start?");
  if (!durationText && !["FULL_TIME", "PERMANENT", "PROJECT"].includes(workType)) followUpQuestions.push("How long will the work take?");
  if (!skills.length) followUpQuestions.push("What kind of skill or worker do you need?");

  return {
    title,
    summary: raw.length > 160 ? `${raw.slice(0, 157)}…` : raw,
    category,
    skills: skills.length ? skills : ["General Helper"],
    workersNeeded,
    city: city?.name ?? null,
    address: null,
    isRemote,
    date,
    startTime,
    durationHours,
    durationText,
    budgetMin,
    budgetMax,
    budgetUnit,
    workType,
    experienceRequired,
    urgency,
    specialInstructions: null,
    detectedLanguage: hinglish ? "Hinglish" : "English",
    followUpQuestions: followUpQuestions.slice(0, 3),
    isLegitimate: true,
  };
}
