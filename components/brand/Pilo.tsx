import Image from "next/image";

export type PiloMood = "ready" | "happy" | "sleepy";

const MOOD_SRC: Record<PiloMood, string> = {
  ready: "/pilo-mascot.svg",
  happy: "/pilo-mascot-happy.svg",
  sleepy: "/pilo-mascot-sleepy.svg",
};

const MOOD_ALT: Record<PiloMood, string> = {
  ready: "Pilo, ready and alert",
  happy: "Pilo, happy about a streak or completed task",
  sleepy: "Pilo, resting during a break",
};

export interface PiloProps {
  mood?: PiloMood;
  size?: number;
  className?: string;
}

/**
 * Pilo mascot. Always place on a white background — his cap fades on lime,
 * his body fades on violet (see docs/ROADMAP.md §3).
 */
export function Pilo({ mood = "ready", size = 96, className }: PiloProps) {
  return (
    <Image
      src={MOOD_SRC[mood]}
      alt={MOOD_ALT[mood]}
      width={size}
      height={size}
      className={className}
      priority={false}
    />
  );
}
