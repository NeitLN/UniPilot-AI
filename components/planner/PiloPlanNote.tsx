import Image from "next/image";
import { Tag } from "@/components/ui/Tag";

/** `note` is produced by the pure, unit-tested `derivePiloPlanNote` — this
 * component only renders it, never invents copy of its own. */
export function PiloPlanNote({ note, isDraft }: { note: string; isDraft: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-card-sm bg-card p-4">
      {/* pilo-note.png, not the full-body pilo-ai-planner.png the hero uses:
          that asset is a standing figure with ~55% empty margin, so at this
          size it shrank to an unreadable speck. This one is the bust,
          cropped to the subject. */}
      <Image
        src="/mascots/pilo-note.png"
        alt=""
        width={64}
        height={64}
        className="h-16 w-16 shrink-0 object-contain"
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
