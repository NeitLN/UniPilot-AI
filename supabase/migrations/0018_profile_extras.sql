-- Design-review follow-up: three settings the pixel-match pass deliberately
-- left out because there was no real column to back them (see PR discussion
-- "chưa có thì build luôn"). Both additive, both nullable/defaulted like
-- every prior profiles migration (0015, 0017) — safe to roll forward.

alter table profiles
  -- Avatar accent color — a preset swatch behind the Pilo mascot circle in
  -- Settings/Logo, not a photo upload (this app has no image-upload
  -- infrastructure anywhere else, and a preset picker answers "Change
  -- avatar" honestly without inventing a storage bucket for one field).
  -- Same six-tone palette as lib/ui/course-tone.ts's CourseTone union.
  add column avatar_color text not null default 'violet'
    check (avatar_color in ('violet', 'mint', 'tangerine', 'coral', 'sky', 'lime')),
  -- Total credits required to graduate — GpaHero's comment (components/gpa/
  -- GpaHero.tsx) explains the "On track" card was dropped because this
  -- number didn't exist anywhere. Null means "not set", distinct from 0,
  -- so the On-track card can tell "no answer yet" from "somehow zero" and
  -- prompt for it instead of dividing by a false zero.
  add column program_total_credits int
    check (program_total_credits is null or program_total_credits > 0);
