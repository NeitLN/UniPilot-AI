"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  confirmPlan,
  cancelPlan,
  retryCalendarPush,
  type ConfirmPlanResult,
} from "@/app/(app)/planner/actions";
import { Pilo } from "@/components/brand/Pilo";
import { Tag } from "@/components/ui/Tag";
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
    <div className={`rounded-card p-5 sm:p-6 ${lifecycle === "ended" || lifecycle === "empty" ? "bg-violet/70" : "bg-violet"} text-white`}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-card">
            <Pilo mood={lifecycle === "empty" ? "sleepy" : "happy"} size={50} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl font-bold">Pilo&rsquo;s plan</h2>
              {badgeLabel && <Tag tone={lifecycle === "draft" ? "violet" : lifecycle === "active" ? "mint" : "neutral"}>{badgeLabel}</Tag>}
            </div>
            <p className="mt-1.5 max-w-md text-[13px] font-medium text-white/88">{description}</p>
          </div>
        </div>

        <div className="shrink-0">
          {lifecycle === "draft" && (
            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={pending || sessionCount === 0}
                className="flex min-h-11 items-center justify-center rounded-ctl bg-lime px-5 py-2.5 text-sm font-extrabold text-ink hover:bg-lime-deep disabled:opacity-60"
              >
                {pending ? "Working…" : "Review & confirm"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={pending}
                className="text-[12px] font-bold text-white/75 hover:text-white disabled:opacity-60"
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

      {actionError && (
        <p role="alert" className="mt-3 text-[11.5px] font-semibold text-coral-tint">
          {actionError}
        </p>
      )}
    </div>
  );
}
