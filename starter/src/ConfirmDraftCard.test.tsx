import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConfirmDraftCard } from "./ConfirmDraftCard";
import { context, intents } from "./fixtures";
import { toDraftAction } from "./draft";

describe("ConfirmDraftCard", () => {
  it("disables Confirm when a cafe question is unresolved", () => {
    const result = toDraftAction(intents["ambiguous-cafe"]!, context);
    render(
      <ConfirmDraftCard
        result={result}
        context={context}
        saveState="idle"
        onConfirm={() => {}}
        onEdit={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
    expect(screen.getAllByText(/Which cafe did you mean/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Corner Bean \(Newtown\)/i).length).toBeGreaterThan(0);
  });

  it("allows Confirm on a ready draft and shows product names not ids", () => {
    const result = toDraftAction(intents.clean!, context);
    render(
      <ConfirmDraftCard
        result={result}
        context={context}
        saveState="idle"
        onConfirm={() => {}}
        onEdit={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Confirm" })).toBeEnabled();
    expect(
      screen.getByText(/Request 2 kg of Pioneer for Harbour Lane Cafe/i),
    ).toBeInTheDocument();
  });
});
