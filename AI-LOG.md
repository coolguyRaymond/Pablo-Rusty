# AI log

## Tools used

- Cursor (AI coding assistant)
- Vitest 2.x, Vite 5, TypeScript 5.5, React 18 (project stack)
- Google Chrome for screenshots (Playwright used once, then removed)

## What you used AI for

| Part | What you asked AI to do | Tool |
| --- | --- | --- |
| A | Draft architecture answer; I edited trade-offs and wording | Cursor |
| B | Draft voice/MCP flow and Rust note; I checked residency and confirmation | Cursor |
| C1 | Implement `toDraftAction` (matching, dates, permissions, status) | Cursor |
| C2 | Build `ConfirmDraftCard` and CSS; take 390/1280 screenshots | Cursor |
| C3 | Write Vitest cases for dates, ambiguity, permissions, card Confirm | Cursor |

## What you kept, changed and threw away

- Kept the starter types, fixtures, demo App shell and brand colour notes.
- Changed `draft.ts` and `ConfirmDraftCard.tsx` from stubs to full behaviour; expanded `styles.css` for accessibility and desktop layout.
- Did not block Confirm on low confidence alone; questions and errors already block.
- Removed Playwright after screenshots.
- Showed the same cafe ambiguity question only once when visit and order both matched it.

## One thing the AI got wrong

- First screenshots were the wrong width (both came out around 558px). I checked the file dimensions, then retook them in Chrome at 390 and 1280.
- JSX in a `.ts` test file failed to transform, so I moved the component tests to `ConfirmDraftCard.test.tsx`.

## Your statement

- I understand all of my submission and can explain every part of it in a call.

Name: Raymond Romero
Date: 26 Nov 2026
