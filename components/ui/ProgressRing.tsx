const TRACK_CLASSES = {
  light: "stroke-ink/10",
  dark: "stroke-white/15",
} as const;

const FILL_CLASSES = {
  violet: "stroke-violet",
  lime: "stroke-lime",
  mint: "stroke-mint",
  ink: "stroke-ink",
  white: "stroke-white",
} as const;

export type ProgressRingTone = keyof typeof FILL_CLASSES;

export interface ProgressRingProps {
  /** 0-100, clamped. */
  value: number;
  size?: number;
  strokeWidth?: number;
  tone?: ProgressRingTone;
  /** "light" track for cards on a light/pastel surface, "dark" for hero
   * panels (violet/ink backgrounds). */
  track?: keyof typeof TRACK_CLASSES;
  /** Accessible label — must state what the percentage represents, e.g.
   * "Plan coverage, 80%", not just "80%" (brief §5.4: charts need a text
   * equivalent, not color/shape alone). */
  label: string;
  className?: string;
  children?: React.ReactNode;
}

/** SVG ring shared by AI Planner (coverage), GPA (target), Weekly Report
 * (goal arc) — see UNIPILOT_8_SCREENS_GENZ_UI_BUILD_ROADMAP.md Step 0.3.
 * Renders `children` centered (typically the exact numeric value as text —
 * never count-up, per docs/ANIMATION_SYSTEM.md's "numbers stay numbers"
 * rule) so the percentage is always readable as real text, not just shape. */
export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 10,
  tone = "violet",
  track = "light",
  label,
  className,
  children,
}: ProgressRingProps) {
  const pct = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct / 100);
  const center = size / 2;

  return (
    <div
      role="img"
      aria-label={label}
      className={`relative inline-flex items-center justify-center ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          className={TRACK_CLASSES[track]}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${center} ${center})`}
          className={`motion-safe:transition-[stroke-dashoffset] motion-safe:duration-300 motion-safe:ease-out ${FILL_CLASSES[tone]}`}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center text-center">{children}</div>}
    </div>
  );
}
