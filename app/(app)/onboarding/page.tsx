import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export default function OnboardingPage() {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="text-center">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Welcome to UniPilot AI
        </h1>
        <p className="mt-1 text-sm font-semibold text-ink-2">
          Three quick steps and you&rsquo;re ready to go.
        </p>
      </div>
      <OnboardingWizard />
    </div>
  );
}
