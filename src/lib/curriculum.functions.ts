// Curriculum extraction — OCR + academic structure detection via the Lovable
// AI Gateway. Accepts uploaded syllabus files (PDF / JPG / PNG, base64) and
// returns a structured Subject → Unit → Topic → Concept hierarchy plus credit,
// assessment-weight, learning-outcome and prerequisite hints.
//
// This is a client-reachable module: read secrets and call the gateway only
// inside the handler body.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { RawExtraction } from "./curriculum";

const fileSchema = z.object({
  name: z.string().max(300),
  mime: z.string().max(120),
  // data: base64 (no data: prefix), capped to keep request sane (~12MB raw).
  data: z.string().max(16_000_000),
});

const inputSchema = z.object({
  files: z.array(fileSchema).min(1).max(8),
});

const SYSTEM_PROMPT = `You are an academic curriculum extraction engine. You receive scanned syllabus pages, course handbooks, curriculum documents or photos of syllabus sheets. Perform OCR where needed, then STRUCTURE the academic content. Never just dump raw text.

Detect and organize a strict hierarchy:
Subject -> Unit -> Topic -> Concept

Rules:
- Every Topic and Concept MUST belong to a Subject and Unit. No orphans.
- A "Unit" is a major division (e.g. "Unit 1: Introduction", "Module 2", "Part A"). If the document has no explicit units, group related topics into one or more sensible units.
- A "Topic" is a section under a unit (e.g. "Regression"). A "Concept" is a specific learnable idea (e.g. "Gradient Descent", "Loss Function").
- Extract learning outcomes per subject when present.
- Extract credits per subject when stated (integer credit hours). If not stated, set credits to null.
- Extract assessment / grading scheme weights per subject when stated. Use fractions of 1 OR percentages — return the numbers you see for: midterm, final, assignment, lab, project. Omit assessmentWeights entirely if none are stated.
- Infer likely prerequisite relationships between concepts using academic domain knowledge (e.g. Calculus -> Optimization -> Machine Learning; Probability -> Statistics). Each prerequisite is { from, to } where "from" is required before "to". Only include high-confidence inferences. Use exact concept names you extracted.
- Default progress to "not_started" and coverage to "not_covered" (the user declares real progress later).

Respond with ONLY valid JSON in exactly this shape:
{
  "subjects": [
    {
      "name": "string",
      "code": "string",
      "credits": number | null,
      "assessmentWeights": { "midterm": number, "final": number, "assignment": number, "lab": number, "project": number },
      "learningOutcomes": ["string"],
      "units": [
        {
          "name": "string",
          "topics": [
            { "name": "string", "concepts": ["string"] }
          ]
        }
      ]
    }
  ],
  "prerequisites": [ { "from": "concept name", "to": "concept name" } ]
}`;

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

export const extractCurriculum = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<RawExtraction> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI gateway is not configured.");

    const blocks: ContentBlock[] = [
      {
        type: "text",
        text: "Extract and structure the academic curriculum from the attached syllabus material. Return only the JSON described in the system prompt.",
      },
    ];

    for (const f of data.files) {
      const mime = f.mime.toLowerCase();
      if (mime.startsWith("image/")) {
        blocks.push({
          type: "image_url",
          image_url: { url: `data:${f.mime};base64,${f.data}` },
        });
      } else if (mime === "application/pdf") {
        blocks.push({
          type: "file",
          file: { filename: f.name, file_data: `data:application/pdf;base64,${f.data}` },
        });
      } else {
        // Unknown type — try as image; the gateway will reject if unsupported.
        blocks.push({
          type: "image_url",
          image_url: { url: `data:${f.mime || "image/png"};base64,${f.data}` },
        });
      }
    }

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
          { role: "user", content: blocks },
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
      throw new Error(`Extraction failed (${resp.status}). ${detail.slice(0, 200)}`);
    }

    const json = (await resp.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content ?? "";
    if (!content) throw new Error("The document could not be read. Try a clearer scan.");

    let parsed: RawExtraction;
    try {
      parsed = JSON.parse(content) as RawExtraction;
    } catch {
      // Recover JSON if the model wrapped it in prose/markdown fences.
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Could not parse the extracted structure.");
      parsed = JSON.parse(match[0]) as RawExtraction;
    }

    if (!parsed.subjects || parsed.subjects.length === 0) {
      throw new Error("No academic subjects were detected in the upload.");
    }
    return parsed;
  });
