import { StatTile } from "@/components/ui/StatTile";
import { formatMinutes } from "@/lib/rules/plan-presentation";
import { isHappeningNow, type ClassBlockLite } from "@/lib/rules/schedule-presentation";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function minutesUntil(iso: string, now: Date): number {
  return Math.round((new Date(iso).getTime() - now.getTime()) / 60000);
}

export function NextClassCard({ block, now }: { block: ClassBlockLite | null; now: Date }) {
  if (!block) {
    return (
      <div className="flex-1 rounded-card bg-card p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-3">Next class</p>
        <p className="mt-2 text-sm font-bold text-foreground">No more classes today</p>
      </div>
    );
  }

  const happeningNow = isHappeningNow(block, now);
  const minsAway = minutesUntil(block.startAt, now);

  return (
    <div className="flex-1 rounded-card bg-card p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-3">Next class</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <p className="font-display text-base font-bold text-foreground">{block.title}</p>
        {happeningNow ? (
          <span className="rounded-pill bg-mint-tint px-2 py-0.5 text-[10.5px] font-extrabold text-mint-text">
            Happening now
          </span>
        ) : (
          minsAway <= 120 && (
            <span className="rounded-pill bg-lime px-2 py-0.5 text-[10.5px] font-extrabold text-ink">
              In {minsAway < 60 ? `${minsAway} min` : `${formatMinutes(minsAway)}`}
            </span>
          )
        )}
      </div>
      <p className="mt-0.5 text-[12.5px] font-semibold text-ink-2">
        {formatTime(block.startAt)}–{formatTime(block.endAt)}
        {block.location && ` · ${block.location}`}
      </p>
    </div>
  );
}

export function ScheduleSummaryStrip({
  nextClassBlock,
  now,
  classesTodayCount,
  freeBlockCount,
  freeMinutesTotal,
}: {
  nextClassBlock: ClassBlockLite | null;
  now: Date;
  classesTodayCount: number;
  freeBlockCount: number;
  freeMinutesTotal: number;
}) {
  return (
    <div className="flex flex-col gap-2.5 sm:flex-row">
      <NextClassCard block={nextClassBlock} now={now} />
      <StatTile
        label={classesTodayCount === 1 ? "class today" : "classes today"}
        value={String(classesTodayCount)}
        className="flex-1"
      />
      <StatTile
        label={freeBlockCount === 1 ? "free block" : "free blocks"}
        value={String(freeBlockCount)}
        hint={freeBlockCount > 0 ? `${formatMinutes(freeMinutesTotal)} total` : undefined}
        className="flex-1"
      />
    </div>
  );
}
