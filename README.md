# Prodigy Commissary Admin Redesign

Clickable HTML mockup of the role-based redesign of Prodigy's commissary admin software. Built for jail staff first: detention officers, commissary managers, jail administrators, and auditors, with Prodigy support and accounting views kept separate.

## Browse it

Open `docs/index.html` in a browser, or turn on GitHub Pages for the `docs/` folder (Settings, Pages, Source: Deploy from a branch, Branch: main, Folder: /docs) and share the link.

## Layout

```
docs/            The static site. index.html is the role picker.
  Officer*.html  Detention Officer screens
  Manager*.html  Commissary Manager screens
  Main.html, Resident.html, Facility.html   Prodigy-side drafts
source/          The design-canvas artboards (.dc.html) the pages are built from
build.py         Converts source/*.dc.html into docs/*.html
```

To rebuild after editing the artboards:

```
python3 build.py source docs
```

## Design rules

- One facility per jail login, fixed in the header. No facility picker on jail-side screens.
- Money actions use plain words (Deposit, Bill inmate, Fix, Pay out). Ledger terms never appear on jail-side screens.
- Every money transaction has a Fix button. Fixes post reversing entries, never edits, and print corrected receipts.
- The county holds the trust fund bank account. The bank deposit step documents the deposit and prints the slip.
- Status is one colored chip with one word.
- Tables fit a 1366px screen without horizontal scrolling.

## Status

| Part | Screens | State |
| --- | --- | --- |
| Prodigy shell and navigation | Main, Resident, Facility | First draft |
| Detention Officer | Home, Inmate, Deposit, Bill/Fix, New inmate | Draft |
| Commissary Manager | Today, Drawer, Bank deposit, Reconcile, Releases, Orders | Draft |
| Auditor | Report library, read-only ledger | Not started |
| Jail Administrator | Approvals, charge types, limits, users | Not started |
| Handoff spec | Findings, before/after, developer spec | Not started |
