import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FieldError } from "@/components/ui/FieldError";

// SR-03 (docs/PRODUCT_REVIEW_3.md) — FieldError is the fix for ~30
// standalone role="alert" copies that used a fixed dark token
// (text-coral-text) on a background that flips dark, measuring 2.6:1 in
// dark mode. This guards the two things that matter about the shared
// component: the ARIA role every caller relies on, and that no caller
// path can silently drop it.
//
// D-03 (docs/UIUX_REVIEW.md) — the SR-03 follow-up (bare text-coral, no
// -tint) turned out to only clear AA in dark mode; light mode measured
// 3.11:1, still short of 4.5:1. Fixed by pairing text-coral-text with its
// own bg-coral-tint (both theme-invariant, so neither half of the pair
// ever flips out from under the other) instead of banning -text tokens
// outright — the test below was updated to guard the pairing, not a
// blanket absence of -text.
describe("FieldError", () => {
  it('always renders role="alert", as a <p> by default', () => {
    render(<FieldError>Title is required.</FieldError>);
    const alert = screen.getByRole("alert");
    expect(alert.tagName).toBe("P");
    expect(alert).toHaveTextContent("Title is required.");
  });

  it('renders as a <span> with as="span", still role="alert"', () => {
    render(<FieldError as="span">Pick a course.</FieldError>);
    const alert = screen.getByRole("alert");
    expect(alert.tagName).toBe("SPAN");
  });

  it("never uses a fixed dark -text token without its own -tint background", () => {
    const { container } = render(<FieldError>Error</FieldError>);
    const html = container.innerHTML;
    const usesFixedTextToken = /text-coral-text|text-mint-text|text-tangerine-text/.test(html);
    const usesMatchingTint = /bg-coral-tint|bg-mint-tint|bg-tangerine-tint/.test(html);
    expect(usesFixedTextToken).toBe(true);
    expect(usesMatchingTint).toBe(true);
  });
});
