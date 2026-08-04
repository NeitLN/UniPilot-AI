"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  confirmPlan,
  cancelPlan,
  retryCalendarPush,
  type ConfirmPlanResult,
} from "@/app/(app)/planner/actions";
import { Pilo } from "@/components/brand/Pilo";
import { GenerateButton, type GenerateButtonProps } from "./GenerateButton";

/** FR-23 (docs/PRODUCT_REVIEW.md): confirmPlan used to swallow this outcome
 * entirely, so the user had no way to tell whether their sessions also
 * reached Google without checking there themselves. */
function calendarPushMessage(result: ConfirmPlanResult): string {
  if ("pushed" in result) {
    return result.pushed > 0
      ? `Added ${result.pushed} session${result.pushed === 1 ? "" : "s"} to Google Calendar.`
      : "Your plan is confirmed.";
  }
  if ("pushSkipped" in result) {
    return "Your plan is confirmed. Connect Google Calendar to automatically add sessions to it.";
  }
  return "Your plan is confirmed, but syncing to Google Calendar didn't work.";
}

export type PlanLifecycleView = "empty" | "draft" | "active" | "ended";

/** The three motion strokes beside Pilo's raised wing in the concept art —
 * they aren't baked into pilo-ai-planner.png, so they're drawn here.
 * Purely decorative: the greeting they imply carries no information the
 * heading and copy don't already state. */
function WaveSparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <g stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" className="text-white">
        <path d="M14 12 L17 4" />
        <path d="M21 15 L28 10" />
        <path d="M23 22 L31 21" />
      </g>
    </svg>
  );
}

export function PlannerHero({
  lifecycle,
  planId,
  sessionCount,
  totalMinutesLabel,
  generateProps,
}: {
  lifecycle: PlanLifecycleView;
  /** Only present for draft/active — null for empty/ended. */
  planId: string | null;
  sessionCount: number;
  totalMinutesLabel: string;
  /** Reused verbatim for the "Ended"/"Empty" states' generate CTA — the
   * exact same gated action as the header button, just also offered
   * inline in the hero (brief §1.4: not a competing *confirm* CTA, since
   * generate and confirm are different actions). */
  generateProps: GenerateButtonProps;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmResult, setConfirmResult] = useState<ConfirmPlanResult | null>(null);

  function handleConfirm() {
    if (!planId) return;
    setActionError(null);
    startTransition(async () => {
      try {
        setConfirmResult(await confirmPlan(planId));
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Couldn't confirm the plan.");
      }
    });
  }

  function handleRetryPush() {
    if (!planId) return;
    startTransition(async () => {
      try {
        setConfirmResult(await retryCalendarPush(planId));
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Couldn't retry the sync.");
      }
    });
  }

  function handleCancel() {
    if (!planId) return;
    setActionError(null);
    startTransition(async () => {
      try {
        await cancelPlan(planId);
        router.refresh();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Couldn't cancel the draft.");
      }
    });
  }

  if (confirmResult) {
    const failed = "pushFailed" in confirmResult;
    const skipped = "pushSkipped" in confirmResult;
    return (
      <div className="rounded-card bg-violet p-5 text-white sm:p-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-card">
            <Pilo mood="happy" size={34} />
          </span>
          <h2 className="font-display text-lg font-bold">Plan confirmed!</h2>
        </div>
        <p className="mt-3 text-[12.5px] font-medium text-white/88">{calendarPushMessage(confirmResult)}</p>
        {skipped && (
          <Link href="/schedule" className="mt-2 inline-block text-[12.5px] font-bold text-lime hover:underline">
            Connect Google Calendar →
          </Link>
        )}
        <div className="mt-4 flex gap-2.5">
          {failed && (
            <button
              type="button"
              onClick={handleRetryPush}
              disabled={pending}
              className="flex min-h-11 flex-1 items-center justify-center rounded-ctl bg-white/18 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {pending ? "Retrying…" : "Try syncing again"}
            </button>
          )}
          <button
            type="button"
            onClick={() => router.refresh()}
            className="flex min-h-11 flex-1 items-center justify-center rounded-ctl bg-lime py-2.5 text-sm font-bold text-ink"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  const badgeLabel = lifecycle === "draft" ? "Draft" : lifecycle === "active" ? "Active" : lifecycle === "ended" ? "Ended" : null;
  const description =
    lifecycle === "draft"
      ? `${sessionCount} focused session${sessionCount === 1 ? "" : "s"}, built around your deadlines.`
      : lifecycle === "active"
        ? `${sessionCount} session${sessionCount === 1 ? "" : "s"} confirmed this week — ${totalMinutesLabel} of focused work planned.`
        : lifecycle === "ended"
          ? "This week's plan has ended — generate a new one when you're ready."
          : "Generate a weekly study plan whenever you're ready.";

  return (
    <div className={`overflow-hidden rounded-card p-5 sm:p-6 ${lifecycle === "ended" || lifecycle === "empty" ? "bg-violet/70" : "bg-violet"} text-white`}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:gap-7">
        {/* Negative bottom margin cancels the card's own padding so Pilo
            stands ON the card's bottom edge (concept 02-ai-planner) rather
            than floating in a centred box; `overflow-hidden` above keeps
            that from spilling past the rounded corner. */}
        <div className="relative mx-auto -mb-5 shrink-0 sm:-mb-6 lg:mx-0">
          <Image
            src="/mascots/pilo-ai-planner.png"
            alt=""
            width={205}
            height={205}
            className="h-[160px] w-[160px] object-contain object-bottom lg:h-[210px] lg:w-[210px]"
            priority
          />
          <WaveSparkle className="absolute right-1 top-7 h-8 w-8 lg:right-0 lg:top-10 lg:h-10 lg:w-10" />
        </div>

        <div className="flex flex-1 flex-col gap-4 lg:pb-2">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-display text-2xl font-bold lg:text-3xl">Pilo&rsquo;s plan</h2>
              {badgeLabel && (
                // Not the shared <Tag>: its violet tone is a pale lavender
                // chip tuned for light cards, which washes out on this
                // violet hero. A translucent white pill keeps the same
                // subtle weight the concept shows.
                <span
                  className={`rounded-pill px-2.5 py-1 text-[11px] font-extrabold ${
                    lifecycle === "active" ? "bg-mint text-mint-text" : "bg-white/20 text-white"
                  }`}
                >
                  {badgeLabel}
                </span>
              )}
            </div>
            <p className="mt-1.5 max-w-md text-[13px] font-medium text-white/88">{description}</p>
          </div>

          <div className="shrink-0">
            {lifecycle === "draft" && (
              // Confirm is the whole point of the card, so it stands alone
              // on its own row as in the concept. Cancel stays — it's the
              // only route to cancelPlan() anywhere in the app — but drops
              // underneath as a quiet link instead of competing beside it.
              <div className="flex flex-col items-start gap-2">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={pending || sessionCount === 0}
                  className="flex min-h-11 items-center justify-center rounded-ctl bg-lime px-7 py-2.5 text-sm font-extrabold text-ink hover:bg-lime-deep disabled:opacity-60"
                >
                  {pending ? "Working…" : "Review & confirm"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={pending}
                  className="text-[11.5px] font-bold text-white/70 hover:text-white disabled:opacity-60"
                >
                  Cancel draft
                </button>
              </div>
            )}
            {(lifecycle === "ended" || lifecycle === "empty") && (
              <GenerateButton {...generateProps} variant="lime" />
            )}
          </div>
        </div>
      </div>

      {actionError && (
        <p role="alert" className="mt-3 text-[11.5px] font-semibold text-coral-tint">
          {actionError}
        </p>
      )}
    </div>
  );
}
