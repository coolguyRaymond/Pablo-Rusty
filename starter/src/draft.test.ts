import { describe, it, expect } from "vitest";
import { context, intents } from "./fixtures";
import { resolveDayNameReminder, toDraftAction } from "./draft";

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

  it("drafts the clean intent with visit, order and Friday reminder", () => {
    const result = toDraftAction(intents.clean!, context);
    expect(result.status).toBe("ready");
    expect(result.errors).toHaveLength(0);
    expect(result.questions).toHaveLength(0);
    expect(result.draft?.changes).toHaveLength(3);

    const visit = result.draft!.changes.find((c) => c.kind === "visit");
    const order = result.draft!.changes.find((c) => c.kind === "order_request");
    const reminder = result.draft!.changes.find((c) => c.kind === "reminder");

    expect(visit).toMatchObject({ cafeId: "cafe_001" });
    expect(order).toMatchObject({
      cafeId: "cafe_001",
      productId: "prod_pioneer",
      quantityKg: 2,
    });
    expect(reminder).toMatchObject({
      dueAt: "2026-11-26T22:00:00.000Z",
      dueLocalLabel: "Fri 27 Nov, 9:00 am",
    });
  });

  it("asks which cafe when two names are close", () => {
    const result = toDraftAction(intents["ambiguous-cafe"]!, context);
    expect(result.status).toBe("needs_answers");
    expect(result.questions.length).toBeGreaterThanOrEqual(1);
    const cafeQuestion = result.questions.find((q) => q.field === "cafeId");
    expect(cafeQuestion?.options?.map((o) => o.id).sort()).toEqual([
      "cafe_002",
      "cafe_003",
    ]);
    // Reminder has no cafe and can still draft.
    expect(result.draft?.changes.some((c) => c.kind === "reminder")).toBe(true);
  });

  it("works out Friday in Sydney time when today is already Friday", () => {
    // receivedAt 2026-11-26T22:30:00Z = Fri 27 Nov 2026 09:30 Sydney → next Friday.
    const result = toDraftAction(intents["date-phrase"]!, context);
    expect(result.status).toBe("ready");
    const reminder = result.draft!.changes.find((c) => c.kind === "reminder");
    expect(reminder).toMatchObject({
      dueAt: "2026-12-03T22:00:00.000Z",
      dueLocalLabel: "Fri 4 Dec, 9:00 am",
    });
  });

  it("refuses a price change for this role", () => {
    const result = toDraftAction(intents["price-change"]!, context);
    expect(result.status).toBe("refused");
    expect(result.draft).toBeNull();
    expect(result.errors[0]?.code).toBe("price_change_forbidden");
  });

  it("errors when quantity is over 100 kg", () => {
    const result = toDraftAction(intents["odd-quantity"]!, context);
    expect(result.status).toBe("refused");
    expect(result.errors.some((e) => e.code === "quantity_invalid")).toBe(true);
  });

  it("errors when the user cannot access the matched cafe", () => {
    const result = toDraftAction(intents["no-access"]!, context);
    expect(result.status).toBe("refused");
    expect(result.errors[0]?.code).toBe("cafe_forbidden");
  });
});

describe("resolveDayNameReminder", () => {
  it("maps Wednesday morning Sydney to the coming Friday 9am", () => {
    // Wed 25 Nov 2026 10:30 Sydney
    const resolved = resolveDayNameReminder("Friday", "2026-11-24T23:30:00Z");
    expect(resolved).toEqual({
      dueAt: "2026-11-26T22:00:00.000Z",
      dueLocalLabel: "Fri 27 Nov, 9:00 am",
    });
  });
});
