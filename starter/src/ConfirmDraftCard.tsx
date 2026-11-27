import type { DraftContext, DraftResult, SaveState } from "./types";

export type ConfirmDraftCardProps = {
  result: DraftResult;
  context: DraftContext;
  saveState: SaveState;
  errorMessage?: string;
  onConfirm: () => void;
  onEdit: () => void;
  onCancel: () => void;
};

/**
 * TASK C2.
 *
 * Show the draft before anything is saved. See Part C of the test document for what we look for.
 * Use the classes in styles.css or replace them. Plain CSS is fine. No UI library needed.
 */
export function ConfirmDraftCard(props: ConfirmDraftCardProps) {
  return (
    <section className="card" aria-labelledby="draft-title">
      <h2 id="draft-title">Check this before saving</h2>
      <p>Not built yet. {props.result.draft?.changes.length ?? 0} change(s) in the draft.</p>
    </section>
  );
}
