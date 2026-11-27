// Types for the voice draft task. You may add to these. Please explain any change in ANSWERS.md.

export type Cafe = {
  id: string;
  name: string;
  suburb: string;
  active: boolean;
};

export type Product = {
  id: string;
  name: string;
  /** Other names a rep might say out loud. */
  aliases: string[];
  kind: "blend" | "single_origin" | "other";
  active: boolean;
};

export type Permission = "visit.log" | "order.request" | "reminder.create" | "price.change";

export type CurrentUser = {
  id: string;
  displayName: string;
  /** For example "cafe_network_rep". */
  role: string;
  permissions: Permission[];
  /** Ids of the cafes this user may act on. */
  accountIds: string[];
};

/** What the speech and language step hands us. Treat every string as untrusted. */
export type IntentRequest =
  | { type: "log_visit"; cafeText: string; note?: string; confidence: number }
  | {
      type: "order_request";
      cafeText: string;
      productText: string;
      /** The model's reading of the quantity. Can be wrong, zero, negative or missing. */
      quantityKg?: number;
      /** Free text such as "next week". Keep it as written. */
      neededByText?: string;
      confidence: number;
    }
  | { type: "create_reminder"; text: string; datePhrase: string; confidence: number }
  | {
      type: "change_price";
      cafeText?: string;
      productText: string;
      newPricePerKg: number;
      confidence: number;
    };

export type VoiceIntent = {
  id: string;
  transcript: string;
  /** When the audio was received, ISO 8601 in UTC. This is "now" for date phrases. */
  receivedAt: string;
  requests: IntentRequest[];
};

export type DraftContext = {
  cafes: Cafe[];
  products: Product[];
  user: CurrentUser;
};

/** A change we would make if the rep confirms. A draft never writes anything. */
export type DraftChange =
  | { kind: "visit"; cafeId: string; note: string; confidence: number }
  | {
      kind: "order_request";
      cafeId: string;
      productId: string;
      quantityKg: number;
      neededByText?: string;
      confidence: number;
    }
  | {
      kind: "reminder";
      text: string;
      /** UTC instant, ISO 8601. */
      dueAt: string;
      /** The same instant for display, in Australia/Sydney, like "Fri 27 Nov, 9:00 am". */
      dueLocalLabel: string;
      confidence: number;
    };

export type DraftAction = {
  intentId: string;
  changes: DraftChange[];
};

export type DraftQuestion = {
  /** Which request in the intent this belongs to, by position. */
  requestIndex: number;
  field: string;
  prompt: string;
  /** Allowed answers, for example matching cafe ids. */
  options?: { id: string; label: string }[];
};

export type DraftError = {
  requestIndex: number;
  code: string;
  message: string;
};

export type DraftResult = {
  /**
   * ready: every request produced a valid change.
   * needs_answers: at least one question is open. Some changes may be valid already.
   * refused: nothing can be drafted.
   */
  status: "ready" | "needs_answers" | "refused";
  draft: DraftAction | null;
  questions: DraftQuestion[];
  errors: DraftError[];
};

export type SaveState = "idle" | "saving" | "error" | "saved";
