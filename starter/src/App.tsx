import { useMemo, useState } from "react";
import { ConfirmDraftCard } from "./ConfirmDraftCard";
import { toDraftAction } from "./draft";
import { context, intents } from "./fixtures";
import type { SaveState } from "./types";

/**
 * Demo page. It lets you pick a sample intent and force the save state so you can see every state.
 * It is not part of the test. Change it freely.
 */
export function App() {
  const [intentKey, setIntentKey] = useState<string>("clean");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const intent = intents[intentKey]!;
  const result = useMemo(() => toDraftAction(intent, context), [intent]);

  return (
    <main className="page">
      <header className="page-header">
        <h1>Voice draft check</h1>
        <p className="muted">Sample data only. Nothing here is saved anywhere.</p>
      </header>

      <div className="demo-controls">
        <label>
          Sample intent
          <select value={intentKey} onChange={(e) => setIntentKey(e.target.value)}>
            {Object.keys(intents).map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </label>
        <label>
          Save state
          <select value={saveState} onChange={(e) => setSaveState(e.target.value as SaveState)}>
            <option value="idle">idle</option>
            <option value="saving">saving</option>
            <option value="error">error</option>
            <option value="saved">saved</option>
          </select>
        </label>
      </div>

      <blockquote className="transcript">
        <span className="muted">The rep said</span>
        <p>{intent.transcript}</p>
      </blockquote>

      <ConfirmDraftCard
        result={result}
        context={context}
        saveState={saveState}
        errorMessage={saveState === "error" ? "We could not save this. Check your connection and try again." : undefined}
        onConfirm={() => setSaveState("saving")}
        onEdit={() => setSaveState("idle")}
        onCancel={() => setSaveState("idle")}
      />
    </main>
  );
}
