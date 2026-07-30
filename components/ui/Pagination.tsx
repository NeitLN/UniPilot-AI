"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
}

/** P-03: reusable Prev/Next control over a `page` search param — used by
 * Assignments and Grades, neither of which had any limit on how much they'd
 * try to render in one go before this. */
export function Pagination({ page, pageSize, total }: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(total, page * pageSize);

  function goTo(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) params.delete("page");
    else params.set("page", String(nextPage));
    router.push(params.size > 0 ? `${pathname}?${params.toString()}` : pathname);
  }

  return (
    <div className="mt-3 flex items-center justify-between gap-3">
      <p className="text-[12.5px] font-semibold text-ink-3">
        Showing {rangeStart}–{rangeEnd} of {total}
      </p>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
          className="flex min-h-11 items-center rounded-ctl bg-line px-3.5 text-xs font-bold text-ink-2 hover:bg-line-hover disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => goTo(page + 1)}
          disabled={page >= totalPages}
          className="flex min-h-11 items-center rounded-ctl bg-line px-3.5 text-xs font-bold text-ink-2 hover:bg-line-hover disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
