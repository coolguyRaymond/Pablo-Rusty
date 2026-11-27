import type { DraftContext, DraftResult, VoiceIntent } from "./types";

/**
 * TASK C1.
 *
 * Turn a voice intent into a draft action, or into questions and errors.
 * This function must not write, call a network or change its inputs.
 *
 * Rules (see Part C of the test document for the full list):
 *  1. A cafe must match exactly one active cafe. If two or more match, ask which. If none, say so.
 *  2. A product must be in the catalogue.
 *  3. Quantity is in kilograms, more than 0 and at most 100.
 *  4. Dates are worked out in Australia/Sydney time from intent.receivedAt.
 *  5. The user must have access to the cafe's account and the permission for the request
 *     (log_visit: visit.log, order_request: order.request, create_reminder: reminder.create).
 *  6. This role may not change prices. Refuse it.
 *  7. Trim every string. Cap notes and reminder text at 200 characters.
 *
 * Replace the body below.
 */
export function toDraftAction(intent: VoiceIntent, context: DraftContext): DraftResult {
  void context;
  return {
    status: "refused",
    draft: null,
    questions: [],
    errors: [
      {
        requestIndex: 0,
        code: "not_implemented",
        message: `toDraftAction is not written yet (intent ${intent.id}).`,
      },
    ],
  };
}
