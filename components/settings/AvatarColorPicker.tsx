"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import { updateAvatarColor } from "@/app/(app)/settings/actions";
import { AVATAR_COLORS, type AvatarColor } from "@/lib/rules/avatar-color";
import { FieldError } from "@/components/ui/FieldError";

const SWATCH_CLASSES: Record<AvatarColor, string> = {
  violet: "bg-violet",
  mint: "bg-mint",
  tangerine: "bg-tangerine",
  coral: "bg-coral",
  sky: "bg-sky",
  lime: "bg-lime",
};

const RING_CLASSES: Record<AvatarColor, string> = {
  violet: "bg-violet-tint",
  mint: "bg-mint-tint",
  tangerine: "bg-tangerine-tint",
  coral: "bg-coral-tint",
  sky: "bg-sky-tint",
  lime: "bg-lime-tint",
};

/** "Change avatar" (concept §8.4) — this app has no photo-upload
 * infrastructure anywhere, so a real feature here is a preset accent color
 * behind the fixed Pilo mascot circle, not a fabricated upload control.
 * Optimistic + rolls back on failure, same pattern as
 * NotificationPreferencesCard's toggles. */
export function AvatarColorPicker({ initialColor }: { initialColor: AvatarColor }) {
  const [color, setColor] = useState<AvatarColor>(initialColor);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function choose(next: AvatarColor) {
    if (next === color) return;
    const prev = color;
    setError(null);
    setColor(next);
    startTransition(async () => {
      try {
        await updateAvatarColor(next);
      } catch (err) {
        setColor(prev);
        setError(err instanceof Error ? err.message : "Couldn't save that — try again.");
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <span
        className={`flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-full ${RING_CLASSES[color]} motion-safe:transition-colors motion-safe:duration-200`}
      >
        <Image
          src="/mascots/pilo-settings-avatar.png"
          alt=""
          width={72}
          height={72}
          className="h-[72px] w-[72px] object-contain"
        />
      </span>
      <div role="radiogroup" aria-label="Avatar color" className="flex gap-1.5">
        {AVATAR_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={color === c}
            aria-label={c}
            disabled={pending}
            onClick={() => choose(c)}
            className={`relative flex h-6 w-6 items-center justify-center rounded-full ${SWATCH_CLASSES[c]} disabled:opacity-60`}
          >
            {color === c && (
              <Check className="h-3.5 w-3.5 text-white" aria-hidden="true" strokeWidth={3} />
            )}
          </button>
        ))}
      </div>
      {error && <FieldError className="text-[11px]">{error}</FieldError>}
    </div>
  );
}
