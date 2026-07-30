import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/export/csv";

describe("toCsv", () => {
  it("renders a header row followed by one row per record", () => {
    const csv = toCsv(
      [
        { title: "Essay", score: 90 },
        { title: "Lab 3", score: null },
      ],
      ["title", "score"],
    );
    expect(csv).toBe("title,score\r\nEssay,90\r\nLab 3,");
  });

  it("quotes fields containing commas, quotes, or newlines", () => {
    const csv = toCsv([{ title: 'Essay, "final" draft\nrevised' }], ["title"]);
    expect(csv).toBe('title\r\n"Essay, ""final"" draft\nrevised"');
  });

  it("renders just the header for an empty list", () => {
    expect(toCsv([], ["title", "score"])).toBe("title,score");
  });
});
