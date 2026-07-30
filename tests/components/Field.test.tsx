import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Field, inputClass } from "@/components/ui/Field";

// TD4-01 (docs/PRODUCT_REVIEW_4.md) — Field/inputClass were defined
// identically (byte-for-byte, confirmed by diff before consolidating) in
// 5 and 7 form files respectively. One shared version now; this is what
// keeps any future form from drifting back to its own copy unnoticed.
describe("Field", () => {
  it("associates the label with its wrapped input (implicit <label> wrapping, no explicit ids)", () => {
    render(
      <Field label="Course name">
        <input name="name" />
      </Field>,
    );
    expect(screen.getByLabelText("Course name")).toBeInTheDocument();
  });

  it("shows the error via FieldError (role=alert) when one is passed", () => {
    render(
      <Field label="Course name" error="Name is required.">
        <input name="name" />
      </Field>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Name is required.");
  });

  it("shows no alert when there's no error", () => {
    render(
      <Field label="Course name">
        <input name="name" />
      </Field>,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("inputClass", () => {
  it("marks the border coral when hasError is true", () => {
    expect(inputClass(true)).toContain("border-coral");
    expect(inputClass(false)).not.toContain("border-coral");
  });

  it("appends the extra class only when given one — EventForm's min-w-0 case", () => {
    expect(inputClass(false)).not.toContain("min-w-0");
    expect(inputClass(false, "min-w-0")).toContain("min-w-0");
  });
});
