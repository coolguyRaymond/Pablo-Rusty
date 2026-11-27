import { describe, it, expect } from "vitest";
import { context, intents } from "./fixtures";
import { toDraftAction } from "./draft";

// TASK C3. Write at least three meaningful tests. Delete the todos you do not use.
// The fixtures are in src/fixtures. Dates are easy to get wrong, so test them.

describe("fixtures", () => {
  it("loads", () => {
    expect(context.cafes.length).toBeGreaterThan(0);
    expect(Object.keys(intents).length).toBeGreaterThan(0);
  });
});

describe("toDraftAction", () => {
  it("runs without throwing on every sample", () => {
    for (const intent of Object.values(intents)) {
      expect(() => toDraftAction(intent, context)).not.toThrow();
    }
  });

  it.todo("drafts the clean intent");
  it.todo("asks which cafe when two names are close");
  it.todo("works out Friday in Sydney time");
  it.todo("refuses a price change for this role");
});
