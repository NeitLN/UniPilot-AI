import { createClient } from "@/lib/supabase/server";
import { computeAndStoreRisk } from "@/lib/risk/compute";
import { KpiCard } from "./KpiCard";

export async function WorkloadRiskKpi() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const computation = user
    ? await computeAndStoreRisk(supabase, user.id)
    : ({ status: "insufficient_data" } as const);

  if (computation.status !== "ok") {
    return (
      <KpiCard
        tone="tangerine"
        label="Workload risk"
        value="—"
        hint="Not enough data yet"
      />
    );
  }

  const { score, warn } = computation.result;

  return (
    <KpiCard
      tone="tangerine"
      label="Workload risk"
      value={String(score)}
      unit="/100"
      hint={warn ? "Above the warning threshold" : "Within a healthy range"}
      barPct={score}
    />
  );
}
