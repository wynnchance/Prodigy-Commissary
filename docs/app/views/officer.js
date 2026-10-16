/* Officer views: home, find, inmate, deposit, bill, fix, new inmate, receipts */
(function () {
  const { $, $$, esc, h, raw, M, chip, chipFor, txLabel, txAmount, modal, close, toast, confirmDlg, showReceipt, shell, route, render, readOnly } = UI;
  const ses = () => Store.S.session;
  const fid = () => ses().facilityId;
  const inmLink = (x) => `<a href="#/officer/inmate?id=${x.id}"><strong>${esc(Store.inmateName(x))}</strong></a>`;
  const balLine = (b) => `${M(b.avail)}${b.held ? ' <span class="help">(+' + M(b.held) + ' held)</span>' : ''}${b.owed ? ' <span class="help" style="color:#9f1d12">owes ' + M(b.owed) + '</span>' : ''}`;

  // ---------- home ----------
  route('/officer/home', () => {
    const f = Store.fac(fid()); const S = Store.S;
    const recent = Store.facilityInmates(fid(), true).filter((x) => Store.now() - new Date(x.bookedAt) < 1.5 * Store.DAY && x.status === 'in').sort((a, b) => a.bookedAt < b.bookedAt ? 1 : -1).slice(0, 6);
    const mine = Store.facilityTx(fid()).filter((t) => t.receipt && Store.dayKey(t.at) === Store.dayKey(Store.now().toISOString())).sort((a, b) => a.at < b.at ? 1 : -1);
    const mineTotal = mine.filter((t) => t.type === 'deposit' && !t.voided).reduce((s, t) => s + t.amount, 0);
    shell(h`
      <div><h1>Find an inmate</h1>
        <form id="findForm" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px"><input id="findQ" type="search" placeholder="Type a name, booking number, or account number" autofocus style="flex:1 1 420px;min-height:52px;padding:0 16px;border:2px solid #1b5fb4;border-radius:10px;font:18px 'Source Sans 3',sans-serif"><button class="btn p" style="min-height:52px;padding:0 28px;font-size:17px">Find</button></form>
        <div class="help" style="margin-top:8px">Searches current inmates. <a href="#/officer/find?all=1">Include released inmates</a></div></div>
      <div class="grid g4">
        <a class="big" href="#/officer/find?then=deposit"><strong>Deposit</strong><span>Cash, check, money order, or card received for an inmate</span></a>
        <a class="big" href="#/officer/find?then=bill"><strong>Bill inmate</strong><span>Medical visit, medication, property damage, copies, fees</span></a>
        <a class="big" href="#/officer/new"><strong>New inmate</strong><span>Only if the booking did not come over from the JMS</span></a>
        <a class="big" href="#/officer/receipts"><strong>My receipts today</strong><span>Reprint or fix any receipt issued this shift</span></a>
      </div>
      <div class="grid g2">
        <div class="card"><div class="cardh"><h2>Booked in the last 36 hours</h2>${raw(f.jmsStatus === 'ok' ? chip('JMS feed OK, ' + Store.fmtTime(f.lastFeed), 'ok') : f.jmsStatus === 'stale' ? chip('JMS feed stale since ' + Store.fmtTime(f.lastFeed), 'warn') : chip('JMS not connected', 'off'))}</div>
          <table><thead><tr><th>Inmate</th><th>Booked</th><th>Balance</th><th></th></tr></thead><tbody>${raw(recent.length ? recent.map((x) => `<tr><td>${inmLink(x)}<br><span class="help">Booking ${esc(x.booking)} ${x.createdManually ? chip('Created manually', 'warn') : ''}</span></td><td>${Store.fmtWhen(x.bookedAt)}</td><td>${raw(balLine(Store.balance(x.id))).__raw}</td><td><a class="btn s" href="#/officer/deposit?id=${x.id}">Deposit</a></td></tr>`).join('') : '<tr><td colspan="4" class="muted">No bookings in the last 36 hours.</td></tr>')}</tbody></table></div>
        <div class="card"><div class="cardh"><h2>Receipts today</h2><span class="help">${mine.length} receipts, ${M(mineTotal)} deposited</span></div>
          <table><thead><tr><th>Receipt</th><th>Inmate</th><th class="r">Amount</th><th></th></tr></thead><tbody>${raw(mine.length ? mine.slice(0, 8).map((t) => `<tr><td>#${t.receipt}<br><span class="help">${Store.fmtTime(t.at)}, ${esc(t.tender || t.type)}</span></td><td>${esc(Store.inmateName(Store.inmate(t.inmateId)))}</td><td class="r">${txAmount(t)}</td><td><a href="#" data-rcpt="${t.id}">Reprint</a> <span class="muted">|</span> <a href="#/officer/inmate?id=${t.inmateId}&fix=${t.id}">Fix</a></td></tr>`).join('') : '<tr><td colspan="4" class="muted">No receipts yet today.</td></tr>')}</tbody></table></div>
      </div>`);
    $('#findForm').onsubmit = (e) => { e.preventDefault(); location.hash = '#/officer/find?q=' + encodeURIComponent($('#findQ').value); };
    $$('[data-rcpt]').forEach((a) => (a.onclick = (e) => { e.preventDefault(); showReceipt(Store.S.txns.find((t) => t.id === a.dataset.rcpt)); }));
  });

  // ---------- find ----------
  route('/officer/find', (q) => {
    const all = q.all === '1'; const query = q.q || '';
    let list = query ? Store.search(all ? null : fid(), query) : Store.facilityInmates(fid(), all);
    if (!query) list = list.slice().sort((a, b) => a.last.localeCompare(b.last));
    if (query && !all) list = list.filter((x) => x.status === 'in' || all);
    const then = q.then;
    shell(h`
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;align-items:flex-end"><div><h1>${then === 'deposit' ? 'Deposit: pick the inmate' : then === 'bill' ? 'Bill inmate: pick the inmate' : 'Inmates'}</h1><div class="sub">${query ? `Results for "${query}"` : (all ? 'Everyone, including released and closed' : 'Everyone currently in custody')}, ${list.length} found.</div></div>
        <form id="findForm" style="display:flex;gap:8px"><input id="findQ" type="search" value="${query}" placeholder="Name, booking, or account number" style="min-height:44px;padding:0 12px;border:1px solid #cdd5e0;border-radius:8px;font:15px 'Source Sans 3',sans-serif;width:320px"><button class="btn p">Find</button><a class="btn" href="#/officer/find?${all ? '' : 'all=1&'}q=${encodeURIComponent(query)}">${all ? 'Only in custody' : 'Include released'}</a></form></div>
      <div class="card tbl"><table><thead><tr><th>Inmate</th><th>Booking</th><th>Housing</th><th>Status</th><th>Balance</th><th></th></tr></thead><tbody>${raw(list.map((x) => { const b = Store.balance(x.id); return `<tr><td>${inmLink(x)}<br><span class="help">DOB ${Store.fmtDate(x.dob)}</span></td><td>${esc(x.booking)}</td><td>${esc(x.housing)}</td><td>${x.status === 'in' ? chip('In custody', 'ok') : x.status === 'released' ? chip('Released', 'warn') : chip('Closed', 'off')} ${x.createdManually ? chip('Manual', 'warn') : ''}</td><td>${balLine(b)}</td><td style="white-space:nowrap">${then === 'deposit' ? `<a class="btn s p" href="#/officer/deposit?id=${x.id}">Deposit</a>` : then === 'bill' ? `<a class="btn s p" href="#/officer/inmate?id=${x.id}&bill=1">Bill</a>` : `<a class="btn s" href="#/officer/inmate?id=${x.id}">Open</a>`}</td></tr>`; }).join('') || '<tr><td colspan="6" class="muted">Nobody matched. Check the spelling, or <a href="#/officer/new">create the account manually</a> if the booking has not come over from the JMS.</td></tr>')}</tbody></table></div>`);
    $('#findForm').onsubmit = (e) => { e.preventDefault(); location.hash = '#/officer/find?' + (all ? 'all=1&' : '') + (then ? 'then=' + then + '&' : '') + 'q=' + encodeURIComponent($('#findQ').value); };
  });

  // ---------- inmate ----------
  route('/officer/inmate', (q) => {
    const x = Store.inmate(q.id); if (!x) { location.hash = '#/officer/find'; return; }
    const b = Store.balance(x.id); const txs = Store.txFor(x.id).slice().reverse(); const ro = readOnly();
    const role = ses().role; const st = Store.settingsFor(x.facilityId);
    const holdTx = txs.find((t) => t.hold && !t.hold.released && !t.voided && new Date(t.hold.until) > Store.now());
    const filt = q.show || 'all';
    const shown = txs.filter((t) => filt === 'all' || (filt === 'deposits' && t.type === 'deposit') || (filt === 'charges' && t.type === 'charge') || (filt === 'purchases' && t.type === 'purchase') || (filt === 'fixes' && (t.type === 'reversal' || t.voided)));
    shell(h`
      <div class="help"><a href="#/officer/home">Home</a> / ${Store.inmateName(x)}</div>
      <div class="card pad" style="display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start">
        <div style="width:96px;height:112px;border-radius:10px;background:#e8ecf2;display:flex;align-items:center;justify-content:center;color:#5a6779;font-size:13px;text-align:center">${x.createdManually ? 'No photo' : 'Photo from JMS'}</div>
        <div style="flex:1 1 320px;min-width:0"><h1>${Store.inmateName(x)}</h1>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 14px;align-items:center;font-size:15px;color:#5a6779"><span>Booking ${x.booking}</span><span>DOB ${Store.fmtDate(x.dob)}</span><span>${x.housing}</span><span>Booked ${Store.fmtWhen(x.bookedAt)}</span>${raw(x.status === 'in' ? chip('In custody', 'ok') : x.status === 'released' ? chip('Released ' + Store.fmtWhen(x.releasedAt), 'warn') : chip('Account closed', 'off'))}${raw(x.createdManually ? chip('Created manually', 'warn') : '')}</div>
          <div style="display:flex;flex-wrap:wrap;gap:28px">
            <div class="stat"><b>Available now</b><span>${M(b.avail)}</span></div>
            <div class="stat"><b>On hold</b><span style="color:#8a4b00">${M(b.held)}</span>${raw(holdTx ? `<em>${holdTx.tender === 'money order' ? 'Money order' : 'Check'}, releases ${Store.fmtDate(holdTx.hold.until)}</em>` : '')}</div>
            <div class="stat"><b>Owes</b><span style="color:#9f1d12">${M(b.owed)}</span>${raw(b.owed ? '<em>Collected from next deposit</em>' : '')}</div>
            <div class="stat"><b>Spent this week</b><span>${M(Store.weeklySpend(x.id))}</span><em>of ${M(st.deposits.weeklyLimit)} limit</em></div>
          </div></div>
        ${raw(ro ? '' : `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;min-width:300px">
          <a class="btn p" href="#/officer/deposit?id=${x.id}" ${x.status === 'closed' ? 'style="pointer-events:none;opacity:.5"' : ''}>Deposit</a>
          <button class="btn" data-bill ${x.status === 'closed' ? 'disabled' : ''}>Bill inmate</button>
          <button class="btn" data-stmt>Print statement</button>
          ${x.status === 'released' && (role === 'manager' || role === 'admin' || role === 'prodigy') ? `<a class="btn" href="#/manager/releases?id=${x.id}">Pay out release</a>` : `<button class="btn" data-note>Add note</button>`}
        </div>`)}
      </div>
      <div class="grid g3">
        <div class="card span2"><div class="cardh"><h2>Account activity</h2><select id="filt" aria-label="Show"><option value="all" ${filt === 'all' ? 'selected' : ''}>Everything</option><option value="deposits" ${filt === 'deposits' ? 'selected' : ''}>Deposits</option><option value="charges" ${filt === 'charges' ? 'selected' : ''}>Charges</option><option value="purchases" ${filt === 'purchases' ? 'selected' : ''}>Commissary purchases</option><option value="fixes" ${filt === 'fixes' ? 'selected' : ''}>Fixes and corrections</option></select></div>
          <div class="tbl"><table><thead><tr><th>When</th><th>What</th><th class="r">Amount</th><th>By</th><th></th></tr></thead><tbody>${raw(shown.length ? shown.map((t) => `<tr ${t.voided ? 'style="opacity:.6"' : ''}><td style="white-space:nowrap">${Store.fmtWhen(t.at)}</td><td>${chipFor(t)} ${esc(txLabel(t))}${t.receipt ? `<br><span class="help">Receipt #${t.receipt}${t.voided ? ', voided: ' + esc(t.voidReason || '') : ''}${t.deposited && t.type === 'deposit' ? ', in bank deposit' : ''}${t.reason ? ', ' + esc(t.reason) : ''}</span>` : ''}</td><td class="r">${txAmount(t)}</td><td>${esc(t.by)}</td><td style="white-space:nowrap">${t.receipt ? `<a href="#" data-rcpt="${t.id}">Receipt</a>` : ''} ${!ro && !t.voided && ['deposit', 'charge'].includes(t.type) && !t.pendingApproval ? `<a class="btn s" href="#/officer/inmate?id=${x.id}&fix=${t.id}">Fix</a>` : ''}${!ro && t.type === 'purchase' && role !== 'officer' ? `<button class="btn s" data-refund="${t.id}">Refund</button>` : ''}</td></tr>`).join('') : '<tr><td colspan="5" class="muted">Nothing here yet.</td></tr>')}</tbody></table></div>
          <div class="help" style="padding:10px 16px">Amounts in red are money the inmate owes or spent. Fixes never edit an entry; they add a correction and keep the original.</div></div>
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="card pad"><h3>Card on file</h3>${raw(x.card ? `<div style="display:flex;align-items:center;gap:12px;margin-top:10px"><div style="width:44px;height:30px;border-radius:6px;background:#1b2538;color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center">${esc(x.card.brand.toUpperCase())}</div><div>${esc(x.card.brand)} ending ${esc(x.card.last4)}<br><span class="help">Saved ${Store.fmtDate(x.card.savedAt)} for phone deposits</span></div></div>${ro ? '' : '<div style="margin-top:12px"><button class="btn s" data-rmcard>Remove card</button></div>'}` : `<div class="help" style="margin-top:6px">${Store.fac(x.facilityId).cardProcessor ? 'No card saved. Save one during a card deposit.' : 'Card processor not connected at this facility yet. Prodigy can turn it on under Facility setup.'}</div>`)}</div>
          <div class="card pad"><h3>Details</h3><dl class="kv" style="margin-top:10px"><dt>Account</dt><dd>${x.booking}</dd><dt>Held for</dt><dd>${x.heldFor}</dd><dt>Privilege</dt><dd>${x.privilege}</dd>${raw(x.rule ? `<dt>Rule</dt><dd>${esc(x.rule.text)}</dd>` : '')}${raw(x.releaseTo ? `<dt>Released to</dt><dd>${esc(x.releaseTo)}</dd>` : '')}</dl></div>
          <div class="card pad"><h3>Notes for staff</h3>${raw(x.notes.length ? '<div style="margin-top:8px;display:flex;flex-direction:column;gap:6px;font-size:14px">' + x.notes.map((n) => `<div>${esc(n.text)}<br><span class="help">${esc(n.by)}, ${Store.fmtWhen(n.at)}</span></div>`).join('') + '</div>' : '<div class="help" style="margin-top:6px">No notes.</div>')}${ro ? '' : '<div style="margin-top:10px"><button class="btn s" data-note>Add note</button></div>'}</div>
        </div>
      </div>`);
    $('#filt').onchange = (e) => { location.hash = `#/officer/inmate?id=${x.id}&show=${e.target.value}`; };
    $$('[data-rcpt]').forEach((a) => (a.onclick = (e) => { e.preventDefault(); showReceipt(Store.S.txns.find((t) => t.id === a.dataset.rcpt)); }));
    $$('[data-note]').forEach((b) => (b.onclick = () => noteDlg(x)));
    const rm = $('[data-rmcard]'); if (rm) rm.onclick = () => confirmDlg('Remove the saved card?', 'The inmate will no longer be able to add funds from the phone with this card.', 'Remove', () => { Store.removeCard(x.id); toast('Card removed'); render(); }, true);
    const bl = $('[data-bill]'); if (bl) bl.onclick = () => billDlg(x);
    const sm = $('[data-stmt]'); if (sm) sm.onclick = () => statementDlg(x);
    $$('[data-refund]').forEach((b) => (b.onclick = () => refundDlg(Store.S.txns.find((t) => t.id === b.dataset.refund))));
    if (q.fix) { const t = Store.S.txns.find((k) => k.id === q.fix); if (t) fixDlg(t); }
    if (q.bill) billDlg(x);
  });

  function noteDlg(x) { const w = modal(h`<h2>Add a note for staff</h2><label class="f">Note<textarea id="nt" placeholder="Other officers will see this on the inmate's page"></textarea></label><div class="actions"><button class="btn" data-x>Cancel</button><button class="btn p" data-ok>Save note</button></div>`); $('[data-x]', w).onclick = close; $('[data-ok]', w).onclick = () => { const v = $('#nt', w).value.trim(); if (!v) return; Store.addNote(x.id, v); close(); toast('Note saved'); render(); }; }

  function statementDlg(x) { const txs = Store.txFor(x.id); let run = 0; const rows = txs.filter((t) => !t.excluded).map((t) => { const sign = { deposit: 1, refund: 1, holdrelease: 1, charge: -1, purchase: -1, release: -1, reversal: 1 }[t.type] || 0; run += sign * t.amount; return `<tr><td>${Store.fmtDate(t.at)}</td><td>${esc(txLabel(t))}${t.voided ? ' (voided)' : ''}</td><td class="r">${txAmount(t)}</td><td class="r">${M(run)}</td></tr>`; }).join(''); const w = modal(h`<h2>Account statement</h2><div class="help">${Store.inmateName(x)}, booking ${x.booking}, ${Store.fac(x.facilityId).name}. Printed ${Store.fmtDate(Store.now().toISOString())} by ${ses().user}.</div><div class="tbl"><table><thead><tr><th>Date</th><th>What</th><th class="r">Amount</th><th class="r">Running</th></tr></thead><tbody>${raw(rows)}</tbody></table></div><div class="actions"><button class="btn" data-x>Close</button><button class="btn p" onclick="window.print()">Print</button></div>`, { width: 760 }); $('[data-x]', w).onclick = close; }

  // ---------- deposit ----------
  route('/officer/deposit', (q) => {
    if (!q.id) { location.hash = '#/officer/find?then=deposit'; return; }
    const x = Store.inmate(q.id); const f = Store.fac(x.facilityId); const st = Store.settingsFor(x.facilityId); const b = Store.balance(x.id);
    let tender = q.tender || 'cash';
    const page = () => {
      const feePct = st.deposits.cardFeePct;
      shell(h`
        <div class="help"><a href="#/officer/home">Home</a> / <a href="#/officer/inmate?id=${x.id}">${Store.inmateName(x)}</a> / Deposit</div>
        <div style="display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start">
          <div style="flex:1 1 560px;min-width:0;max-width:760px;display:flex;flex-direction:column;gap:20px">
            <div><h1>Deposit for ${Store.inmateName(x)}</h1><div class="sub">Booking ${x.booking}, ${x.housing}. Available now ${M(b.avail)}${b.owed ? ', owes ' + M(b.owed) + ' (collected first)' : ''}. <a href="#/officer/find?then=deposit">Wrong inmate?</a></div></div>
            <form id="dep" class="card pad" style="display:flex;flex-direction:column;gap:18px">
              <div><div style="font-weight:700;font-size:16px;margin-bottom:10px">1. What did you receive?</div>
                <div class="grid g3"><button type="button" class="tender ${tender === 'cash' ? 'on' : ''}" data-t="cash">Cash<small>Bills and coins</small></button><button type="button" class="tender ${tender === 'check' || tender === 'money order' ? 'on' : ''}" data-t="check">Check or money order<small>Can be placed on hold</small></button><button type="button" class="tender ${tender === 'card' ? 'on' : ''}" data-t="card" ${f.cardProcessor ? '' : 'disabled title="Card processor not connected"'}>Credit or debit card<small>${f.cardProcessor ? 'Swipe, tap, or key in' : 'Not connected at this facility'}</small></button></div></div>
              <div><div style="font-weight:700;font-size:16px;margin-bottom:10px">2. Amount</div><label class="f" style="max-width:260px">Amount received<input class="big" id="amt" type="number" step="0.01" min="0.01" value="${q.amt || ''}" placeholder="0.00" required></label></div>
              ${raw(tender === 'cash' ? `<div><div style="font-weight:700;font-size:16px;margin-bottom:10px">3. Details</div><div class="grid g2"><label class="f">Where it came from<select id="src"><option>Booking (on inmate at intake)</option><option>Family or friend at the window</option><option>Mail</option><option>Other</option></select></label><label class="f">Note (optional)<input id="note" placeholder="Anything the next officer should know"></label></div></div>` : '')}
              ${raw(tender === 'check' || tender === 'money order' ? `<div><div style="font-weight:700;font-size:16px;margin-bottom:10px">3. Check details</div><div class="grid g2"><label class="f">Type<select id="ctype"><option>Payroll check</option><option ${st.deposits.personalChecks ? '' : 'disabled'}>Personal check</option><option>Money order</option><option>Check from another agency</option><option>Government check</option></select></label><label class="f">Check or money order number<input id="cno" required></label><label class="f">Who it is from<input id="payer" required></label><label class="f">Hold funds until<input id="hold" type="date"><span class="help">Leave blank for no hold. Agency and government checks usually need none. A Manager can release a hold early.</span></label></div></div>` : '')}
              ${raw(tender === 'card' ? `<div><div style="font-weight:700;font-size:16px;margin-bottom:10px">3. Card</div><div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:16px;border:1px dashed #cdd5e0;border-radius:10px;background:#f9fafc"><div style="flex:1 1 240px"><strong>Swipe or tap the card now</strong><br><span class="help">Reader connected. Or key it in below.</span></div><button type="button" class="btn" id="keyin">Key in card manually</button></div><div class="grid g2" style="margin-top:12px"><label class="f">Name on card<input id="cardname" placeholder="As printed"></label><label class="f">Last four digits<input id="last4" maxlength="4" value="${x.card ? x.card.last4 : ''}" placeholder="4417"></label><label class="f">Card brand<select id="brand"><option>Visa</option><option>Mastercard</option><option>Discover</option></select></label><label class="f">Facility fee<input id="fee" readonly value="${feePct}%"><span class="help" id="feeNote">Set by the facility.</span></label></div>${st.deposits.cardOnFile ? `<label class="tog" style="margin-top:12px"><input type="checkbox" id="savecard" checked><span>Save this card to the inmate's account for phone deposits<br><span class="help">Only the card brand and last four digits are shown to staff.</span></span></label>` : ''}</div>` : '')}
              <div class="actions" style="border-top:1px solid #e3e8ef;padding-top:16px"><a class="btn" href="#/officer/inmate?id=${x.id}">Cancel</a><button class="btn p" style="padding:0 28px;font-size:17px">Post deposit and print receipt</button></div>
            </form></div>
          <div style="flex:0 1 320px;display:flex;flex-direction:column;gap:16px">
            <div class="card pad"><h3>After you post</h3><div id="after" style="margin-top:8px;font-size:15px;display:flex;flex-direction:column;gap:8px"></div></div>
            ${raw(st.approvals.depositOver.on ? `<div class="note warn">Deposits over ${M(st.approvals.depositOver.amount)} wait for Manager approval before the funds are available.</div>` : '')}
          </div></div>`);
      $$('.tender').forEach((bt) => (bt.onclick = () => { location.hash = `#/officer/deposit?id=${x.id}&tender=${bt.dataset.t}&amt=${encodeURIComponent($('#amt').value)}`; }));
      const after = () => { const a = parseFloat($('#amt').value) || 0; const hold = tender !== 'cash' && tender !== 'card' && $('#hold') && $('#hold').value; const fee = tender === 'card' ? Store.round2(a * feePct / 100) : 0; const net = a - fee; const collect = Math.min(b.owed, hold ? 0 : net); $('#after').innerHTML = `<div>${chip('Available', 'ok')} <strong>${M(b.avail + (hold ? 0 : net - collect))}</strong></div><div>${chip('On hold', 'warn')} <strong>${M(b.held + (hold ? a : 0))}</strong></div>${collect ? `<div class="help">${M(collect)} goes to the ${M(b.owed)} owed first.</div>` : ''}${fee ? `<div class="help">Facility fee ${M(fee)}; inmate receives ${M(net)}.</div>` : ''}${hold ? `<div class="help">Held until ${Store.fmtDate(hold)}.</div>` : ''}`; };
      $('#dep').addEventListener('input', after); after();
      const ki = $('#keyin'); if (ki) ki.onclick = () => toast('Card reader demo: enter the last four digits below', 'warn');
      $('#dep').onsubmit = (e) => { e.preventDefault(); const a = parseFloat($('#amt').value); if (!(a > 0)) { toast('Enter an amount', 'warn'); return; } const o = { inmateId: x.id, tender, amount: a }; if (tender === 'cash') { o.source = $('#src').value; o.note = $('#note').value || $('#src').value; } if (tender === 'check') { o.checkType = $('#ctype').value; if (o.checkType === 'Money order') o.tender = 'money order'; o.checkNo = $('#cno').value; o.payer = $('#payer').value; o.holdUntil = $('#hold').value; o.note = o.checkType; } if (tender === 'card') { o.last4 = $('#last4').value || '4417'; o.brand = $('#brand').value; o.saveCard = $('#savecard') && $('#savecard').checked; o.note = 'Card deposit at window'; } const t = Store.deposit(o); toast(t.pendingApproval ? 'Posted; waiting for Manager approval' : 'Deposit posted, receipt #' + t.receipt); location.hash = '#/officer/inmate?id=' + x.id; setTimeout(() => showReceipt(t), 50); };
    };
    page();
  });

  // ---------- bill ----------
  route('/officer/bill', () => { location.hash = '#/officer/find?then=bill'; });
  function billDlg(x) {
    const st = Store.settingsFor(x.facilityId); const role = ses().role; const b = Store.balance(x.id);
    const types = st.chargeTypes.filter((c) => c.active && (c.who === 'officer' || role !== 'officer'));
    const w = modal(h`<div><div class="lbl">Bill inmate</div><h2 style="margin-top:4px">${Store.inmateName(x)}</h2><div class="help">Booking ${x.booking}. Available now ${M(b.avail)}.</div></div>
      <label class="f">What is this for?<select id="ct">${raw(types.map((c) => `<option value="${esc(c.name)}" data-amt="${c.amount == null ? '' : c.amount}" data-pp="${c.perPage ? 1 : 0}">${esc(c.name)}${c.amount != null ? ' (' + M(c.amount) + (c.perPage ? ' per page' : '') + ')' : ''}</option>`).join(''))}<option value="Other">Other (describe below)</option></select><span class="help">Charge types and amounts are set by your Jail Administrator.</span></label>
      <div class="grid g2"><label class="f">Amount<input class="big" id="camt" type="number" step="0.01" min="0.01"></label><label class="f">Date of service<input id="cdate" type="date" value="${Store.now().toISOString().slice(0, 10)}"></label></div>
      <label class="f">Note<textarea id="cnote" placeholder="Nurse sick call, seen by RN Patel"></textarea></label>
      <div class="note info" id="what"></div>
      <div class="actions"><button class="btn" data-x>Cancel</button><button class="btn p" data-ok>Post charge and print receipt</button></div>`);
    const sel = $('#ct', w), amt = $('#camt', w), what = $('#what', w);
    const upd = () => { const o = sel.selectedOptions[0]; if (o.dataset.amt && !amt.dataset.touched) amt.value = o.dataset.pp === '1' ? '' : o.dataset.amt; const a = parseFloat(amt.value) || 0; const fromAvail = Math.min(b.avail, a); what.innerHTML = `<strong>What happens:</strong> ${M(fromAvail)} is taken from the available balance now${a > fromAvail ? `; the other ${M(a - fromAvail)} stays on the account as owed and is collected from the next deposit` : ''}. New balance ${M(b.avail - fromAvail)}.`; };
    sel.onchange = () => { amt.dataset.touched = ''; upd(); }; amt.oninput = () => { amt.dataset.touched = '1'; upd(); }; upd();
    $('[data-x]', w).onclick = close; $('[data-ok]', w).onclick = () => { const a = parseFloat(amt.value); if (!(a > 0)) { toast('Enter an amount', 'warn'); return; } const t = Store.charge({ inmateId: x.id, chargeType: sel.value, amount: a, note: $('#cnote', w).value, serviceDate: $('#cdate', w).value }); close(); toast('Charge posted, receipt #' + t.receipt); location.hash = '#/officer/inmate?id=' + x.id; render(); setTimeout(() => showReceipt(t), 50); };
  }

  // ---------- fix ----------
  function fixDlg(t) {
    const x = Store.inmate(t.inmateId); const st = Store.settingsFor(t.facilityId); const role = ses().role;
    const afterBank = t.deposited && t.type === 'deposit';
    const opts = [];
    if (t.type === 'deposit') { opts.push(['move', 'Wrong inmate', 'Move this deposit to the inmate it belongs to. This inmate\'s balance drops by ' + M(t.amount) + '.']); opts.push(['amount', 'Wrong amount', 'Enter the correct amount. The difference is posted as a correction.']); opts.push(['void', 'Should not have been posted', afterBank ? 'Voids the deposit. It is already in a bank deposit, so this needs Manager approval.' : 'Voids the deposit. Allowed today, before the bank deposit is made.']); if (t.hold && !t.hold.released) { opts.push(['extend', 'Change the hold date', 'Move the date the funds become available.']); if (role !== 'officer') opts.push(['releaseHold', 'Release the hold early', 'Makes ' + M(t.hold.amount) + ' available now.']); } }
    if (t.type === 'charge') { opts.push(['amount', 'Wrong amount', 'Enter the correct amount. The difference is posted as a correction.']); opts.push(['type', 'Wrong charge type', 'Pick the right type. The amount stays the same.']); opts.push(['void', 'Should not have been charged', 'Reverses the charge and puts the money back.']); }
    const others = Store.facilityInmates(t.facilityId).filter((k) => k.id !== x.id).sort((a, b) => a.last.localeCompare(b.last));
    const w = modal(h`<div><div class="lbl">Fix a transaction</div><h2 style="margin-top:4px">${Store.describe(t)}</h2><div class="help">${txLabel(t)}. ${Store.fmtWhen(t.at)}, by ${t.by}. Posted to ${Store.inmateName(x)}.${afterBank ? ' Already in a bank deposit.' : ''}</div></div>
      <div><div style="font-weight:700;font-size:16px;margin-bottom:10px">What went wrong?</div><div style="display:flex;flex-direction:column;gap:10px">${raw(opts.map(([v, l, d], i) => `<label class="opt ${i === 0 ? 'on' : ''}"><input type="radio" name="fx" value="${v}" ${i === 0 ? 'checked' : ''}><span><strong>${l}</strong><small>${d}</small></span></label>`).join(''))}</div></div>
      <div id="fxExtra"></div>
      <label class="f">Why<textarea id="why" placeholder="Required. Shows on both receipts and the audit log."></textarea></label>
      <div class="note warn" id="fxNote"></div>
      <div class="actions"><button class="btn" data-x>Cancel</button><button class="btn d" data-ok>Post fix and print receipts</button></div>`);
    const extra = $('#fxExtra', w), note = $('#fxNote', w);
    const upd = () => { const v = $('input[name=fx]:checked', w).value; $$('.opt', w).forEach((o) => o.classList.toggle('on', $('input', o).value === v)); if (v === 'move') { extra.innerHTML = `<label class="f">Move to<select id="toInm">${others.map((k) => `<option value="${k.id}">${esc(Store.inmateName(k))} (Booking ${esc(k.booking)})</option>`).join('')}</select>${others.filter((k) => k.last === x.last).length ? '<span class="help">More than one inmate with this last name. Check the booking number.</span>' : ''}</label>`; note.innerHTML = `<strong>Before you post:</strong> the original stays on record. Two new entries are made, one reversing ${M(t.amount)} here and one adding ${M(t.amount)} to the other inmate. Corrected receipts print for both.`; } else if (v === 'amount') { extra.innerHTML = `<label class="f">Correct amount<input id="newAmt" type="number" step="0.01" class="big" value="${t.amount}"></label>`; note.innerHTML = `<strong>Before you post:</strong> the original stays on record and a correction for the difference is added.`; } else if (v === 'type') { extra.innerHTML = `<label class="f">Correct type<select id="newType">${st.chargeTypes.filter((c) => c.active).map((c) => `<option ${c.name === t.chargeType ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>`; note.innerHTML = 'The charge type is corrected in place and the change is logged.'; } else if (v === 'extend') { extra.innerHTML = `<label class="f">Hold until<input id="until" type="date" value="${t.hold.until.slice(0, 10)}"></label>`; note.innerHTML = 'The hold date changes and the change is logged.'; } else if (v === 'releaseHold') { extra.innerHTML = ''; note.innerHTML = `<strong>Before you post:</strong> ${M(t.hold.amount)} moves from on hold to available now.`; } else { extra.innerHTML = ''; note.innerHTML = `<strong>Before you post:</strong> the original stays on record and a reversing entry for ${M(t.amount)} is added.${afterBank && st.approvals.fixAfterDeposit && role === 'officer' ? ' Because the money is already in a bank deposit, this goes to the Manager for approval first.' : ''}`; } };
    $$('input[name=fx]', w).forEach((r) => (r.onchange = upd)); upd();
    $('[data-x]', w).onclick = close;
    $('[data-ok]', w).onclick = () => { const why = $('#why', w).value.trim(); if (!why) { toast('Say why; it goes on the receipts and the audit log', 'warn'); return; } const v = $('input[name=fx]:checked', w).value; const o = { txId: t.id, mode: v, reason: why }; if (v === 'move') o.toInmateId = $('#toInm', w).value; if (v === 'amount') { o.newAmount = parseFloat($('#newAmt', w).value); if (!(o.newAmount >= 0)) return; } if (v === 'type') o.newType = $('#newType', w).value; if (v === 'extend') o.until = $('#until', w).value; const r = Store.fix(o); close(); if (r && r.pending) toast('Sent to the Manager for approval', 'warn'); else toast('Fix posted; corrected receipts printed'); location.hash = '#/officer/inmate?id=' + x.id; render(); };
  }

  function refundDlg(t) { const x = Store.inmate(t.inmateId); const w = modal(h`<h2>Refund on order #${t.orderNo}</h2><div class="help">${Store.inmateName(x)}, ${M(t.amount)} on ${Store.fmtDate(t.at)}.</div><div class="grid g2"><label class="f">Refund amount<input id="ra" type="number" step="0.01" class="big" value="${t.amount}"></label><label class="f">Reason<input id="rr" placeholder="Item not delivered"></label></div><div class="note info">The money goes back on the inmate's account and a credit receipt prints. Refunds are a Manager action.</div><div class="actions"><button class="btn" data-x>Cancel</button><button class="btn p" data-ok>Refund</button></div>`); $('[data-x]', w).onclick = close; $('[data-ok]', w).onclick = () => { const a = parseFloat($('#ra', w).value); if (!(a > 0)) return; const r = Store.refund({ inmateId: x.id, amount: a, note: $('#rr', w).value || 'Refund on order #' + t.orderNo }); close(); toast('Refunded ' + M(a)); render(); setTimeout(() => showReceipt(r), 50); }; }

  // ---------- new inmate ----------
  route('/officer/new', () => {
    const f = Store.fac(fid());
    shell(h`
      <div class="help"><a href="#/officer/home">Home</a> / New inmate</div>
      <div style="display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start">
        <form id="nf" style="flex:1 1 560px;min-width:0;max-width:760px;display:flex;flex-direction:column;gap:20px">
          <div><h1>Create an inmate account manually</h1><div class="sub">Use this only when a booking did not come over from the JMS. The account is marked "Created manually" and matched to the JMS record when it arrives.</div></div>
          <div id="dup"></div>
          <div class="card pad" style="display:flex;flex-direction:column;gap:16px">
            <div class="grid g3"><label class="f">Last name<input id="last" required></label><label class="f">First name<input id="first" required></label><label class="f">Middle<input id="middle"></label><label class="f">Date of birth<input id="dob" type="date" required></label><label class="f">Booking number<input id="booking" placeholder="From the booking sheet"><span class="help">Leave blank if the JMS has not issued one yet.</span></label><label class="f">Housing<select id="housing"><option>Not assigned yet</option><option>Pod A</option><option>Pod B</option><option>Pod C</option><option>Booking holding</option></select></label></div>
            <label class="f">Why are you creating this manually?<select id="reason"><option>JMS feed is down</option><option>Booked but not showing in commissary</option><option>Transfer in from another agency</option><option>Other</option></select></label>
            <div class="actions" style="border-top:1px solid #e3e8ef;padding-top:16px"><a class="btn" href="#/officer/home">Cancel</a><button class="btn p" data-mode="create">Create account</button><button class="btn p" data-mode="deposit">Create and deposit now</button></div>
          </div></form>
        <div class="card pad" style="flex:0 1 320px;display:flex;flex-direction:column;gap:10px"><h3>What to know</h3><div>${raw(chip('Created manually', 'warn'))} stays on the account until the JMS record is matched by a Manager or by booking number.</div><div>You can deposit funds and bill the inmate right away.</div><div>If the JMS later sends the same person, the two records are merged, not duplicated.</div><div class="help">JMS feed last received: ${f.lastFeed ? Store.fmtWhen(f.lastFeed) : 'never (not connected)'}.</div></div>
      </div>`);
    let mode = 'create';
    $$('[data-mode]').forEach((b) => (b.onclick = () => (mode = b.dataset.mode)));
    const dupCheck = () => { const d = Store.duplicates(fid(), $('#last').value, null); const dob = $('#dob').value; const hit = d.find((k) => !dob || k.dob === dob) || d[0]; $('#dup').innerHTML = hit ? `<div class="note warn" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center"><div style="flex:1 1 320px"><strong>Possible match already in the system:</strong> ${esc(Store.inmateName(hit))}, DOB ${Store.fmtDate(hit.dob)}, booked ${Store.fmtWhen(hit.bookedAt)}${hit.status !== 'in' ? ' (' + hit.status + ')' : ''}. If this is the same person, open that account instead of creating another.</div><a class="btn" href="#/officer/inmate?id=${hit.id}" style="min-height:40px">Open ${esc(Store.inmateName(hit))}</a></div>` : ''; };
    $('#last').oninput = dupCheck; $('#dob').onchange = dupCheck;
    $('#nf').onsubmit = (e) => { e.preventDefault(); const x = Store.createInmate({ last: $('#last').value, first: $('#first').value, middle: $('#middle').value, dob: $('#dob').value, booking: $('#booking').value, housing: $('#housing').value, reason: $('#reason').value }); toast('Account created for ' + Store.inmateName(x)); location.hash = mode === 'deposit' ? '#/officer/deposit?id=' + x.id : '#/officer/inmate?id=' + x.id; };
  });

  // ---------- receipts ----------
  route('/officer/receipts', () => {
    const today = Store.dayKey(Store.now().toISOString());
    const mine = Store.facilityTx(fid()).filter((t) => t.receipt && Store.dayKey(t.at) === today).sort((a, b) => a.at < b.at ? 1 : -1);
    shell(h`<div><h1>Receipts today</h1><div class="sub">Every receipt issued at ${Store.fac(fid()).name} today, newest first. Reprint or fix from here.</div></div>
      <div class="card tbl"><table><thead><tr><th>Receipt</th><th>When</th><th>Inmate</th><th>What</th><th class="r">Amount</th><th>By</th><th></th></tr></thead><tbody>${raw(mine.length ? mine.map((t) => `<tr ${t.voided ? 'style="opacity:.6"' : ''}><td>#${t.receipt}</td><td>${Store.fmtTime(t.at)}</td><td><a href="#/officer/inmate?id=${t.inmateId}">${esc(Store.inmateName(Store.inmate(t.inmateId)))}</a></td><td>${chipFor(t)} ${esc(txLabel(t))}</td><td class="r">${txAmount(t)}</td><td>${esc(t.by)}</td><td style="white-space:nowrap"><a href="#" data-rcpt="${t.id}">Reprint</a> ${!t.voided && ['deposit', 'charge'].includes(t.type) ? `<span class="muted">|</span> <a href="#/officer/inmate?id=${t.inmateId}&fix=${t.id}">Fix</a>` : ''}</td></tr>`).join('') : '<tr><td colspan="7" class="muted">No receipts yet today.</td></tr>')}</tbody></table></div>`);
    $$('[data-rcpt]').forEach((a) => (a.onclick = (e) => { e.preventDefault(); showReceipt(Store.S.txns.find((t) => t.id === a.dataset.rcpt)); }));
  });

  window.OfficerViews = { billDlg, fixDlg };
})();
