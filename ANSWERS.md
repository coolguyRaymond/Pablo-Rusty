# Answers

Name: Raymond Romero
Time spent: Read 5 min, Part A 12 min, Part B 10 min, Part C 45 min

## Assumptions

- Sell is read-only during cutover; the new CRM is the operating write path for visits, contacts and orders once a cafe is claimed.
- Matching can start rule-based (ABN, normalised name + suburb/postcode). Soft matches need a human confirm before they sync.
- Voice STT and any LLM calls for this flow run in Australia (data residency).
- For cafe matching in Part C: if several active cafes match the spoken name but only one is in the user's `accountIds`, auto-select that cafe (the others cannot be chosen anyway).
- `DraftResult.status`: `ready` = every request became a change; `needs_answers` = open questions or any errors while some changes exist (Confirm stays off); `refused` = nothing drafted (no changes). Price changes always refuse.

## Part A: architecture

I would start with a CRM `Account` as the operating master, with an `integrations` map holding `myobCustomerUid`, `sellOrgId[]`, match confidence, match status (`linked` | `suggested` | `unmatched`), and last sync cursors. Match in this order: (1) ABN / company number exact, (2) normalised legal/trading name + postcode, (3) billing email domain + suburb as a weak signal. Store every external id we accept. Do not collapse Sell duplicates until a human picks the survivor.

CRM owns operating fields: contacts, visit notes, delivery preferences, open order requests. MYOB owns legal name, ABN, billing address, payment terms, invoices and balances. Sell is transitional for pipeline history only; import once, then freeze writes. A phone change in CRM should not overwrite MYOB billing phone until finance confirms. An invoice total never originates in CRM.

For conflicts, use field-level last-write-wins with source priority: MYOB wins money and legal fields; CRM wins ops; equal-priority ops use `updatedAt` and actor. Divergent legal fields open a `sync_conflict` for finance instead of a silent overwrite.

Outbound jobs should be idempotent (`Idempotency-Key` = entity id + version). Use exponential backoff on 429/5xx and honour `Retry-After`. Keep an inbox of failed jobs. Do not auto-create on an ambiguous match, or you risk duplicate MYOB cards.

Keep append-only sync events (who, what, before, after, correlation id). Run a daily unmatched report: CRM without MYOB, Sell orphans, confidence below threshold.

Store OAuth tokens in Azure Key Vault; the app uses managed identity. Refresh MYOB offline tokens server-side; rotate the Sell token on a schedule and on 401. Logs should hold ids and correlation ids only. Hash or redact names, phones and emails.

Later, Business Central can consume the same account id. The biggest worry is duplicate Sell orgs creating duplicate MYOB customers during cutover.

```
Sell ──import/freeze──► CRM Account (ops master) ◄──staff──► API
                              │ linked ids
                              ▼
                         MYOB (finance master)
```

## Part B: AI and voice

### The flow

1. **Path.** Phone app records audio → STT in AU (on-device if quality allows, else AU speech API) → transcript to an AU-hosted worker. The LLM proposes structured intents only (no direct DB writes). The worker calls our internal API as the rep through MCP tools that wrap the same permissioned endpoints staff already use. Output is a draft (`toDraftAction` style), not a save.
2. **Confirmation.** Rep sees a confirm card: visit, order request, reminder in plain words, low-confidence flags, questions. Nothing persists until Confirm.
3. **Permissions.** MCP/API use the rep's access token. Tools enforce `accountIds` and `visit.log` / `order.request` / `reminder.create`. The model never gets a service account.
4. **Guardrails.** Treat transcript and notes as untrusted data, not instructions. System prompt separates "user content". Allow-listed tools only; refuse price changes and out-of-scope tools. Schema validation before draft; server re-checks permissions on save.
5. **Audit.** Store intent id, tool names, entity ids, draft hash, confirm/cancel, model version. Omit raw audio when possible; if kept, AU encrypted store with short TTL. Redact PII from application logs.
6. **Poor reception.** Queue encrypted audio/transcript on device; show "pending sync"; run STT/LLM/draft when back online; still require confirm before write.
7. **Testing.** Golden transcripts → fixed JSON intents; contract tests on `toDraftAction`; eval set with expected entities; determinism via pinned schemas not pinned prose; human review sample of live drafts.

### Where Rust fits, and where it does not

I would not introduce Rust for this product now. One TypeScript stack on Azure is enough for a small team. Voice draft, CRM API and sync are I/O-bound and permission-heavy, not CPU-bound. I would only revisit Rust later for a sealed token/crypto helper or a hot sync worker if profiling showed a real need, and only if someone can own that second language.

## Part C: coding notes

### C1: `toDraftAction`

- `ready`: every request became a change; no questions; no errors.
- `needs_answers`: one or more questions, or some changes plus remaining errors (Confirm stays off).
- `refused`: nothing drafted (all errors / price refuse).
- Same cafe question is only shown once when visit and order both hit the same ambiguity.
- If several cafes match the spoken name but only one is in `accountIds`, that cafe is auto-selected.
- Day names only (e.g. Friday). Unknown phrases error with `date_unresolved`.
- Convert Sydney 9:00 am to a UTC instant with `Intl` (including daylight saving).

### C2: `ConfirmDraftCard`

- Plain-language changes with cafe/product names, not ids.
- Status pill + icons/words for ready / needs answers / refused; colour is never the only signal.
- Confidence below 0.8 is a warning; it does not block Confirm (questions, errors and non-ready status do).
- Confirm / Edit / Cancel at least 44px; Confirm disabled when unresolved or saving/saved.
- `aria-live` region announces saving / saved / error; labelled heading; focus-visible rings.
- At 800px and up, changes and questions sit side by side; stacked on 390px.
- Screenshots use `ambiguous-cafe` at 390 and 1280 (question, low confidence, disabled Confirm).

### C3: tests

- Clean draft + Friday → `2026-11-26T22:00:00.000Z` / `Fri 27 Nov, 9:00 am`.
- Today-is-Friday rolls to next Friday.
- Ambiguous cafe question + options; price refuse; quantity over 100 kg; no access.
- Card: Confirm disabled with unresolved cafe; ready card shows Pioneer by name.
- Not covered: Edit flow, every saveState UI path, or rarer daylight-saving edges.

### If I had more time

- Selectable answers for questions that feed back into `toDraftAction`.
- Component tests for saving / error / saved banners.
- Tighter transcript layout on wide screens; more date phrases ("tomorrow", "next Monday").
