import { describe, expect, it } from "vitest";

describe("smoke", () => {
  it("keeps the test runner wired up until Sprint 1 adds real suites", () => {
    expect(1 + 1).toBe(2);
  });
});
