import { ExportData } from "@/components/settings/ExportData";
import { DeleteAccountSection } from "@/components/settings/DeleteAccountSection";

/** Step 8.7 — export kept visually primary; delete is pushed to the bottom
 * with its own separator so it never sits next to "Save profile" or reads
 * as equally weighted with export. */
export function DataPrivacyCard({ userEmail }: { userEmail: string }) {
  return (
    <div className="flex flex-col gap-5">
      <ExportData />
      <div className="border-t border-border-subtle-2 pt-4">
        <DeleteAccountSection userEmail={userEmail} />
      </div>
    </div>
  );
}
