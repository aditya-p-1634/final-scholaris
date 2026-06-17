// Universal Academic Capture — natural-language activity parser.
// Takes a free-text description of what the student just did ("I studied
// Linear Algebra for 45 minutes", "I scored 18/20 in Quiz 2", "I forgot
// Bayes Theorem") plus a compact snapshot of the live workspace, and returns
// a STRUCTURED list of academic activities. The client resolves the parsed
// names back to concrete subject/concept ids against the live store and then
// drives the existing intelligence engines (sessions, assessments, quests,
// recovery) — no engine logic lives here.
//
// Client-reachable module: read secrets and call the gateway only inside the
// handler body.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { RawCaptureParse } from "./capture";

const subjectCtx = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string().optional().default(""),
});
const conceptCtx = z.object({
  id: z.string(),
  name: z.string(),
  subject: z.string().optional().default(""),
});

const inputSchema = z.object({
  text: z.string().min(1).max(2000),
  context: z.object({
    subjects: z.array(subjectCtx).max(80),
    concepts: z.array(conceptCtx).max(600),
    mainQuest: z.string().max(200).optional(),
    recoveryQuests: z.array(z.string().max(200)).max(20).optional(),
  }),
});

const SYSTEM_PROMPT = `You are the Academic Activity Parser for Scholaris, an academic operating system. The student describes — in natural language — what they just did. Convert it into a STRUCTURED list of academic activities so the system can update itself automatically. The user never fills forms; they just say what happened.

You receive a snapshot of the student's real workspace: their subjects (id, name, code), their concepts (id, name, subject), the current main quest, and active recovery quests. ALWAYS map mentioned subjects/concepts to the EXACT id from the snapshot when you are confident. If you recognise the academic concept but it is not in the snapshot, still return its name (leave the id null).

A single input may describe MULTIPLE activities ("I studied Probability for 30 min and scored 18/20 in Quiz 2") — return one entry per distinct activity.

Activity types:
- "study_session": studied / revised / reviewed / watched a lecture on something (has a subject/concept and usually a duration).
- "problem_solving": solved/practiced N problems on a concept.
- "assessment": reported a graded result ("scored 18/20", "got 85% in Midterm", "failed Quiz 3"). Map to a subject. Parse score, outOf, and percent (0-100). "failed" => low percent (e.g. 35) if no number given.
- "quest_complete": completed a quest ("completed today's quest", "finished the recovery quest"). Set questKind to "main" or "recovery".
- "unit_complete": finished a unit / assignment / module ("completed Unit 3", "finished Assignment 4").
- "review": quick revision / re-reading of a concept (lighter than a study session).
- "failure": skipped/missed/forgot/couldn't do something. Set failureKind to "skipped" (skipped studying today), "missed_quest" (missed the quest), "forgot" (forgot a concept), or "couldnt_solve" (couldn't solve problems). Attach the concept/subject when one is named.

Rules:
- durationMinutes: parse explicit durations ("45 minutes", "an hour" => 60, "half an hour" => 30). Null if none stated.
- problemCount: integer count of problems when stated.
- completionStatus: "completed" | "partial" | "skipped" when relevant, else null.
- confidence: 0-100 — how sure you are of this interpretation.
- summary: one short human-readable sentence of what you detected.
- Use null for any field you cannot determine. Never invent ids that are not in the snapshot.

Respond with ONLY valid JSON in exactly this shape:
{
  "activities": [
    {
      "type": "study_session|problem_solving|assessment|quest_complete|unit_complete|review|failure",
      "subjectId": "string|null",
      "subject": "string|null",
      "conceptId": "string|null",
      "concept": "string|null",
      "durationMinutes": number|null,
      "problemCount": number|null,
      "assessmentTitle": "string|null",
      "score": number|null,
      "outOf": number|null,
      "percent": number|null,
      "questKind": "main|recovery|null",
      "completionStatus": "completed|partial|skipped|null",
      "failureKind": "skipped|missed_quest|forgot|couldnt_solve|null",
      "confidence": number,
      "summary": "string"
    }
  ]
}`;

export const parseAcademicActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<RawCaptureParse> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI gateway is not configured.");

    const ctx = data.context;
    const contextBlock = JSON.stringify({
      subjects: ctx.subjects,
      concepts: ctx.concepts,
      mainQuest: ctx.mainQuest ?? null,
      recoveryQuests: ctx.recoveryQuests ?? [],
    });

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `WORKSPACE SNAPSHOT:\n${contextBlock}\n\nSTUDENT SAID:\n"""${data.text}"""\n\nReturn only the JSON described in the system prompt.`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (resp.status === 429) {
      throw new Error("Rate limit reached. Please wait a moment and try again.");
    }
    if (resp.status === 402) {
      throw new Error("AI credits exhausted. Add credits to continue.");
    }
    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      throw new Error(`Capture failed (${resp.status}). ${detail.slice(0, 200)}`);
    }

    const json = (await resp.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content ?? "";
    if (!content) throw new Error("Could not interpret that. Try rephrasing.");

    let parsed: RawCaptureParse;
    try {
      parsed = JSON.parse(content) as RawCaptureParse;
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Could not parse that activity.");
      parsed = JSON.parse(match[0]) as RawCaptureParse;
    }

    if (!parsed.activities || parsed.activities.length === 0) {
      throw new Error("No academic activity was detected. Try being more specific.");
    }
    return parsed;
  });
