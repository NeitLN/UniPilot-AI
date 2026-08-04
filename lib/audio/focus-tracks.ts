/** Focus Timer's "Lo-fi" background tracks — all CC0 / public domain, no
 * attribution required (see public/audio/CREDITS.md for source pages and
 * license verification). Real audio files, not synthesized noise. */
export interface FocusTrack {
  id: string;
  /** Short label for the toggle button. */
  label: string;
  src: string;
}

export const FOCUS_TRACKS: FocusTrack[] = [
  { id: "lofi-loop", label: "Lofi loop", src: "/audio/omfgdude-lofi-loop.ogg" },
  { id: "gymnopedie-1", label: "Satie – Gymnopédie No. 1", src: "/audio/satie-gymnopedie-1.ogg" },
  { id: "gymnopedie-3", label: "Satie – Gymnopédie No. 3", src: "/audio/satie-gymnopedie-3.ogg" },
  { id: "reverie", label: "Debussy – Rêverie", src: "/audio/debussy-reverie.ogg" },
];
