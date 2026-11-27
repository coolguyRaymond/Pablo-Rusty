import type {
  Cafe,
  DraftChange,
  DraftContext,
  DraftError,
  DraftQuestion,
  DraftResult,
  IntentRequest,
  Product,
  VoiceIntent,
} from "./types";

const NOTE_LIMIT = 200;

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

/** Strip case and punctuation so "Porter St" and "porter-st" compare equal. */
export function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function trimCap(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max);
}

function matchActiveCafes(cafeText: string, cafes: Cafe[]): Cafe[] {
  const needle = normalizeText(cafeText);
  if (!needle) return [];
  return cafes.filter((cafe) => {
    if (!cafe.active) return false;
    const name = normalizeText(cafe.name);
    return name === needle || name.includes(needle);
  });
}

function matchActiveProduct(productText: string, products: Product[]): Product | undefined {
  const needle = normalizeText(productText);
  if (!needle) return undefined;
  return products.find((product) => {
    if (!product.active) return false;
    if (normalizeText(product.name) === needle) return true;
    return product.aliases.some((alias) => normalizeText(alias) === needle);
  });
}

type SydneyParts = {
  year: number;
  month: number;
  day: number;
  weekday: string;
  hour: number;
  minute: number;
};

function sydneyParts(date: Date): SydneyParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: get("weekday"),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

/** Convert a wall-clock time in Australia/Sydney to a UTC Date. */
export function sydneyLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  let guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 4; i++) {
    const seen = sydneyParts(new Date(guess));
    const seenAsUtc = Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute, 0);
    const wantedAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
    const delta = wantedAsUtc - seenAsUtc;
    if (delta === 0) break;
    guess += delta;
  }
  return new Date(guess);
}

function addCalendarDays(year: number, month: number, day: number, add: number) {
  // Noon UTC avoids most DST edge confusion when stepping calendar days.
  const mid = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  mid.setUTCDate(mid.getUTCDate() + add);
  return { year: mid.getUTCFullYear(), month: mid.getUTCMonth() + 1, day: mid.getUTCDate() };
}

/** Next weekday at 09:00 Australia/Sydney → UTC. */
export function resolveDayNameReminder(
  datePhrase: string,
  receivedAt: string,
): { dueAt: string; dueLocalLabel: string } | null {
  const phrase = datePhrase.trim().toLowerCase();
  const idx = WEEKDAYS.indexOf(phrase as (typeof WEEKDAYS)[number]);
  if (idx < 0) return null;

  const now = new Date(receivedAt);
  if (Number.isNaN(now.getTime())) return null;

  const today = sydneyParts(now);
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const todayIdx = weekdayMap[today.weekday];
  if (todayIdx === undefined) return null;

  let delta = idx - todayIdx;
  if (delta <= 0) delta += 7;

  const target = addCalendarDays(today.year, today.month, today.day, delta);
  const due = sydneyLocalToUtc(target.year, target.month, target.day, 9, 0);

  const labelParts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(due);

  const p = (type: string) => labelParts.find((x) => x.type === type)?.value ?? "";
  let hour = Number(p("hour"));
  if (hour === 0) hour = 12;
  const dueLocalLabel = `${p("weekday")} ${p("day")} ${p("month")}, ${hour}:${p("minute")} ${p("dayPeriod").toLowerCase()}`;

  return { dueAt: due.toISOString(), dueLocalLabel };
}

type CafeResolve =
  | { ok: true; cafe: Cafe }
  | { ok: false; question?: DraftQuestion; error?: DraftError };

function resolveCafe(
  cafeText: string,
  requestIndex: number,
  context: DraftContext,
): CafeResolve {
  const trimmed = cafeText.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: {
        requestIndex,
        code: "cafe_empty",
        message: "Cafe name is missing.",
      },
    };
  }

  const matches = matchActiveCafes(trimmed, context.cafes);
  if (matches.length === 0) {
    return {
      ok: false,
      error: {
        requestIndex,
        code: "cafe_not_found",
        message: `No active cafe matches “${trimmed}”.`,
      },
    };
  }

  const accessible = matches.filter((c) => context.user.accountIds.includes(c.id));

  if (matches.length === 1) {
    const cafe = matches[0]!;
    if (!context.user.accountIds.includes(cafe.id)) {
      return {
        ok: false,
        error: {
          requestIndex,
          code: "cafe_forbidden",
          message: `You do not have access to ${cafe.name}.`,
        },
      };
    }
    return { ok: true, cafe };
  }

  // Several name matches. Only offer cafes the user can access.
  if (accessible.length === 0) {
    return {
      ok: false,
      error: {
        requestIndex,
        code: "cafe_forbidden",
        message: `More than one cafe matches “${trimmed}”, but you cannot access any of them.`,
      },
    };
  }

  if (accessible.length === 1) {
    return { ok: true, cafe: accessible[0]! };
  }

  return {
    ok: false,
    question: {
      requestIndex,
      field: "cafeId",
      prompt: `Which cafe did you mean by “${trimmed}”?`,
      options: accessible.map((c) => ({
        id: c.id,
        label: `${c.name} (${c.suburb})`,
      })),
    },
  };
}

function hasPermission(
  context: DraftContext,
  permission: (typeof context.user.permissions)[number],
): boolean {
  return context.user.permissions.includes(permission);
}

function processRequest(
  request: IntentRequest,
  requestIndex: number,
  intent: VoiceIntent,
  context: DraftContext,
): { change?: DraftChange; question?: DraftQuestion; error?: DraftError } {
  if (request.type === "change_price") {
    return {
      error: {
        requestIndex,
        code: "price_change_forbidden",
        message: "Reps cannot change prices. Ask a manager if a price update is needed.",
      },
    };
  }

  if (request.type === "log_visit") {
    if (!hasPermission(context, "visit.log")) {
      return {
        error: {
          requestIndex,
          code: "permission_denied",
          message: "You do not have permission to log visits.",
        },
      };
    }
    const cafe = resolveCafe(request.cafeText, requestIndex, context);
    if (!cafe.ok) return { question: cafe.question, error: cafe.error };
    return {
      change: {
        kind: "visit",
        cafeId: cafe.cafe.id,
        note: trimCap(request.note ?? "", NOTE_LIMIT),
        confidence: request.confidence,
      },
    };
  }

  if (request.type === "order_request") {
    if (!hasPermission(context, "order.request")) {
      return {
        error: {
          requestIndex,
          code: "permission_denied",
          message: "You do not have permission to request orders.",
        },
      };
    }
    const cafe = resolveCafe(request.cafeText, requestIndex, context);
    if (!cafe.ok) return { question: cafe.question, error: cafe.error };

    const productText = request.productText.trim();
    const product = matchActiveProduct(productText, context.products);
    if (!product) {
      return {
        error: {
          requestIndex,
          code: "product_not_found",
          message: `No active product matches “${productText || "(empty)"}”.`,
        },
      };
    }

    const qty = request.quantityKg;
    if (qty === undefined || qty === null || Number.isNaN(qty)) {
      return {
        error: {
          requestIndex,
          code: "quantity_missing",
          message: "Order quantity is missing.",
        },
      };
    }
    if (!(qty > 0 && qty <= 100)) {
      return {
        error: {
          requestIndex,
          code: "quantity_invalid",
          message: "Quantity must be more than 0 kg and at most 100 kg.",
        },
      };
    }

    return {
      change: {
        kind: "order_request",
        cafeId: cafe.cafe.id,
        productId: product.id,
        quantityKg: qty,
        neededByText: request.neededByText?.trim() || undefined,
        confidence: request.confidence,
      },
    };
  }

  if (request.type === "create_reminder") {
    if (!hasPermission(context, "reminder.create")) {
      return {
        error: {
          requestIndex,
          code: "permission_denied",
          message: "You do not have permission to create reminders.",
        },
      };
    }
    const text = trimCap(request.text, NOTE_LIMIT);
    if (!text) {
      return {
        error: {
          requestIndex,
          code: "reminder_empty",
          message: "Reminder text is missing.",
        },
      };
    }
    const resolved = resolveDayNameReminder(request.datePhrase, intent.receivedAt);
    if (!resolved) {
      return {
        error: {
          requestIndex,
          code: "date_unresolved",
          message: `Could not work out a date from “${request.datePhrase.trim()}”.`,
        },
      };
    }
    return {
      change: {
        kind: "reminder",
        text,
        dueAt: resolved.dueAt,
        dueLocalLabel: resolved.dueLocalLabel,
        confidence: request.confidence,
      },
    };
  }

  return {
    error: {
      requestIndex,
      code: "unknown_request",
      message: "Unknown request type.",
    },
  };
}

/** Turn a voice intent into a draft, questions or errors. Does not write or mutate inputs. */
export function toDraftAction(intent: VoiceIntent, context: DraftContext): DraftResult {
  const changes: DraftChange[] = [];
  const questions: DraftQuestion[] = [];
  const errors: DraftError[] = [];

  intent.requests.forEach((request, requestIndex) => {
    const outcome = processRequest(request, requestIndex, intent, context);
    if (outcome.change) changes.push(outcome.change);
    if (outcome.question) {
      const dup = questions.some(
        (q) =>
          q.field === outcome.question!.field &&
          q.prompt === outcome.question!.prompt,
      );
      if (!dup) questions.push(outcome.question);
    }
    if (outcome.error) errors.push(outcome.error);
  });

  const draft =
    changes.length > 0
      ? { intentId: intent.id, changes }
      : null;

  let status: DraftResult["status"];
  if (questions.length > 0 || (errors.length > 0 && changes.length > 0)) {
    status = "needs_answers";
  } else if (changes.length === 0) {
    status = "refused";
  } else if (errors.length > 0) {
    status = "refused";
  } else {
    status = "ready";
  }

  if (
    status === "ready" &&
    (changes.length !== intent.requests.length || errors.length > 0 || questions.length > 0)
  ) {
    status = changes.length === 0 ? "refused" : "needs_answers";
  }

  return { status, draft, questions, errors };
}
