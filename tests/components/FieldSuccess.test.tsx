import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FieldSuccess } from "@/components/ui/FieldSuccess";

// D-03 (docs/UIUX_REVIEW.md) — bare text-mint standalone measured 1.76:1 on
// bg-card in light mode, the worst contrast found anywhere in the app.
// Mirrors FieldError's tint+text pairing (see FieldError.test.tsx) so a
// future success message can't drift back to a bare color either.
describe("FieldSuccess", () => {
  it('renders role="status" with the given text', () => {
    render(<FieldSuccess>Saved.</FieldSuccess>);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Saved.");
  });

  it("pairs the fixed dark -text token with its own -tint background", () => {
    const { container } = render(<FieldSuccess>Saved.</FieldSuccess>);
    const html = container.innerHTML;
    expect(html).toMatch(/text-mint-text/);
    expect(html).toMatch(/bg-mint-tint/);
  });
});
