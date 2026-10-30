import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ExtractedJobSchema, type ExtractionResult } from "./schema";
import { parseWithRules } from "./rules";

export const AI_LIVE = Boolean(process.env.ANTHROPIC_API_KEY);
const MODEL = "claude-opus-5-5";

const SYSTEM = `You are the work-understanding engine of AllWork, an Indian marketplace where anyone can post any legitimate work — from "fix my fan" to "50 factory workers tomorrow" to "build my startup's app".
Convert the client's request (English, Hindi, Hinglish or another Indian language) into structured job data.
Rules:
- Never reject a legitimate request because it doesn't fit a known category; create a fitting category/skill name instead.
- Resolve relative dates ("kal", "tomorrow", "next Monday") against the provided today's date. In Hinglish, "kal" in a hiring request means tomorrow.
- Don't invent facts. Use null for anything not stated; ask about it in followUpQuestions only if it matters for hiring.
- Budget is optional; leave it null when absent.
- Output English values even when the input is in another language.`;

let client: Anthropic | null = null;

export async function extractJob(text: string, today = new Date()): Promise<ExtractionResult> {
  if (!AI_LIVE) return { job: parseWithRules(text, today), source: "demo-rules" };

  client ??= new Anthropic();
  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: "low", format: zodOutputFormat(ExtractedJobSchema) },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Today's date: ${today.toISOString().slice(0, 10)} (${today.toLocaleDateString("en-IN", { weekday: "long" })}).\n\nClient request:\n"""${text}"""`,
        },
      ],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return { job: parseWithRules(text, today), source: "demo-rules" };
    }
    return { job: response.parsed_output, source: "claude" };
  } catch (err) {
    if (err instanceof Anthropic.APIError) console.error(`Claude extraction failed (${err.status}):`, err.message);
    else console.error("Claude extraction failed:", err);
    return { job: parseWithRules(text, today), source: "demo-rules" };
  }
}
