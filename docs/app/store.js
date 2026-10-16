/* Prodigy Commissary working mockup: data store.
   Everything lives in localStorage under one key. Reset from the footer. */
(function () {
  const KEY = 'prodigy-commissary-mockup-v1';
  const DAY = 86400000;
  const NOW = () => new Date();

  // ---------- helpers ----------
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const money = (n) => (n < 0 ? '-' : '') + '$' + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const asDate = (iso) => (typeof iso === 'string' && iso.length === 10) ? new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10), 12) : new Date(iso);
  const fmtDate = (iso) => { const d = asDate(iso); return pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + '/' + d.getFullYear(); };
  const fmtTime = (iso) => { const d = new Date(iso); let h = d.getHours(); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + pad(d.getMinutes()) + ' ' + ap; };
  const fmtWhen = (iso) => { const d = new Date(iso), t = NOW(); const sameDay = d.toDateString() === t.toDateString(); const y = new Date(t - DAY); if (sameDay) return 'Today ' + fmtTime(iso); if (d.toDateString() === y.toDateString()) return 'Yesterday ' + fmtTime(iso); return fmtDate(iso) + ' ' + fmtTime(iso); };
  const dayKey = (iso) => { const d = new Date(iso); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const monthKey = (iso) => { const d = new Date(iso); return d.getFullYear() + '-' + pad(d.getMonth() + 1); };
  const round2 = (n) => Math.round(n * 100) / 100;
  let rngSeed = 7;
  const rand = () => { rngSeed = (rngSeed * 9301 + 49297) % 233280; return rngSeed / 233280; };
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const ri = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

  // ---------- seed ----------
  function seed() {
    rngSeed = 7;
    const today = NOW();
    const at = (daysAgo, h, m) => { const d = new Date(today); d.setDate(d.getDate() - daysAgo); d.setHours(h, m || 0, 0, 0); return d.toISOString(); };

    const facilities = [
      { id: 'atoka', name: 'Atoka County Jail', siteId: 'S001022023', state: 'OK', city: 'Atoka', tz: 'Central', jms: 'Tyler Odyssey Jail', jmsStatus: 'ok', lastFeed: at(0, 8, 52), cardProcessor: false, bank: 'First Bank of Atoka ****2290', warehouse: 'Prodigy Main Warehouse', cutoff: '4:00 PM', since: 2019 },
      { id: 'pott', name: 'Pottawatomie County', siteId: 'S001022031', state: 'OK', city: 'Shawnee', tz: 'Central', jms: 'Spillman', jmsStatus: 'ok', lastFeed: at(0, 8, 40), cardProcessor: true, bank: 'BancFirst ****7731', warehouse: 'Prodigy Main Warehouse', cutoff: '4:00 PM', since: 2021 },
      { id: 'douglas', name: 'Douglas County', siteId: 'S133713379', state: 'WI', city: 'Superior', tz: 'Central', jms: 'Zuercher', jmsStatus: 'stale', lastFeed: at(0, 4, 50), cardProcessor: true, bank: 'National Bank of Commerce ****1180', warehouse: 'Prodigy Main Warehouse', cutoff: '3:00 PM', since: 2022 },
      { id: 'cinci', name: 'Cincinnati Correctional Facility', siteId: 'S001033001', state: 'OH', city: 'Cincinnati', tz: 'Eastern', jms: 'Tyler', jmsStatus: 'ok', lastFeed: at(0, 8, 58), cardProcessor: true, bank: 'Fifth Third ****3302', warehouse: 'Cincinnati Facility Warehouse', cutoff: '4:00 PM', since: 2020 },
      { id: 'chicago', name: 'Chicago Correctional Facility', siteId: 'S001033005', state: 'IL', city: 'Chicago', tz: 'Central', jms: 'Tyler', jmsStatus: 'ok', lastFeed: at(0, 8, 55), cardProcessor: true, bank: 'Chase ****9008', warehouse: 'Prodigy Main Warehouse', cutoff: '4:00 PM', since: 2020 },
      { id: 'ector', name: 'Ector County', siteId: 'S001048135', state: 'TX', city: 'Odessa', tz: 'Central', jms: 'Tyler', jmsStatus: 'none', lastFeed: null, cardProcessor: false, bank: 'Not set', warehouse: 'Prodigy Main Warehouse', cutoff: '4:00 PM', since: 2026, installing: 'Go-live Oct 31' },
    ];

    const lastNames = ['ABBETT', 'ALEXANDER', 'ALLEN', 'ALLEN', 'BAKER', 'CARTER', 'DELGADO', 'EVANS', 'FOSTER', 'GARZA', 'HOLT', 'JAMES', 'KING', 'LOPEZ', 'MARTINEZ', 'NGUYEN', 'OWENS', 'PRICE', 'QUINN', 'REED', 'SANDERS', 'TAYLOR', 'UNDERWOOD', 'VANCE', 'WEBB', 'YOUNG', 'ZAMORA', 'BROOKS', 'CRUZ', 'DIXON', 'ELLIS', 'FLORES', 'GRANT', 'HAYES', 'IRWIN', 'JENKINS', 'KELLY', 'LONG', 'MORGAN', 'NASH'];
    const firstNames = ['ASHLEY MARIE', 'GUY', 'CHRISTOPHER WAYNE', 'CHRISTOPHER M', 'DAVID R', 'SAMANTHA J', 'MARIA E', 'TRAVIS L', 'JORDAN', 'PAUL', 'TIFFANY ANN', 'MARCUS', 'ELENA', 'ROBERT LEE', 'KAYLA', 'DEREK', 'ANTHONY', 'BRITTANY', 'JOSE LUIS', 'MICHAEL', 'DANIEL', 'RACHEL', 'TYLER', 'JESSICA', 'KEVIN', 'LAUREN', 'BRANDON', 'NICOLE', 'JUSTIN', 'AMBER'];
    const pods = ['Pod A', 'Pod B', 'Pod C', 'Booking holding'];

    const inmates = [];
    const txns = [];
    let bookingNo = 42100;
    let receiptNo = 10300;
    let txId = 51000;
    const users = {
      atoka: { officer: 'Ofc. J. Ramirez', officer2: 'Sgt. T. Boyd', manager: 'Donna Pruitt', admin: 'Capt. R. Hale' },
      pott: { officer: 'Ofc. K. Lane', officer2: 'Ofc. D. Hurst', manager: 'Lisa Grant', admin: 'Lt. M. Cole' },
      douglas: { officer: 'Dep. A. Olson', officer2: 'Dep. R. Berg', manager: 'Karen Lund', admin: 'Capt. S. Haug' },
      cinci: { officer: 'C.O. Brown', officer2: 'C.O. Norris', manager: 'Shannon Gillick', admin: 'Maj. T. Reese' },
      chicago: { officer: 'C.O. Patel', officer2: 'C.O. Diaz', manager: 'Marcus Hill', admin: 'Cmdr. L. Wong' },
      ector: { officer: 'Ofc. TBD', officer2: 'Ofc. TBD', manager: 'TBD', admin: 'Capt. TBD' },
    };

    const counts = { atoka: 14, pott: 16, douglas: 14, cinci: 18, chicago: 16, ector: 0 };
    const tx = (o) => { o.id = 'T-' + (txId++); txns.push(o); return o; };

    facilities.forEach((f) => {
      const n = counts[f.id];
      for (let i = 0; i < n; i++) {
        const booked = ri(1, 120);
        const inm = {
          id: f.id + '-' + i, facilityId: f.id, last: lastNames[(i * 7 + f.id.length) % lastNames.length], first: firstNames[(i * 5 + f.id.length) % firstNames.length],
          booking: '0000' + (bookingNo++), dob: (1960 + ri(0, 44)) + '-' + pad(ri(1, 12)) + '-' + pad(ri(1, 28)),
          housing: pick(pods) + ', Cell ' + ri(1, 24), bookedAt: at(booked, ri(0, 23), ri(0, 59)), status: 'in', createdManually: false, card: null, privilege: 'Normal', notes: [], heldFor: f.name.includes('County') ? f.name.replace(' Jail', '') : 'County',
        };
        inmates.push(inm);
        // booking cash
        if (rand() < 0.85) tx({ facilityId: f.id, inmateId: inm.id, type: 'deposit', tender: 'cash', amount: round2(ri(5, 120)), at: inm.bookedAt, by: users[f.id].officer2, receipt: receiptNo++, note: 'Booking cash', deposited: booked > 1 });
        // other deposits over time
        const extra = ri(0, 4);
        for (let k = 0; k < extra; k++) {
          const d = ri(0, Math.min(booked, 60));
          const tender = pick(['cash', 'cash', 'kiosk', 'card', 'check', 'money order']);
          const amt = round2(ri(10, 150));
          const t = tx({ facilityId: f.id, inmateId: inm.id, type: 'deposit', tender, amount: amt, at: at(d, ri(7, 20), ri(0, 59)), by: tender === 'kiosk' ? 'Kiosk' : pick([users[f.id].officer, users[f.id].officer2]), receipt: tender === 'kiosk' ? null : receiptNo++, note: tender === 'kiosk' ? 'Lobby kiosk deposit' : tender === 'check' ? 'Check from family' : 'Window deposit', deposited: d > 1 || tender === 'kiosk' || tender === 'card' });
          if (tender === 'check' && rand() < 0.5) { t.hold = { until: at(-ri(1, 10), 0, 0), amount: amt, released: false }; t.checkNo = String(ri(1000, 9999)); t.payer = pick(['Tyson Foods', 'Walmart', 'Family member', 'Oklahoma DOC']); }
        }
        // purchases
        const buys = ri(0, 5);
        for (let k = 0; k < buys; k++) { const d = ri(0, Math.min(booked, 45)); tx({ facilityId: f.id, inmateId: inm.id, type: 'purchase', amount: round2(ri(3, 60)), at: at(d, ri(6, 12), ri(0, 59)), by: 'System', orderNo: 77000 + ri(100, 999), items: ri(1, 9), note: 'Commissary order' }); }
        // charges
        if (rand() < 0.5) { const d = ri(0, Math.min(booked, 30)); tx({ facilityId: f.id, inmateId: inm.id, type: 'charge', chargeType: pick(['Medical visit', 'Medication', 'Copies', 'Property damage']), amount: pick([8, 8, 8, 12.6, 4.5, 25]), at: at(d, ri(6, 18), ri(0, 59)), by: pick([users[f.id].officer, users[f.id].officer2]), receipt: receiptNo++, note: pick(['Nurse sick call', 'Rx refill', 'Legal copies, 45 pages', 'Broken sprinkler head']) }); }
      }
      // a few released
      inmates.filter((x) => x.facilityId === f.id).slice(0, 3).forEach((x, j) => { x.status = 'released'; x.releasedAt = at(j, 9 + j, 10); x.releaseTo = pick(['Home (bonded out)', 'Home (time served)', 'Oklahoma DOC, Lexington', 'Transfer to Craig County']); });
    });

    // Atoka named cases used in the mock screens
    const a = inmates.filter((x) => x.facilityId === 'atoka');
    Object.assign(a[0], { last: 'ALLEN', first: 'CHRISTOPHER WAYNE', booking: '0000042262', dob: '1994-12-20', housing: 'Pod B, Cell 12', bookedAt: at(0, 7, 40), status: 'in', card: { brand: 'Visa', last4: '4417', savedAt: at(0, 7, 50) } });
    txns.filter((t) => t.inmateId === a[0].id).forEach((t) => (t.inmateId = 'x'));
    tx({ facilityId: 'atoka', inmateId: a[0].id, type: 'charge', chargeType: 'Medical visit', amount: 8, at: at(0, 6, 30), by: 'Ofc. J. Ramirez', receipt: receiptNo++, note: 'Nurse sick call' });
    tx({ facilityId: 'atoka', inmateId: a[0].id, type: 'deposit', tender: 'cash', amount: 43, at: at(0, 7, 45), by: 'Ofc. J. Ramirez', receipt: receiptNo++, note: 'Booking cash', deposited: false });
    tx({ facilityId: 'atoka', inmateId: a[0].id, type: 'deposit', tender: 'check', amount: 50, at: at(0, 7, 48), by: 'Ofc. J. Ramirez', receipt: receiptNo++, note: 'Payroll check', checkNo: '2211', payer: 'Tyson Foods', hold: { until: at(-7, 0, 0), amount: 50, released: false }, deposited: false });
    Object.assign(a[1], { last: 'ALEXANDER', first: 'GUY', booking: '0000015847', status: 'in', housing: 'Pod A, Cell 3' });
    tx({ facilityId: 'atoka', inmateId: a[1].id, type: 'deposit', tender: 'cash', amount: 25, at: at(0, 8, 52), by: 'Ofc. J. Ramirez', receipt: receiptNo++, note: 'Family at window', deposited: false });
    Object.assign(a[2], { last: 'ALLEN', first: 'CHRISTOPHER M', booking: '0000042198', status: 'in', housing: 'Pod C, Cell 7' });
    Object.assign(a[3], { last: 'HOLT', first: 'SAMANTHA J', booking: '0000042260', dob: '1990-04-02', status: 'in', createdManually: true, bookedAt: at(1, 21, 30), housing: 'Pod A, Cell 9' });
    Object.assign(a[4], { last: 'MARTINEZ', first: 'DAVID R', booking: '0000042261', status: 'in', bookedAt: at(0, 2, 15), housing: 'Pod B, Cell 4' });
    Object.assign(a[5], { last: 'GARZA', first: 'MARIA E', booking: '0000041902', status: 'released', releasedAt: at(0, 9, 10), releaseTo: 'Home (bonded out)', housing: 'Pod A, Cell 1' });
    txns.filter((t) => t.inmateId === a[5].id).forEach((t) => (t.inmateId = 'x'));
    tx({ facilityId: 'atoka', inmateId: a[5].id, type: 'deposit', tender: 'cash', amount: 320, at: at(12, 10, 5), by: 'Sgt. T. Boyd', receipt: receiptNo++, note: 'Booking cash', deposited: true });
    tx({ facilityId: 'atoka', inmateId: a[5].id, type: 'deposit', tender: 'check', amount: 25, at: at(3, 13, 20), by: 'Ofc. J. Ramirez', receipt: receiptNo++, note: 'Personal check', checkNo: '0412', payer: 'Family member', hold: { until: at(-4, 0, 0), amount: 25, released: false }, deposited: true });
    Object.assign(a[6], { last: 'WEBB', first: 'TRAVIS L', booking: '0000041877', status: 'released', releasedAt: at(1, 16, 30), releaseTo: 'Oklahoma DOC, Lexington', housing: 'Pod B, Cell 2' });
    Object.assign(a[7], { last: 'PRICE', first: 'JORDAN', booking: '0000041850', status: 'released', releasedAt: at(2, 11, 0), releaseTo: 'Home (time served)', housing: 'Pod C, Cell 1' });
    Object.assign(a[8], { last: 'ABBETT', first: 'ASHLEY MARIE', booking: '0000041801', status: 'in', housing: 'Pod A, Cell 5' });
    // rules
    a[4].rule = { text: 'No hygiene items until ' + fmtDate(at(-17, 0, 0)), blocks: ['Deodorant'] };

    // drop orphaned
    const live = txns.filter((t) => t.inmateId !== 'x');
    live.sort((x, y) => x.at < y.at ? -1 : 1);

    // carts
    const carts = [];
    let cartNo = 9000;
    inmates.filter((x) => x.status === 'in').forEach((x, i) => {
      if (rand() < 0.5) {
        const items = ri(1, 14), total = round2(ri(5, 130));
        const c = { id: 'C' + (cartNo++), facilityId: x.facilityId, inmateId: x.id, items, total, status: 'ready', at: at(0, ri(5, 11), ri(0, 59)) };
        if (total > 100) { c.status = 'decision'; c.reason = 'Over weekly limit'; c.detail = money(total) + ' of a $100.00 weekly limit.'; }
        if (x.rule) { c.status = 'decision'; c.reason = 'Restricted item'; c.detail = 'Rule "' + x.rule.text + '" blocks 1 item (Deodorant, $4.38).'; }
        carts.push(c);
      }
    });

    const settings = {};
    facilities.forEach((f) => {
      settings[f.id] = {
        chargeTypes: [
          { name: 'Medical visit', amount: 8, who: 'officer', active: true },
          { name: 'Medication', amount: null, who: 'officer', active: true },
          { name: 'Property damage', amount: null, who: 'manager', active: true },
          { name: 'Copies', amount: 0.1, who: 'officer', active: true, perPage: true },
          { name: 'Booking fee', amount: null, who: 'officer', active: false },
        ],
        approvals: { fixAfterDeposit: true, depositOver: { on: false, amount: 500 }, transfer: true, writeOff: true, chargeOver: { on: false, amount: 100 }, drawerVerify: true },
        deposits: { personalChecks: true, cardOnFile: true, cardFeePct: 5, weeklyLimit: 500 },
        releases: { debitCard: true, check: true, cash: false, staleDays: 90 },
      };
    });

    const staff = [];
    facilities.forEach((f) => {
      const u = users[f.id];
      staff.push({ id: f.id + '-admin', facilityId: f.id, name: u.admin, role: 'admin', email: u.admin.toLowerCase().replace(/[^a-z]/g, '') + '@' + f.id + '.gov', lastLogin: at(0, 10, 48), active: true });
      staff.push({ id: f.id + '-mgr', facilityId: f.id, name: u.manager, role: 'manager', email: u.manager.toLowerCase().replace(/[^a-z]/g, '') + '@' + f.id + '.gov', lastLogin: at(0, 10, 40), active: true });
      staff.push({ id: f.id + '-off1', facilityId: f.id, name: u.officer, role: 'officer', email: u.officer.toLowerCase().replace(/[^a-z]/g, '') + '@' + f.id + '.gov', lastLogin: at(0, 9, 15), active: true });
      staff.push({ id: f.id + '-off2', facilityId: f.id, name: u.officer2, role: 'officer', email: u.officer2.toLowerCase().replace(/[^a-z]/g, '') + '@' + f.id + '.gov', lastLogin: at(1, 15, 0), active: true });
      staff.push({ id: f.id + '-off3', facilityId: f.id, name: 'Ofc. M. Dill', role: 'officer', email: 'mdill@' + f.id + '.gov', lastLogin: at(42, 8, 0), active: true });
    });
    staff.push({ id: 'aud-1', facilityId: 'atoka', name: 'Kelly Marsh', role: 'auditor', email: 'kmarsh@sai.ok.gov', org: 'Oklahoma State Auditor and Inspector', lastLogin: at(0, 10, 58), active: true, starts: at(0, 0, 0), ends: at(-30, 0, 0) });

    const approvals = [
      { id: 'AP-1', facilityId: 'atoka', kind: 'void', title: 'Void a $25.00 deposit after bank deposit', detail: 'ALEXANDER, GUY. Receipt #10470, deposited yesterday. Reason: "Family member paid twice at the window, refunded in cash."', by: 'Ofc. J. Ramirez', at: at(0, 9, 15), status: 'pending', amount: 25 },
      { id: 'AP-2', facilityId: 'atoka', kind: 'transfer', title: 'Commissary transfer', detail: 'Trust fund to Sheriff\'s Commissary Account for sales of the last two weeks. Sales report attached.', by: 'Donna Pruitt', at: at(0, 10, 40), status: 'pending' },
      { id: 'AP-3', facilityId: 'atoka', kind: 'writeoff', title: 'Write off $12.60 unpaid medical charge', detail: 'PRICE, JORDAN, released with $6.20 and $18.80 owed. $6.20 applied; remainder uncollectable.', by: 'Donna Pruitt', at: at(1, 14, 0), status: 'pending', amount: 12.6 },
    ];

    const support = [
      { id: 'S-1', facilityId: 'cinci', kind: 'batch', sev: 'bad', title: 'Cincinnati batch 200004 to Prodigy Main Warehouse rejected', when: at(0, 6, 2), detail: '1,127 orders, $18,204.12. Previous batch 200003 failed the same way on the 6th.', why: 'The warehouse does not recognize 2 item codes in 14 orders (6305 "Test Product", 7287 "Pork Filled Dumplings"). The other 1,113 orders are fine.', fix: 'Remove or remap the 2 items, then resend. Or send the 1,113 clean orders now and hold the 14.', actions: [{ label: 'Send clean orders, hold 14', do: 'resolve', note: 'Sent 1,113 orders; 14 held for item remap' }, { label: 'Remap items', do: 'resolve', note: 'Items remapped and batch resent' }], status: 'open' },
      { id: 'S-2', facilityId: 'douglas', kind: 'task', sev: 'bad', title: 'Douglas inmate import has not run since 4:50 AM', when: at(0, 4, 50), detail: 'Runs every 15 minutes. 6 hours behind. 212 residents; bookings and releases may be missing.', why: 'The JMS endpoint timed out 24 times in a row (connection refused). Likely the county\'s server or firewall.', fix: 'Retry now; if it fails again, call Douglas IT. Jail staff can create accounts manually meanwhile; they are flagged for merge.', actions: [{ label: 'Retry now', do: 'retryJms' }, { label: 'Notify Douglas staff', do: 'note', note: 'Douglas staff notified' }], status: 'open' },
      { id: 'S-3', facilityId: 'chicago', kind: 'task', sev: 'warn', title: 'Chicago cart processing ran but skipped 8 carts', when: at(0, 14, 0), detail: '412 carts posted, 8 skipped.', why: '8 inmates have a facility rule that blocks one item each, and nobody at Chicago has reviewed the "Needs a decision" list in 3 days.', fix: 'Nothing broken on our side. Nudge the Chicago Commissary Manager.', actions: [{ label: 'Email Chicago Manager', do: 'resolve', note: 'Emailed Chicago Manager' }], status: 'open' },
      { id: 'S-4', facilityId: 'atoka', kind: 'request', sev: 'warn', title: 'Atoka: turn on card-on-file for phone deposits', when: at(2, 11, 0), detail: 'Asked by Capt. Hale. The setting is on at the jail; the card processor is not connected to the new software yet.', actions: [{ label: 'Connect processor', do: 'connectProcessor' }], status: 'open' },
      { id: 'S-5', facilityId: 'chicago', kind: 'request', sev: 'warn', title: 'Chicago: auditor login for the county auditor', when: at(0, 9, 30), detail: 'Asked by the Chicago Jail Administrator. 11/01 to 11/30. They can also create it themselves.', actions: [{ label: 'Create login', do: 'createAuditor', note: 'Auditor login created for Chicago county auditor' }], status: 'open' },
      { id: 'S-6', facilityId: 'pott', kind: 'question', sev: 'off', title: 'Pottawatomie: "where did the Transactions page go?"', when: at(0, 8, 5), detail: 'Ofc. Lane, after the v1.0.23 update. Deposits now live on the inmate\'s page.', actions: [{ label: 'Send the 1-minute guide', do: 'resolve', note: 'Guide sent' }], status: 'open' },
    ];

    // prior bank deposits (for reports), per facility, last 45 days
    const bankDeposits = [];
    let depNo = 3000;
    facilities.forEach((f) => {
      for (let d = 45; d >= 1; d--) {
        const dk = dayKey(at(d, 0, 0));
        const rec = live.filter((t) => t.facilityId === f.id && t.type === 'deposit' && t.deposited && ['cash', 'check', 'money order'].includes(t.tender) && dayKey(t.at) === dk);
        if (rec.length) { const id = 'BD-' + (depNo++); const lag = d === 40 || d === 41 ? 5 : 1; rec.forEach((t) => (t.bankDepositId = id)); bankDeposits.push({ id, facilityId: f.id, at: at(d - lag, 15, 10), forDay: dk, total: round2(rec.reduce((s, t) => s + t.amount, 0)), receipts: rec.map((t) => t.receipt), by: users[f.id].manager, bank: f.bank, confirmation: '' }); }
      }
    });

    const reconciliations = [];
    facilities.forEach((f) => {
      const m1 = monthKey(at(35, 0, 0)), m2 = monthKey(at(65, 0, 0));
      if (f.id !== 'chicago') reconciliations.push({ facilityId: f.id, month: m1, signedBy: users[f.id].manager, at: at(30, 10, 0), difference: 0 });
      reconciliations.push({ facilityId: f.id, month: m2, signedBy: users[f.id].manager, at: at(60, 10, 0), difference: 0 });
    });

    const checks = [
      { id: 1192, facilityId: 'atoka', at: at(95, 0, 0), to: 'WEBB, TRAVIS L', reason: 'Release', amount: 84, cashed: false },
      { id: 1218, facilityId: 'atoka', at: at(24, 0, 0), to: 'Oklahoma DOC', reason: 'Transfer with inmate', amount: 612.25, cashed: false },
      { id: 1221, facilityId: 'atoka', at: at(19, 0, 0), to: 'GARZA, MARIA', reason: 'Release', amount: 320, cashed: false },
      { id: 1223, facilityId: 'atoka', at: at(16, 0, 0), to: 'Craig County Jail', reason: 'Transfer with inmate', amount: 100, cashed: false },
    ];

    return {
      version: 1, seededAt: today.toISOString(), counters: { receipt: receiptNo, tx: txId, check: 1224, cart: cartNo, bd: depNo, ap: 4, sup: 7, user: 1 },
      facilities, inmates, txns: live, carts, settings, staff, approvals, support, bankDeposits, reconciliations, checks,
      drawerCounts: [], transfers: [{ facilityId: 'atoka', at: at(14, 0, 0), amount: 2104.75 }], auditLog: [], reportRuns: [],
      session: { role: 'officer', facilityId: 'atoka', user: 'Ofc. J. Ramirez', viewAs: null },
    };
  }

  // ---------- state ----------
  let S = null;
  function postSeed() { // keep every seeded balance at or above zero using the real balance function
    S.inmates.forEach((x) => { for (let guard = 0; guard < 3; guard++) { const b = balance(x.id); if (b.avail >= 0) break; const mine = txFor(x.id); const first = mine.length ? mine[0].at : x.bookedAt; const d = new Date(Math.min(new Date(first).getTime(), new Date(x.bookedAt).getTime()) - 60000); S.txns.push({ id: 'T-' + (S.counters.tx++), facilityId: x.facilityId, inmateId: x.id, type: 'deposit', tender: 'kiosk', amount: round2(Math.max(0, mine.filter((t) => t.type === 'purchase' || t.type === 'charge').reduce((q, t) => q + t.amount, 0) - mine.filter((t) => t.type === 'deposit' && !t.hold).reduce((q, t) => q + t.amount, 0)) + 5 + Math.floor(rand() * 35)), at: d.toISOString(), by: 'Kiosk', receipt: null, note: 'Lobby kiosk deposit', deposited: true }); } });
    S.inmates.forEach((x) => { if (x.status === 'in') { delete x.releaseTo; delete x.releasedAt; } });
    S.txns.sort((a, b) => a.at < b.at ? -1 : 1);
  }
  function load() { try { const raw = localStorage.getItem(KEY); if (raw) { S = JSON.parse(raw); if (S.version === 1) return S; } } catch (e) { } S = seed(); postSeed(); save(); return S; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
  function reset() { localStorage.removeItem(KEY); S = seed(); postSeed(); save(); }

  // ---------- queries ----------
  const fac = (id) => S.facilities.find((f) => f.id === id);
  const inmate = (id) => S.inmates.find((x) => x.id === id);
  const inmateName = (x) => x ? x.last + ', ' + x.first : '';
  const staffName = (fid, role) => { const u = S.staff.find((s) => s.facilityId === fid && s.role === role && s.active); return u ? u.name : 'Staff'; };
  const txFor = (inmateId) => S.txns.filter((t) => t.inmateId === inmateId).sort((a, b) => a.at < b.at ? -1 : 1);

  function balance(inmateId) {
    let avail = 0, held = 0, owed = 0;
    txFor(inmateId).forEach((t) => {
      if (t.excluded) return; // denied deposits never counted; voided ones stay and are offset by their reversal
      switch (t.type) {
        case 'deposit': {
          if (t.hold && (t.hold.released || new Date(t.hold.until) > NOW())) held += t.amount; else avail += t.amount;
          if (t.fee) avail -= t.fee;
          // collect owed
          if (owed > 0 && avail > 0) { const c = Math.min(owed, avail); owed -= c; avail -= c; }
          break;
        }
        case 'charge': { if (avail >= t.amount) avail -= t.amount; else { owed += t.amount - avail; avail = 0; } break; }
        case 'purchase': avail -= t.amount; break;
        case 'refund': avail += t.amount; break;
        case 'release': avail -= t.amount; break;
        case 'reversal': { if (t.ofType === 'charge' && t.amount > 0) { const c = Math.min(owed, t.amount); owed -= c; avail += t.amount - c; } else avail += t.amount; break; }
        case 'writeoff': owed = Math.max(0, owed - t.amount); break;
        case 'holdrelease': held -= t.amount; avail += t.amount; break;
      }
    });
    return { avail: round2(avail), held: round2(held), owed: round2(owed) };
  }

  const weeklySpend = (inmateId) => round2(txFor(inmateId).filter((t) => !t.voided && t.type === 'purchase' && NOW() - new Date(t.at) < 7 * DAY).reduce((s, t) => s + t.amount, 0));
  const facilityInmates = (fid, incl) => S.inmates.filter((x) => x.facilityId === fid && (incl || x.status === 'in'));
  const facilityTx = (fid) => S.txns.filter((t) => t.facilityId === fid);
  const undeposited = (fid) => facilityTx(fid).filter((t) => t.type === 'deposit' && !t.voided && !t.deposited && ['cash', 'check', 'money order'].includes(t.tender));
  const totalBalances = (fid) => { let a = 0, h = 0; facilityInmates(fid, true).filter((x) => x.status !== 'closed').forEach((x) => { const b = balance(x.id); a += b.avail; h += b.held; }); return { avail: round2(a), held: round2(h) }; };
  const search = (fid, q) => { q = (q || '').trim().toLowerCase(); if (!q) return []; return S.inmates.filter((x) => (!fid || x.facilityId === fid) && (inmateName(x).toLowerCase().includes(q) || x.booking.includes(q) || (x.last + ' ' + x.first).toLowerCase().includes(q))); };

  function log(action, detail, extra) { S.auditLog.unshift(Object.assign({ at: NOW().toISOString(), by: S.session.viewAs ? 'Prodigy as ' + S.session.user : S.session.user, role: S.session.role, facilityId: S.session.facilityId, action, detail }, extra || {})); if (S.auditLog.length > 500) S.auditLog.length = 500; }
  const nextReceipt = () => S.counters.receipt++;
  const nextTx = () => 'T-' + (S.counters.tx++);
  const settingsFor = (fid) => S.settings[fid];

  // ---------- actions ----------
  function deposit(o) {
    const fid = S.session.facilityId; const st = settingsFor(fid);
    const t = { id: nextTx(), facilityId: fid, inmateId: o.inmateId, type: 'deposit', tender: o.tender, amount: round2(o.amount), at: NOW().toISOString(), by: S.session.user, receipt: nextReceipt(), note: o.note || '', deposited: o.tender === 'card', source: o.source };
    if (o.tender === 'check' || o.tender === 'money order') { t.checkNo = o.checkNo; t.payer = o.payer; t.checkType = o.checkType; if (o.holdUntil) t.hold = { until: new Date(o.holdUntil + 'T23:59:00').toISOString(), amount: t.amount, released: false }; }
    if (o.tender === 'card') { t.fee = round2(t.amount * st.deposits.cardFeePct / 100); t.cardLast4 = o.last4 || '4417'; if (o.saveCard) { inmate(o.inmateId).card = { brand: o.brand || 'Visa', last4: t.cardLast4, savedAt: t.at }; } }
    if (st.approvals.depositOver.on && t.amount > st.approvals.depositOver.amount && S.session.role === 'officer') { t.pendingApproval = true; addApproval({ kind: 'deposit', title: 'Deposit over ' + money(st.approvals.depositOver.amount) + ': ' + money(t.amount), detail: inmateName(inmate(o.inmateId)) + ', receipt #' + t.receipt, txId: t.id, amount: t.amount }); }
    S.txns.push(t); log('deposit', money(t.amount) + ' ' + t.tender + ' to ' + inmateName(inmate(o.inmateId)) + ', receipt #' + t.receipt, { inmateId: o.inmateId, txId: t.id }); save(); return t;
  }
  function charge(o) {
    const fid = S.session.facilityId;
    const t = { id: nextTx(), facilityId: fid, inmateId: o.inmateId, type: 'charge', chargeType: o.chargeType, amount: round2(o.amount), at: NOW().toISOString(), by: S.session.user, receipt: nextReceipt(), note: o.note || '', serviceDate: o.serviceDate };
    S.txns.push(t); log('charge', money(t.amount) + ' ' + t.chargeType + ' to ' + inmateName(inmate(o.inmateId)), { inmateId: o.inmateId, txId: t.id }); save(); return t;
  }
  function fix(o) {
    const orig = S.txns.find((t) => t.id === o.txId); if (!orig) return null;
    const st = settingsFor(orig.facilityId);
    const needsApproval = st.approvals.fixAfterDeposit && orig.deposited && S.session.role === 'officer';
    const base = { facilityId: orig.facilityId, at: NOW().toISOString(), by: S.session.user, reason: o.reason, fixOf: orig.id };
    const out = [];
    const push = (t) => { t.id = nextTx(); t.receipt = nextReceipt(); S.txns.push(t); out.push(t); };
    if (needsApproval) { addApproval({ kind: 'fix', title: 'Fix after bank deposit: ' + o.mode + ' on ' + describe(orig), detail: inmateName(inmate(orig.inmateId)) + '. Reason: ' + o.reason, txId: orig.id, fixReq: o }); log('fix requested', o.mode + ' on ' + orig.id + ' (needs approval)'); save(); return { pending: true }; }
    applyFix(orig, o, base, push);
    log('fix', o.mode + ' on ' + describe(orig) + ' for ' + inmateName(inmate(orig.inmateId)) + ': ' + o.reason, { txId: orig.id }); save(); return { entries: out };
  }
  function applyFix(orig, o, base, push) {
    const amt = orig.amount;
    if (o.mode === 'void') { orig.voided = true; orig.voidReason = o.reason; push(Object.assign({}, base, { inmateId: orig.inmateId, type: 'reversal', ofType: orig.type, amount: orig.type === 'charge' ? amt : -amt, note: 'Void of #' + orig.receipt + ': ' + o.reason })); if (orig.type === 'charge') { out_fixOwed(orig); } }
    if (o.mode === 'move') { orig.voided = true; orig.voidReason = 'Moved to ' + inmateName(inmate(o.toInmateId)); push(Object.assign({}, base, { inmateId: orig.inmateId, type: 'reversal', ofType: orig.type, amount: -amt, note: 'Moved to ' + inmateName(inmate(o.toInmateId)) + ': ' + o.reason })); push(Object.assign({}, base, { inmateId: o.toInmateId, type: orig.type, tender: orig.tender, chargeType: orig.chargeType, amount: amt, note: 'Moved from ' + inmateName(inmate(orig.inmateId)) + ' (#' + orig.receipt + '): ' + o.reason, deposited: orig.deposited, movedFrom: orig.id })); }
    if (o.mode === 'amount') { const diff = round2(o.newAmount - amt); orig.correctedTo = o.newAmount; if (orig.type === 'deposit') push(Object.assign({}, base, { inmateId: orig.inmateId, type: diff >= 0 ? 'deposit' : 'reversal', ofType: 'deposit', tender: orig.tender, amount: Math.abs(diff) * (diff >= 0 ? 1 : -1) * (diff >= 0 ? 1 : 1), note: 'Amount corrected on #' + orig.receipt + ' to ' + money(o.newAmount) + ': ' + o.reason, deposited: orig.deposited })); else push(Object.assign({}, base, { inmateId: orig.inmateId, type: diff >= 0 ? 'charge' : 'reversal', ofType: 'charge', chargeType: orig.chargeType, amount: Math.abs(diff), note: 'Amount corrected on #' + orig.receipt + ' to ' + money(o.newAmount) + ': ' + o.reason })); }
    if (o.mode === 'type') { orig.chargeType = o.newType; orig.note = (orig.note ? orig.note + '. ' : '') + 'Type corrected: ' + o.reason; }
    if (o.mode === 'extend') { orig.hold.until = new Date(o.until + 'T23:59:00').toISOString(); }
    if (o.mode === 'releaseHold') { orig.hold.released = true; push(Object.assign({}, base, { inmateId: orig.inmateId, type: 'holdrelease', amount: orig.hold.amount, note: 'Hold released early on check #' + orig.checkNo + ': ' + o.reason })); }
  }
  function out_fixOwed(orig) { /* owed recomputed in balance() */ }
  function describe(t) { const m = { deposit: 'deposit', charge: 'charge', purchase: 'purchase', hold: 'hold', refund: 'refund', release: 'release', reversal: 'reversal', writeoff: 'write-off', holdrelease: 'hold release' }; return (m[t.type] || t.type) + ' ' + money(t.amount) + (t.receipt ? ' (#' + t.receipt + ')' : ''); }

  function createInmate(o) {
    const fid = S.session.facilityId; const id = fid + '-m' + Date.now();
    const x = { id, facilityId: fid, last: o.last.toUpperCase(), first: o.first.toUpperCase() + (o.middle ? ' ' + o.middle.toUpperCase() : ''), booking: o.booking || ('MAN-' + Date.now().toString().slice(-6)), dob: o.dob, housing: o.housing || 'Not assigned yet', bookedAt: NOW().toISOString(), status: 'in', createdManually: true, manualReason: o.reason, card: null, privilege: 'Normal', notes: [], heldFor: fac(fid).name };
    S.inmates.push(x); log('inmate created manually', inmateName(x) + ' (' + o.reason + ')', { inmateId: id }); save(); return x;
  }
  const duplicates = (fid, last, dob) => S.inmates.filter((x) => x.facilityId === fid && x.last.toLowerCase() === (last || '').trim().toLowerCase() && (!dob || x.dob === dob) && x.status !== 'closed');

  function addNote(inmateId, text) { inmate(inmateId).notes.unshift({ at: NOW().toISOString(), by: S.session.user, text }); save(); }
  function removeCard(inmateId) { inmate(inmateId).card = null; log('card removed', inmateName(inmate(inmateId))); save(); }

  // manager
  function drawerExpected(fid) { const today = dayKey(NOW().toISOString()); const cashIn = facilityTx(fid).filter((t) => t.type === 'deposit' && t.tender === 'cash' && !t.voided && !t.deposited).reduce((s, t) => s + t.amount, 0); const cashOut = facilityTx(fid).filter((t) => t.type === 'release' && t.method === 'cash' && dayKey(t.at) === today).reduce((s, t) => s + t.amount, 0); return round2(cashIn - cashOut); }
  function recordDrawer(o) { const fid = S.session.facilityId; const expected = drawerExpected(fid); const diff = round2(o.counted - expected); const rec = { id: 'DC-' + Date.now(), facilityId: fid, at: NOW().toISOString(), expected, counted: round2(o.counted), diff, note: o.note || '', countedBy: S.session.user, verifiedBy: o.verifiedBy, day: dayKey(NOW().toISOString()) }; S.drawerCounts.unshift(rec); if (diff !== 0) S.txns.push({ id: nextTx(), facilityId: fid, inmateId: null, type: 'overshort', amount: diff, at: rec.at, by: S.session.user, note: o.note }); log('drawer counted', money(o.counted) + ' vs ' + money(expected) + (diff ? ' (' + (diff > 0 ? 'over' : 'short') + ' ' + money(Math.abs(diff)) + ')' : ' matched'), { verifiedBy: o.verifiedBy }); save(); return rec; }
  const todayDrawer = (fid) => S.drawerCounts.find((d) => d.facilityId === fid && d.day === dayKey(NOW().toISOString()));
  function buildBankDeposit(fid) { const rec = undeposited(fid); const by = (k) => rec.filter((t) => t.tender === k); return { receipts: rec, cash: round2(by('cash').reduce((s, t) => s + t.amount, 0)), checks: round2(by('check').reduce((s, t) => s + t.amount, 0)), mos: round2(by('money order').reduce((s, t) => s + t.amount, 0)), total: round2(rec.reduce((s, t) => s + t.amount, 0)), checkList: by('check').concat(by('money order')) }; }
  function markDeposited(o) { const fid = S.session.facilityId; const b = buildBankDeposit(fid); if (!b.receipts.length) return null; const id = 'BD-' + (S.counters.bd++); b.receipts.forEach((t) => { t.deposited = true; t.bankDepositId = id; }); const d = { id, facilityId: fid, at: NOW().toISOString(), depositedOn: o.date, confirmation: o.confirmation || '', total: b.total, cash: b.cash, checks: b.checks + b.mos, receipts: b.receipts.map((t) => t.receipt), by: S.session.user, bank: fac(fid).bank }; S.bankDeposits.push(d); log('bank deposit recorded', money(b.total) + ', ' + b.receipts.length + ' receipts'); save(); return d; }
  const lastBankDeposit = (fid) => S.bankDeposits.filter((d) => d.facilityId === fid).sort((a, b) => a.at < b.at ? 1 : -1)[0];

  function reconcile(fid, month) {
    const endOf = new Date(month.slice(0, 4), parseInt(month.slice(5), 10), 0, 23, 59, 59).toISOString();
    const inms = S.inmates.filter((x) => x.facilityId === fid);
    let bal = 0, held = 0;
    inms.forEach((x) => { let a = 0, h = 0; txFor(x.id).filter((t) => t.at <= endOf && !t.voided).forEach((t) => { if (t.type === 'deposit') { if (t.hold && (t.hold.released || new Date(t.hold.until) > new Date(endOf))) h += t.amount; else a += t.amount; if (t.fee) a -= t.fee; } if (t.type === 'charge') a = Math.max(0, a - t.amount); if (t.type === 'purchase' || t.type === 'release') a -= t.amount; if (t.type === 'refund' || t.type === 'reversal') a += t.amount; if (t.type === 'holdrelease') { h -= t.amount; a += t.amount; } }); bal += a; held += h; });
    const outstanding = S.checks.filter((c) => c.facilityId === fid && !c.cashed && c.at <= endOf);
    const outTotal = round2(outstanding.reduce((s, c) => s + c.amount, 0));
    const transit = round2(S.bankDeposits.filter((d) => d.facilityId === fid && d.at > endOf && d.forDay && d.forDay <= endOf.slice(0, 10)).reduce((s, d) => s + d.total, 0));
    const transferDue = transferDueFor(fid, endOf);
    const bookTotal = round2(bal + held + transferDue);
    const existing = S.reconciliations.find((r) => r.facilityId === fid && r.month === month);
    return { month, endOf, balances: round2(bal), held: round2(held), outstanding, outTotal, transit, transferDue, bookTotal, bankStatementDefault: round2(bookTotal + outTotal - transit), existing };
  }
  function signReconciliation(fid, month, bankBalance, diff) { S.reconciliations = S.reconciliations.filter((r) => !(r.facilityId === fid && r.month === month)); S.reconciliations.push({ facilityId: fid, month, signedBy: S.session.user, at: NOW().toISOString(), bankBalance, difference: diff }); log('reconciliation signed', month + ', difference ' + money(diff)); save(); }
  function transferDueFor(fid, upTo) { const last = S.transfers.filter((t) => t.facilityId === fid).sort((a, b) => a.at < b.at ? 1 : -1)[0]; const since = last ? last.at : '2000-01-01'; const sales = facilityTx(fid).filter((t) => t.type === 'purchase' && !t.voided && t.at > since && (!upTo || t.at <= upTo)).reduce((s, t) => s + t.amount, 0); const refunds = facilityTx(fid).filter((t) => t.type === 'refund' && t.at > since && (!upTo || t.at <= upTo)).reduce((s, t) => s + t.amount, 0); return round2(sales - refunds); }
  function recordTransfer(fid) { const amt = transferDueFor(fid); S.transfers.push({ facilityId: fid, at: NOW().toISOString(), amount: amt, by: S.session.user }); S.txns.push({ id: nextTx(), facilityId: fid, inmateId: null, type: 'transfer', amount: amt, at: NOW().toISOString(), by: S.session.user, note: 'Transfer to Sheriff\'s Commissary Account' }); S.approvals.filter((a) => a.facilityId === fid && a.kind === 'transfer' && a.status === 'pending').forEach((a) => (a.status = 'done')); log('commissary transfer recorded', money(amt)); save(); return amt; }

  const releaseQueue = (fid) => S.inmates.filter((x) => x.facilityId === fid && x.status === 'released').map((x) => Object.assign({ bal: balance(x.id) }, { inmate: x })).sort((a, b) => a.inmate.releasedAt < b.inmate.releasedAt ? 1 : -1);
  function payOut(o) { const x = inmate(o.inmateId); const b = balance(x.id); let amt = b.avail; if (o.includeHold) { txFor(x.id).filter((t) => t.hold && !t.hold.released && !t.voided).forEach((t) => { t.hold.released = true; S.txns.push({ id: nextTx(), facilityId: x.facilityId, inmateId: x.id, type: 'holdrelease', amount: t.hold.amount, at: NOW().toISOString(), by: S.session.user, note: 'Hold released at payout' }); amt += t.hold.amount; }); } amt = round2(amt); const t = { id: nextTx(), facilityId: x.facilityId, inmateId: x.id, type: 'release', method: o.method, amount: amt, at: NOW().toISOString(), by: S.session.user, receipt: nextReceipt(), note: 'Release payout by ' + o.method + ' to ' + x.releaseTo, formSigned: !!o.signed }; if (o.method === 'check' || o.method === 'agency') { t.checkNo = S.counters.check++; S.checks.push({ id: t.checkNo, facilityId: x.facilityId, at: t.at, to: o.method === 'agency' ? x.releaseTo : inmateName(x), reason: o.method === 'agency' ? 'Transfer with inmate' : 'Release', amount: amt, cashed: false }); } S.txns.push(t); if (o.signed) x.status = 'closed'; x.closedAt = o.signed ? t.at : null; log('release payout', money(amt) + ' by ' + o.method + ' to ' + inmateName(x) + (o.signed ? ', form signed, account closed' : ', form not yet signed')); save(); return t; }
  function markSigned(inmateId) { const x = inmate(inmateId); x.status = 'closed'; x.closedAt = NOW().toISOString(); log('release form signed', inmateName(x)); save(); }

  function decideCart(cartId, decision) { const c = S.carts.find((k) => k.id === cartId); if (!c) return; if (decision === 'allow') { c.status = 'ready'; c.decision = 'Allowed once'; } if (decision === 'trim') { c.total = 100; c.status = 'ready'; c.decision = 'Trimmed to limit'; } if (decision === 'remove') { c.total = round2(c.total - 4.38); c.items -= 1; c.status = 'ready'; c.decision = 'Restricted item removed'; } if (decision === 'reject') { c.status = 'rejected'; c.decision = 'Rejected'; } c.decidedBy = S.session.user; log('cart decision', c.id + ': ' + c.decision + ' for ' + inmateName(inmate(c.inmateId))); save(); }
  function postCarts(fid) { const ready = S.carts.filter((c) => c.facilityId === fid && c.status === 'ready'); ready.forEach((c) => { c.status = 'posted'; c.postedAt = NOW().toISOString(); S.txns.push({ id: nextTx(), facilityId: fid, inmateId: c.inmateId, type: 'purchase', amount: c.total, at: c.postedAt, by: 'System', orderNo: 78000 + parseInt(c.id.slice(1), 10) % 1000, items: c.items, note: 'Commissary order ' + c.id }); }); log('carts posted', ready.length + ' carts to warehouse'); save(); return ready.length; }
  function refund(o) { const t = { id: nextTx(), facilityId: S.session.facilityId, inmateId: o.inmateId, type: 'refund', amount: round2(o.amount), at: NOW().toISOString(), by: S.session.user, receipt: nextReceipt(), note: o.note }; S.txns.push(t); log('refund', money(t.amount) + ' to ' + inmateName(inmate(o.inmateId)) + ': ' + o.note); save(); return t; }

  // approvals
  function addApproval(o) { const a = Object.assign({ id: 'AP-' + (S.counters.ap++), facilityId: S.session.facilityId, by: S.session.user, at: NOW().toISOString(), status: 'pending' }, o); S.approvals.unshift(a); return a; }
  function decideApproval(id, ok) { const a = S.approvals.find((k) => k.id === id); if (!a) return; a.status = ok ? 'approved' : 'denied'; a.decidedBy = S.session.user; a.decidedAt = NOW().toISOString(); if (ok) { if (a.kind === 'fix' && a.fixReq) { const orig = S.txns.find((t) => t.id === a.txId); const base = { facilityId: orig.facilityId, at: NOW().toISOString(), by: a.by + ' (approved ' + S.session.user + ')', reason: a.fixReq.reason, fixOf: orig.id }; applyFix(orig, a.fixReq, base, (t) => { t.id = nextTx(); t.receipt = nextReceipt(); S.txns.push(t); }); } if (a.kind === 'deposit' && a.txId) { const t = S.txns.find((k) => k.id === a.txId); if (t) t.pendingApproval = false; } if (a.kind === 'void' && a.amount) { const x = S.inmates.find((i) => i.facilityId === a.facilityId && i.last === 'ALEXANDER'); if (x) S.txns.push({ id: nextTx(), facilityId: a.facilityId, inmateId: x.id, type: 'reversal', ofType: 'deposit', amount: -a.amount, at: NOW().toISOString(), by: a.by + ' (approved ' + S.session.user + ')', receipt: nextReceipt(), note: 'Void of #10470 approved' }); } if (a.kind === 'transfer') { recordTransfer(a.facilityId); return; } if (a.kind === 'writeoff') { const x = S.inmates.find((i) => i.facilityId === a.facilityId && i.last === 'PRICE'); if (x) S.txns.push({ id: nextTx(), facilityId: a.facilityId, inmateId: x.id, type: 'writeoff', amount: a.amount, at: NOW().toISOString(), by: S.session.user, note: 'Unpaid charge written off' }); } } else if (a.kind === 'deposit' && a.txId) { const t = S.txns.find((k) => k.id === a.txId); if (t) { t.voided = true; t.excluded = true; t.voidReason = 'Deposit denied'; } } log(ok ? 'approved' : 'denied', a.title); save(); }

  // users
  function addStaff(o) { const u = Object.assign({ id: 'U-' + (S.counters.user++), facilityId: S.session.facilityId, active: true, lastLogin: null }, o); S.staff.push(u); log('user added', u.name + ' as ' + u.role); save(); return u; }
  function setStaff(id, patch) { const u = S.staff.find((s) => s.id === id); Object.assign(u, patch); log('user changed', u.name + ' ' + JSON.stringify(patch)); save(); }

  // support
  function supportAction(id, idx) { const s = S.support.find((k) => k.id === id); const a = s.actions[idx]; if (a.do === 'retryJms') { const f = fac(s.facilityId); f.jmsStatus = 'ok'; f.lastFeed = NOW().toISOString(); s.status = 'resolved'; s.resolution = 'Retried; feed connected'; } else if (a.do === 'connectProcessor') { fac(s.facilityId).cardProcessor = true; s.status = 'resolved'; s.resolution = 'Card processor connected'; } else if (a.do === 'createAuditor') { S.staff.push({ id: 'U-' + (S.counters.user++), facilityId: s.facilityId, name: 'County Auditor (Chicago)', role: 'auditor', email: 'auditor@cookcounty.gov', org: 'County auditor', active: true, starts: NOW().toISOString(), ends: new Date(NOW().getTime() + 45 * DAY).toISOString() }); s.status = 'resolved'; s.resolution = a.note; } else if (a.do === 'note') { s.notes = (s.notes || []).concat(a.note); } else { s.status = 'resolved'; s.resolution = a.note; } s.resolvedBy = S.session.user; s.resolvedAt = NOW().toISOString(); log('support', s.title + ': ' + (s.resolution || a.note)); save(); }

  function runReport(name, fid, from, to) { S.reportRuns.unshift({ at: NOW().toISOString(), by: S.session.user, name, facilityId: fid, from, to, id: 'R-' + NOW().toISOString().slice(0, 10) + '-' + pad(S.reportRuns.length + 412, 4) }); if (S.reportRuns.length > 200) S.reportRuns.length = 200; save(); return S.reportRuns[0]; }

  function setSession(patch) { Object.assign(S.session, patch); save(); }

  window.Store = { load, save, reset, get S() { return S; }, money, fmtDate, fmtTime, fmtWhen, dayKey, monthKey, round2, DAY, now: NOW, fac, inmate, inmateName, staffName, txFor, balance, weeklySpend, facilityInmates, facilityTx, undeposited, totalBalances, search, log, settingsFor, deposit, charge, fix, describe, createInmate, duplicates, addNote, removeCard, drawerExpected, recordDrawer, todayDrawer, buildBankDeposit, markDeposited, lastBankDeposit, reconcile, signReconciliation, transferDueFor, recordTransfer, releaseQueue, payOut, markSigned, decideCart, postCarts, refund, addApproval, decideApproval, addStaff, setStaff, supportAction, runReport, setSession };
})();
