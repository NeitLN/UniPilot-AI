"use client";

import { useEffect } from "react";
import { TIMEZONE_COOKIE } from "@/lib/timezoneConstants";

function readCookie(name: string): string | undefined {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
}

/**
 * Stamps the viewer's IANA timezone into a cookie so Server Components can
 * bucket "which calendar day" a timestamp falls on for the *viewer*, not
 * wherever the server happens to run (e.g. UTC on Vercel).
 */
export function TimezoneCookie() {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (readCookie(TIMEZONE_COOKIE) === tz) return;
    document.cookie = `${TIMEZONE_COOKIE}=${tz}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  }, []);

  return null;
}
