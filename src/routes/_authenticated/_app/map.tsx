import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PageHeader } from "@/components/widgets";
import { AcademicMap } from "@/components/academic-map";
import type { MapMode } from "@/lib/academic-map";

const searchSchema = z.object({
  concept: z.string().optional(),
  mode: z.enum(["knowledge", "memory", "risk", "roi", "quest", "discipline", "assessment", "forecast"]).optional(),
});

export const Route = createFileRoute("/_authenticated/_app/map")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Academic Map — Scholaris" },
      { name: "description", content: "Live visual brain of your academic knowledge: subjects, concepts, prerequisites, risk, ROI and forecast." },
    ],
  }),
  component: AcademicMapPage,
});

function AcademicMapPage() {
  const { concept, mode } = Route.useSearch();
  return (
    <div>
      <PageHeader
        eyebrow="Academic Map"
        title="Knowledge Graph"
        description="The visual brain of your academic life. Switch perspectives to see what you know, what you risk and what to study next."
      />
      <AcademicMap initialConceptId={concept} initialMode={mode as MapMode | undefined} />
    </div>
  );
}
