import Image from "next/image";

export interface LogoProps {
  /** "light" = for dark backgrounds (sidebar/ink), "dark" = for white/canvas backgrounds */
  tone?: "light" | "dark";
  size?: number;
  className?: string;
}

/**
 * Horizontal lockup: mark + "UniPilot" + "AI".
 * "AI" is violet on light backgrounds, lime on dark backgrounds (docs/ROADMAP.md §3).
 */
export function Logo({ tone = "light", size = 40, className }: LogoProps) {
  const aiColor = tone === "light" ? "text-lime" : "text-violet";
  const wordColor = tone === "light" ? "text-white" : "text-foreground";

  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <span
        className="flex items-center justify-center rounded-2xl bg-card shrink-0"
        style={{ width: size, height: size }}
      >
        <Image
          src="/pilo-icon.svg"
          alt="UniPilot AI"
          width={size * 0.78}
          height={size * 0.78}
        />
      </span>
      <span
        className={`font-display font-semibold text-xl tracking-tight ${wordColor}`}
      >
        UniPilot <span className={aiColor}>AI</span>
      </span>
    </div>
  );
}
