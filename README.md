# Prodigy Commissary Admin Redesign

Clickable HTML mockup of the role-based redesign of Prodigy's commissary admin software. Built for jail staff first: detention officers, commissary managers, jail administrators, and auditors, with Prodigy support and accounting views kept separate.

## Use it

Open `docs/app.html` in a browser (or turn on GitHub Pages for the `docs/` folder and share the link). Pick a role; the data is shared across roles and persists in your browser. Reset it from the footer.

The working mockup is a small static app: no server, no build step. Everything a user does is computed from one in-browser dataset, so a deposit posted by an officer shows up in the manager's bank deposit, the auditor's reports, and Prodigy's ledger.

## Layout

```
docs/app.html            The working mockup (open this)
docs/app/store.js        Data model, seed data, and every action (deposit, fix, close-out, approvals...)
docs/app/ui.js           Router, role-aware shell, modal, toast
docs/app/views/*.js      One file per role: officer, manager, auditor, admin, prodigy
docs/app/app.css         Styles
docs/static/             Non-functional screens from the first design pass, kept for reference
docs/index.html          Landing page
source/                  The design-canvas artboards (.dc.html) the static screens were built from
build.py                 Converts source/*.dc.html into docs/static/*.html
tests/run.py             Playwright end-to-end checks for every role (python3 tests/run.py all)
```

## Testing

```
cd docs/static&& python3 -m http.server 8787 &
python3 tests/run.py all
```

Requires Playwright for Python with Chromium.

## Design rules

- One facility per jail login, fixed in the header. No facility picker on jail-side screens.
- Money actions use plain words (Deposit, Bill inmate, Fix, Pay out). Ledger terms never appear on jail-side screens.
- Every money transaction has a Fix button. Fixes post reversing entries, never edits, and print corrected receipts.
- The county holds the trust fund bank account. The bank deposit step documents the deposit and prints the slip.
- Status is one colored chip with one word.
- Tables fit a 1366px screen without horizontal scrolling.

## Status

| Role | What works |
| --- | --- |
| Detention Officer | Search, inmate page, deposits by cash/check/card with holds and card on file, billing from the facility's charge types, fix dialog (move, amount, void, hold changes) with reversing entries, manual inmate creation with duplicate check, receipts |
| Commissary Manager | Daily close-out checklist driven by real state, drawer count with Over/Short and verifier, bank deposit builder and mark-deposited, monthly reconciliation with sign-off, release payouts with form gating, cart decisions, posting, commissary transfer, refunds |
| Jail Administrator | Approvals queue that applies decisions, charge types, approval thresholds that change officer behavior, deposit and release rules, staff and auditor logins, activity log |
| Auditor | 16 reports computed from live data, audit packet, read-only ledger, report run log, CSV export |
| Prodigy | Fleet health, facility page with view-as into each role, Prodigy setup actions (JMS retry, card processor), support queue with working fixes, cross-facility ledger, commissions, bank accounts, journal entries |
