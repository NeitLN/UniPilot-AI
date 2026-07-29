export interface PromptAssignment {
  id: string;
  title: string;
  dueAt: string;
  weight: number;
  priority: string;
  progress: number;
}

export interface PromptClassBlock {
  title: string;
  startAt: string;
  endAt: string;
}

export interface PlanPromptInput {
  weekStart: string;
  weeklyAvailabilityHours: number;
  targetGpa: number | null;
  assignments: PromptAssignment[];
  classBlocks: PromptClassBlock[];
}

/** Plain-text prompt for Gemini — pure and unit-testable on purpose. */
export function buildPlanPrompt(input: PlanPromptInput): string {
  const assignmentLines = input.assignments
    .map(
      (a) =>
        `- id: ${a.id} | "${a.title}" | due ${a.dueAt} | weight ${a.weight}% | priority ${a.priority} | progress ${a.progress}%`,
    )
    .join("\n");

  const classLines =
    input.classBlocks.length > 0
      ? input.classBlocks
          .map((b) => `- "${b.title}" ${b.startAt} to ${b.endAt}`)
          .join("\n")
      : "- none";

  return `You are Pilo, a calm and practical study planning assistant for a university student.

Plan study sessions for the week starting ${input.weekStart}.
The student has ${input.weeklyAvailabilityHours} hours of study availability this week in total.${
    input.targetGpa ? `\nTheir target GPA is ${input.targetGpa.toFixed(2)}.` : ""
  }

Pending assignments (not yet done):
${assignmentLines}

Fixed class schedule this week (never schedule study sessions during these):
${classLines}

Propose study sessions that:
- Never overlap the class schedule above or each other.
- Never end after an assignment's own due date.
- Prioritize higher-weight and higher-priority assignments, and ones with lower progress.
- Fit within the total weekly availability.
- Are reasonably sized blocks (30-120 minutes each).

Respond with ONLY raw JSON, no markdown code fences, no commentary, matching exactly this shape:
{"sessions": [{"assignmentId": "<id from the list above>", "startAt": "<ISO 8601 datetime>", "endAt": "<ISO 8601 datetime>", "reason": "<one short sentence>"}]}`;
}
