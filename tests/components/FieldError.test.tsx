import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FieldError } from "@/components/ui/FieldError";

// SR-03 (docs/PRODUCT_REVIEW_3.md) — FieldError is the fix for ~30
// standalone role="alert" copies that used a fixed dark token
// (text-coral-text) on a background that flips dark, measuring 2.6:1 in
// dark mode. This guards the two things that matter about the shared
// component: the ARIA role every caller relies on, and that no caller
// path can silently drop it.
describe("FieldError", () => {
  it("always renders role=\"alert\", as a <p> by default", () => {
    render(<FieldError>Title is required.</FieldError>);
    const alert = screen.getByRole("alert");
    expect(alert.tagName).toBe("P");
    expect(alert).toHaveTextContent("Title is required.");
  });

  it("renders as a <span> with as=\"span\", still role=\"alert\"", () => {
    render(<FieldError as="span">Pick a course.</FieldError>);
    const alert = screen.getByRole("alert");
    expect(alert.tagName).toBe("SPAN");
  });

  it("never uses the fixed dark -text token standalone", () => {
    const { container } = render(<FieldError>Error</FieldError>);
    expect(container.innerHTML).not.toMatch(/text-coral-text|text-mint-text|text-tangerine-text/);
  });
});
