import Image from "next/image";
import { Tag } from "@/components/ui/Tag";

/** `note` is produced by the pure, unit-tested `derivePiloPlanNote` — this
 * component only renders it, never invents copy of its own. */
export function PiloPlanNote({ note, isDraft }: { note: string; isDraft: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-card-sm bg-card p-4">
      <Image
        src="/mascots/pilo-ai-planner.png"
        alt=""
        width={68}
        height={68}
        className="h-[68px] w-[68px] shrink-0 object-contain"
      />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-sm font-bold text-foreground">Pilo&rsquo;s note</h3>
          {isDraft && <Tag tone="violet">Draft</Tag>}
        </div>
        <p className="mt-1 text-[12.5px] font-semibold text-ink-2">{note}</p>
      </div>
    </div>
  );
}
