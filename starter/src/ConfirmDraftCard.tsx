import { useEffect, useId, useRef } from "react";
import type { DraftChange, DraftContext, DraftResult, SaveState } from "./types";

export type ConfirmDraftCardProps = {
  result: DraftResult;
  context: DraftContext;
  saveState: SaveState;
  errorMessage?: string;
  onConfirm: () => void;
  onEdit: () => void;
  onCancel: () => void;
};

const LOW_CONFIDENCE = 0.8;

function cafeName(context: DraftContext, cafeId: string): string {
  return context.cafes.find((c) => c.id === cafeId)?.name ?? cafeId;
}

function productName(context: DraftContext, productId: string): string {
  return context.products.find((p) => p.id === productId)?.name ?? productId;
}

function describeChange(change: DraftChange, context: DraftContext): string {
  if (change.kind === "visit") {
    const note = change.note ? ` Note: ${change.note}` : "";
    return `Log a visit to ${cafeName(context, change.cafeId)}.${note}`;
  }
  if (change.kind === "order_request") {
    const when = change.neededByText ? ` (${change.neededByText})` : "";
    return `Request ${change.quantityKg} kg of ${productName(context, change.productId)} for ${cafeName(context, change.cafeId)}${when}.`;
  }
  return `Remind you ${change.dueLocalLabel}: ${change.text}.`;
}

function statusLabel(status: DraftResult["status"]): string {
  if (status === "ready") return "Ready to save";
  if (status === "needs_answers") return "Needs your answers";
  return "Cannot save yet";
}

/** Confirm card shown before anything is saved. */
export function ConfirmDraftCard(props: ConfirmDraftCardProps) {
  const { result, context, saveState, errorMessage, onConfirm, onEdit, onCancel } = props;
  const titleId = useId();
  const statusId = useId();
  const liveRef = useRef<HTMLDivElement>(null);

  // Questions/errors block confirm; low confidence is a warning only.
  const unresolved =
    result.status !== "ready" ||
    result.questions.length > 0 ||
    result.errors.length > 0 ||
    (result.draft?.changes.some((c) => c.confidence < LOW_CONFIDENCE) ?? false);

  const blockingUnresolved =
    result.status !== "ready" || result.questions.length > 0 || result.errors.length > 0;

  const canConfirm = saveState === "idle" && !blockingUnresolved && !!result.draft?.changes.length;
  const busy = saveState === "saving";
  const done = saveState === "saved";

  useEffect(() => {
    if (!liveRef.current) return;
    if (saveState === "saving") liveRef.current.textContent = "Saving your draft.";
    else if (saveState === "saved") liveRef.current.textContent = "Draft saved.";
    else if (saveState === "error")
      liveRef.current.textContent = errorMessage ?? "Save failed.";
    else liveRef.current.textContent = "";
  }, [saveState, errorMessage]);

  return (
    <section className="card" aria-labelledby={titleId} aria-describedby={statusId}>
      <div className="card-header">
        <h2 id={titleId}>Check this before saving</h2>
        <p id={statusId} className={`status-pill status-${result.status}`}>
          <span className="status-icon" aria-hidden="true">
            {result.status === "ready" ? "✓" : result.status === "needs_answers" ? "?" : "!"}
          </span>
          <span>{statusLabel(result.status)}</span>
        </p>
      </div>

      <div className="sr-only" role="status" aria-live="polite" ref={liveRef} />

      {saveState === "saved" && (
        <p className="banner banner-success" role="status">
          <span aria-hidden="true">✓ </span>
          Saved. Nothing else to do on this card.
        </p>
      )}

      {saveState === "error" && (
        <p className="banner banner-error" role="alert">
          <span aria-hidden="true">! </span>
          {errorMessage ?? "We could not save this. Check your connection and try again."}
        </p>
      )}

      {saveState === "saving" && (
        <p className="banner banner-busy" role="status">
          <span className="spinner" aria-hidden="true" />
          Saving…
        </p>
      )}

      <div className="card-body-grid">
        {result.draft && result.draft.changes.length > 0 && (
          <div className="block">
            <h3 className="block-title">Changes</h3>
            <ul className="change-list">
              {result.draft.changes.map((change, index) => {
                const low = change.confidence < LOW_CONFIDENCE;
                return (
                  <li key={`${change.kind}-${index}`} className={low ? "change low" : "change"}>
                    <p className="change-text">{describeChange(change, context)}</p>
                    {low && (
                      <p className="flag flag-warn">
                        <span aria-hidden="true">⚠ </span>
                        Low confidence ({Math.round(change.confidence * 100)}%). Check before
                        saving.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="block-stack">
          {result.questions.length > 0 && (
            <div className="block">
              <h3 className="block-title">
                <span aria-hidden="true">? </span>
                Questions
              </h3>
              <ul className="issue-list">
                {result.questions.map((q) => (
                  <li key={`${q.requestIndex}-${q.field}`} className="issue issue-question">
                    <p>{q.prompt}</p>
                    {q.options && q.options.length > 0 && (
                      <ul className="option-list">
                        {q.options.map((opt) => (
                          <li key={opt.id}>{opt.label}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="block">
              <h3 className="block-title">
                <span aria-hidden="true">! </span>
                Errors
              </h3>
              <ul className="issue-list">
                {result.errors.map((err) => (
                  <li key={`${err.requestIndex}-${err.code}`} className="issue issue-error">
                    {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {!result.draft && result.errors.length === 0 && result.questions.length === 0 && (
        <p className="muted">Nothing to show for this intent.</p>
      )}

      {unresolved && result.status !== "ready" && saveState === "idle" && (
        <p className="hint">
          <span aria-hidden="true">→ </span>
          Confirm stays off until questions and errors are cleared.
        </p>
      )}

      <div className="actions" role="group" aria-label="Draft actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={onConfirm}
          disabled={!canConfirm || busy || done}
          aria-disabled={!canConfirm || busy || done}
        >
          Confirm
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onEdit}
          disabled={busy || done}
        >
          Edit
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </button>
      </div>
    </section>
  );
}
