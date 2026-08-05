import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { OnTrackSetupCard } from "@/components/gpa/OnTrackSetupCard";

/**
 * PROD-04 — "On track" needs both a target GPA and a total-credits figure,
 * and onboarding asks for neither. When either was missing the card simply
 * did not render: no card, no gap, no explanation. A silent absence is the
 * worst version of this, because a student cannot act on it or even report
 * it as a problem.
 *
 * The one thing this card has to get right is naming *which* field is
 * missing. A generic "finish your setup" would leave the student exactly
 * where the blank space did — knowing something is wrong, not what.
 */
describe("OnTrackSetupCard", () => {
  it("names only the missing field when the target GPA is already set", () => {
    render(<OnTrackSetupCard hasTargetGpa hasProgramCredits={false} />);
    expect(screen.getByText(/total credits your degree needs/)).toBeInTheDocument();
    expect(screen.queryByText(/a target GPA/)).not.toBeInTheDocument();
  });

  it("names only the missing field when the credits total is already set", () => {
    render(<OnTrackSetupCard hasTargetGpa={false} hasProgramCredits />);
    expect(screen.getByText(/a target GPA/)).toBeInTheDocument();
    expect(screen.queryByText(/total credits your degree needs/)).not.toBeInTheDocument();
  });

  it("names both when neither has been set", () => {
    render(<OnTrackSetupCard hasTargetGpa={false} hasProgramCredits={false} />);
    expect(
      screen.getByText(/a target GPA and the total credits your degree needs/),
    ).toBeInTheDocument();
  });

  it("agrees in number with how many fields are missing", () => {
    // "Add them in Settings" under a sentence naming one field reads as a
    // second, unexplained requirement.
    const { unmount } = render(<OnTrackSetupCard hasTargetGpa hasProgramCredits={false} />);
    expect(screen.getByRole("link")).toHaveTextContent("Add it in Settings");
    unmount();

    render(<OnTrackSetupCard hasTargetGpa={false} hasProgramCredits={false} />);
    expect(screen.getByRole("link")).toHaveTextContent("Add them in Settings");
  });

  it("points at the section of Settings that holds these fields, not just the page", () => {
    render(<OnTrackSetupCard hasTargetGpa={false} hasProgramCredits />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/settings#study-preferences");
  });
});
