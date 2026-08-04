// Same six-tone palette as lib/ui/course-tone.ts's CourseTone union and
// migration 0018's check constraint. Kept as its own plain module (not
// exported from settings/actions.ts) because a "use server" file may only
// export async functions — a const array/type export there breaks the
// build ("A 'use server' file can only export async functions").
export const AVATAR_COLORS = ["violet", "mint", "tangerine", "coral", "sky", "lime"] as const;
export type AvatarColor = (typeof AVATAR_COLORS)[number];

export function isAvatarColor(value: string): value is AvatarColor {
  return (AVATAR_COLORS as readonly string[]).includes(value);
}
