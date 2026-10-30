import { z } from "zod";

export const WORK_TYPES = [
  "ONE_TIME", "HOURLY", "DAILY", "WEEKLY", "PROJECT", "PART_TIME", "FULL_TIME", "PERMANENT", "INTERNSHIP", "CONTRACT",
] as const;

export const ExtractedJobSchema = z.object({
  title: z.string().describe("Short job title, max ~8 words, e.g. 'Packaging workers for factory'"),
  summary: z.string().describe("One clear English sentence describing the work"),
  category: z.string().describe("Broad category, e.g. Industrial, Local Services, Technology, Business, Creative, Events, Education, or a new fitting one"),
  skills: z.array(z.string()).describe("1-4 worker skill names, title case, e.g. 'Packaging Worker', 'Electrician'. Invent a sensible new skill name if none fits."),
  workersNeeded: z.number().int().describe("Number of people needed; 1 if not mentioned"),
  city: z.string().nullable().describe("City name in English, null if not mentioned"),
  address: z.string().nullable().describe("Area / locality / address detail if mentioned"),
  isRemote: z.boolean(),
  date: z.string().nullable().describe("Start date as YYYY-MM-DD resolved against today's date, null if not mentioned"),
  startTime: z.string().nullable().describe("Start time HH:MM 24h, null if not mentioned"),
  durationHours: z.number().nullable().describe("Total hours per engagement/day if determinable"),
  durationText: z.string().nullable().describe("Human description of duration, e.g. '8 hours', '3 days', 'ongoing'"),
  budgetMin: z.number().int().nullable(),
  budgetMax: z.number().int().nullable(),
  budgetUnit: z.enum(["HOUR", "DAY", "TOTAL", "MONTH"]).nullable(),
  workType: z.enum(WORK_TYPES),
  experienceRequired: z.string().describe("e.g. 'Not mandatory', '2+ years'"),
  urgency: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  specialInstructions: z.string().nullable(),
  detectedLanguage: z.string().describe("e.g. English, Hinglish, Hindi"),
  followUpQuestions: z.array(z.string()).describe("0-3 short questions for details that are genuinely missing and matter for hiring"),
  isLegitimate: z.boolean().describe("false only for clearly illegal, exploitative or harmful requests"),
});

export type ExtractedJob = z.infer<typeof ExtractedJobSchema>;

export type ExtractionResult = {
  job: ExtractedJob;
  /** "claude" when parsed by the live LLM, "demo-rules" when the offline parser was used. */
  source: "claude" | "demo-rules";
};
