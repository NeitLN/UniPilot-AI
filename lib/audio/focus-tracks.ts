/** Focus Timer's "Lo-fi" background tracks — all CC0 / public domain, no
 * attribution required (see public/audio/CREDITS.md for source pages and
 * license verification). Real audio files, not synthesized noise. */
export interface FocusTrack {
  id: string;
  /** Short label for the toggle button. */
  label: string;
  src: string;
  /**
   * Transfer size in megabytes, rounded to one decimal.
   *
   * Stated so the toggle can say what it will cost before spending someone's
   * mobile data. `preload="none"` means nothing downloads until Lo-fi is
   * switched on, so until then the student has no way to know. Kept next to
   * the file it describes; a stale number here is cosmetic, never a broken
   * player. A unit test checks these against the files on disk.
   */
  sizeMb: number;
}

export const FOCUS_TRACKS: FocusTrack[] = [
  { id: "lofi-loop", label: "Lofi loop", src: "/audio/omfgdude-lofi-loop.ogg", sizeMb: 1.4 },
  {
    id: "gymnopedie-1",
    label: "Satie – Gymnopédie No. 1",
    src: "/audio/satie-gymnopedie-1.ogg",
    sizeMb: 2.2,
  },
  {
    id: "gymnopedie-3",
    label: "Satie – Gymnopédie No. 3",
    src: "/audio/satie-gymnopedie-3.ogg",
    sizeMb: 1.8,
  },
  { id: "reverie", label: "Debussy – Rêverie", src: "/audio/debussy-reverie.ogg", sizeMb: 3.9 },
];
