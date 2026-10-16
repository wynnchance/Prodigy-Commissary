/* Manager views: today, drawer, bank, reconcile, releases, orders */
(function () {
  const { $, $$, esc, h, raw, M, chip, chipFor, txLabel, txAmount, modal, close, toast, confirmDlg, showReceipt, shell, route, render } = UI;
  const ses = () => Store.S.session;
  const fid = () => ses().facilityId;
  const today = () => Store.dayKey(Store.now().toISOString());

  // ---------- today ----------
  route('/manager/today', () => {
    const f = Store.fac(fid()); const S = Store.S; const tx = Store.facilityTx(fid());
    const tdy = tx.filter((t) => Store.dayKey(t.at) === today());
    const received = tdy.filter((t) => t.type === 'deposit' && !t.voided).reduce((s, t) => s + t.amount, 0);
    const byT = (k) => tdy.filter((t) => t.type === 'deposit' && !t.voided && t.tender === k).reduce((s, t) => s + t.amount, 0);
    const paid = tdy.filter((t) => t.type === 'release').reduce((s, t) => s + t.amount, 0);
    const und = Store.undeposited(fid()); const undTotal = und.reduce((s, t) => s + t.amount, 0);
    const bal = Store.totalBalances(fid()); const nAcc = Store.facilityInmates(fid(), true).filter((x) => x.status !== 'closed').length;
    const last = Store.lastBankDeposit(fid()); const drawer = Store.todayDrawer(fid());
    const fixesToday = tdy.filter((t) => t.type === 'reversal').length;
    const rel = Store.releaseQueue(fid()).filter((q) => q.bal.avail + q.bal.held > 0);
    const carts = S.carts.filter((c) => c.facilityId === fid()); const dec = carts.filter((c) => c.status === 'decision').length, ready = carts.filter((c) => c.status === 'ready').length;
    const due = Store.transferDueFor(fid());
    const pend = S.approvals.filter((a) => a.facilityId === fid() && a.status === 'pending');
    const holds = tx.filter((t) => t.hold && !t.hold.released && !t.voided && new Date(t.hold.until) > Store.now());
    const stale = S.checks.filter((c) => c.facilityId === fid() && !c.cashed && (Store.now() - new Date(c.at)) / Store.DAY > Store.settingsFor(fid()).releases.staleDays);
    const lastRec = S.reconciliations.filter((r) => r.facilityId === fid()).sort((a, b) => a.month < b.month ? 1 : -1)[0];
    const lastMonth = Store.monthKey(new Date(Store.now().getFullYear(), Store.now().getMonth(), 0).toISOString());
    const recDue = !lastRec || lastRec.month < lastMonth;
    const steps = [
      { n: 1, t: 'Review today\'s receipts', d: `${tdy.filter((t) => t.receipt).length} receipts, ${fixesToday} fix${fixesToday === 1 ? '' : 'es'}. Receipt numbers are sequential; voids need a reason.`, done: true, href: '#/officer/receipts', lbl: 'Receipts' },
      { n: 2, t: 'Count the drawer', d: drawer ? `Counted ${M(drawer.counted)} vs ${M(drawer.expected)} expected${drawer.diff ? ', ' + (drawer.diff > 0 ? 'over' : 'short') + ' ' + M(Math.abs(drawer.diff)) : ', matched'}. Verified by ${esc(drawer.verifiedBy || 'nobody yet')}.` : `System expects ${M(Store.drawerExpected(fid()))} cash. Enter the count; any difference posts to Over/Short with a note.`, done: !!drawer, href: '#/manager/drawer', lbl: drawer ? 'Recount' : 'Count now' },
      { n: 3, t: 'Make the bank deposit', d: und.length ? `${M(undTotal)} in ${und.length} cash, check, and money order receipts ready. Prints the slip and the receipt list behind it.` : 'Nothing waiting. Last deposit ' + (last ? Store.fmtWhen(last.at) + ' for ' + M(last.total) : 'none'), done: !und.length, href: '#/manager/bank', lbl: 'Build deposit' },
      { n: 4, t: 'Pay out releases', d: rel.length ? `${rel.length} released inmate${rel.length === 1 ? '' : 's'} still ${rel.length === 1 ? 'has' : 'have'} a balance: ${rel.map((q) => M(q.bal.avail + q.bal.held)).join(', ')}.` : 'No released inmates waiting.', done: !rel.length, href: '#/manager/releases', lbl: 'Open queue' },
      { n: 5, t: 'Post commissary orders', d: `Warehouse cutoff ${esc(f.cutoff)}. ${ready} cart${ready === 1 ? '' : 's'} ready, ${dec} need${dec === 1 ? 's' : ''} a decision.`, done: !ready && !dec, href: '#/manager/orders', lbl: 'Review carts' },
    ];
    const doneN = steps.filter((s) => s.done).length; let firstTodo = true;
    shell(h`
      <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;justify-content:space-between"><div><h1>${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h1><div class="sub">Close-out for today. Last bank deposit ${last ? Store.fmtWhen(last.at) : 'none yet'}.</div></div><div style="display:flex;gap:10px"><button class="btn" data-summary>Print today's summary</button><a class="btn p" href="${steps.find((s) => !s.done) ? steps.find((s) => !s.done).href : '#/manager/reconcile'}">${doneN === 5 ? 'All done; open reconciliation' : 'Continue close-out'}</a></div></div>
      <div class="grid g4">
        <div class="card kpi"><b>Received today</b><span>${M(received)}</span><small>Cash ${M(byT('cash'))}, checks ${M(byT('check') + byT('money order'))}, cards ${M(byT('card'))}, kiosk ${M(byT('kiosk'))}</small></div>
        <div class="card kpi"><b>Paid out today</b><span>${M(paid)}</span><small>${tdy.filter((t) => t.type === 'release').length} releases</small></div>
        <div class="card kpi"><b>Not yet deposited</b><span style="color:${und.length ? '#8a4b00' : '#166534'}">${M(undTotal)}</span><small>${und.length} receipts since ${last ? Store.fmtWhen(last.at) : 'start'}</small></div>
        <div class="card kpi"><b>All inmate balances</b><span>${M(bal.avail + bal.held)}</span><small>${nAcc} accounts, ${M(bal.held)} on hold</small></div>
      </div>
      <div class="grid g3">
        <div class="card span2"><div class="cardh"><h2>Daily close-out</h2><span class="help">${doneN} of 5 done</span></div>
          ${raw(steps.map((s) => { const cls = s.done ? 'done' : firstTodo ? 'todo' : 'later'; const btn = s.done ? chip('Done', 'ok') : `<a class="btn s ${firstTodo ? 'p' : ''}" href="${s.href}">${s.lbl}</a>`; if (!s.done) firstTodo = false; return `<div class="step"><div class="num ${cls}">${s.n}</div><div style="flex:1"><strong>${s.t}</strong><br><span class="help">${s.d}</span></div>${btn}</div>`; }).join(''))}
        </div>
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="card pad"><h3>Needs your attention</h3><div style="margin-top:10px;display:flex;flex-direction:column;gap:10px;font-size:14px">
            ${raw(pend.filter((a) => a.kind === 'fix' || a.kind === 'deposit').map((a) => `<div>${chip('Approval', 'warn')} ${esc(a.title)}. <a href="#/admin/overview">Review</a></div>`).join(''))}
            ${raw(holds.slice(0, 3).map((t) => `<div>${chip('Hold', 'warn')} ${esc(t.tender === 'money order' ? 'Money order' : 'Check')} hold for ${esc(Store.inmateName(Store.inmate(t.inmateId)))} releases ${Store.fmtDate(t.hold.until)}. <a href="#/officer/inmate?id=${t.inmateId}&fix=${t.id}">Release early</a></div>`).join(''))}
            ${raw(stale.map((c) => `<div>${chip('Stale check', 'bad')} Release check #${c.id} (${M(c.amount)}) uncashed ${Math.floor((Store.now() - new Date(c.at)) / Store.DAY)} days. <a href="#/manager/releases">Follow up</a></div>`).join(''))}
            ${raw(!pend.length && !holds.length && !stale.length ? '<div class="help">Nothing waiting.</div>' : '')}
          </div></div>
          <div class="card pad"><h3>This month</h3><div style="margin-top:10px;display:flex;flex-direction:column;gap:8px;font-size:14px">
            <div style="display:flex;justify-content:space-between"><span>Bank reconciliation</span>${raw(recDue ? chip('Due for ' + new Date(lastMonth + '-02').toLocaleDateString('en-US', { month: 'short' }), 'warn') : chip('Done for ' + new Date(lastRec.month + '-02').toLocaleDateString('en-US', { month: 'short' }), 'ok'))}</div>
            <div style="display:flex;justify-content:space-between"><span>Commissary transfer</span>${raw(due > 0 ? chip(M(due) + ' due', 'warn') : chip('Up to date', 'ok'))}</div>
            <div style="display:flex;justify-content:space-between"><span>Unclaimed funds review</span>${raw(stale.length ? chip(stale.length + ' to follow up', 'warn') : chip('Clear', 'ok'))}</div>
          </div><a href="#/manager/reconcile" style="display:inline-block;margin-top:10px;font-size:14px">Open reconciliation</a></div>
        </div>
      </div>`);
    $('[data-summary]').onclick = () => { const w = modal(h`<h2>Daily summary, ${Store.fmtDate(Store.now().toISOString())}</h2><div class="help">${f.name}. Prepared by ${ses().user}.</div><table><tbody><tr><td>Received</td><td class="r">${M(received)}</td></tr><tr><td>Paid out</td><td class="r">${M(paid)}</td></tr><tr><td>Drawer</td><td class="r">${drawer ? M(drawer.counted) + ' counted, ' + M(drawer.expected) + ' expected' : 'not counted'}</td></tr><tr><td>Not yet deposited</td><td class="r">${M(undTotal)}</td></tr><tr><td>All inmate balances</td><td class="r">${M(bal.avail + bal.held)}</td></tr><tr><td>Receipts issued</td><td class="r">${tdy.filter((t) => t.receipt).length}</td></tr><tr><td>Fixes</td><td class="r">${fixesToday}</td></tr></tbody></table><div class="actions"><button class="btn" data-x>Close</button><button class="btn p" onclick="window.print()">Print</button></div>`); $('[data-x]', w).onclick = close; };
  });

  // ---------- drawer ----------
  route('/manager/drawer', () => {
    const exp = Store.drawerExpected(fid()); const prev = Store.todayDrawer(fid()); const st = Store.settingsFor(fid());
    const staff = Store.S.staff.filter((s) => s.facilityId === fid() && s.active && s.role !== 'auditor' && s.name !== ses().user);
    const dens = [['100', 100], ['50', 50], ['20', 20], ['10', 10], ['5', 5], ['1', 1]];
    shell(h`
      <div class="help"><a href="#/manager/today">Today</a> / Count the drawer</div>
      <div style="display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start">
        <div style="flex:1 1 520px;min-width:0;max-width:720px;display:flex;flex-direction:column;gap:16px">
          <div><h1>Count the booking drawer</h1><div class="sub">Step 2 of 5. Count what is in the drawer and enter it below. The system already knows what it should be.</div></div>
          ${raw(prev ? `<div class="note info">Already counted today at ${Store.fmtTime(prev.at)}: ${M(prev.counted)} vs ${M(prev.expected)}. Counting again replaces it.</div>` : '')}
          <div class="card count"><table><thead><tr><th>Denomination</th><th class="r">Count</th><th class="r">Amount</th></tr></thead><tbody>
            ${raw(dens.map(([l, v]) => `<tr><td>$${l}</td><td class="r"><input type="number" min="0" data-den="${v}" value="0"></td><td class="r" data-amt="${v}">$0.00</td></tr>`).join(''))}
            <tr><td>Coins</td><td class="r"><input type="number" step="0.01" min="0" data-den="coin" value="0.00"></td><td class="r" data-amt="coin">$0.00</td></tr>
            <tr style="font-weight:700;background:#f9fafc"><td>Counted</td><td></td><td class="r" style="font-size:18px" id="counted">$0.00</td></tr></tbody></table></div>
        </div>
        <div style="flex:1 1 360px;max-width:460px;display:flex;flex-direction:column;gap:16px">
          <div class="card pad" style="display:flex;flex-direction:column;gap:12px"><h3>Does it match?</h3>
            <div style="display:flex;justify-content:space-between"><span>System expects<br><span class="help">cash received since the last bank deposit, less cash paid out</span></span><strong>${M(exp)}</strong></div>
            <div style="display:flex;justify-content:space-between"><span>You counted</span><strong id="c2">$0.00</strong></div>
            <div id="match" class="note info">Enter the count.</div>
            <label class="f" id="noteWrap">What happened? (required when there is a difference)<textarea id="dnote" placeholder="Recount first if you can."></textarea></label>
            <div class="help">A difference of any size is posted to Over/Short with this note, and it shows on the daily summary and the audit log.</div></div>
          <div class="card pad" style="display:flex;flex-direction:column;gap:12px"><h3>Who counted, who verified</h3>
            <div class="grid g2"><label class="f">Counted by<input value="${ses().user}" readonly></label><label class="f">Verified by<select id="verify"><option value="">Choose a second person</option>${raw(staff.map((s) => `<option>${esc(s.name)}</option>`).join(''))}</select></label></div>
            <div class="help">${st.approvals.drawerVerify ? 'Your facility requires two people on every count. The verifier confirms on their own login or by entering their PIN here.' : 'A second person is recommended but not required at this facility.'}</div></div>
          <div class="actions"><a class="btn" href="#/manager/today">Save for later</a><button class="btn p" id="rec">Record count and continue to deposit</button></div>
        </div></div>`);
    const upd = () => { let total = 0; $$('[data-den]').forEach((i) => { const d = i.dataset.den; const v = parseFloat(i.value) || 0; const amt = d === 'coin' ? v : v * parseFloat(d); total += amt; $(`[data-amt="${d}"]`).textContent = M(amt); }); total = Store.round2(total); $('#counted').textContent = M(total); $('#c2').textContent = M(total); const diff = Store.round2(total - exp); const m = $('#match'); if (diff === 0) { m.className = 'note ok'; m.innerHTML = `<strong>Matches.</strong> ${chip('Balanced', 'ok')}`; } else { m.className = 'note bad'; m.innerHTML = `<strong>${diff > 0 ? 'Over' : 'Short'} by ${M(Math.abs(diff))}</strong> ${chip('Over/Short', 'bad')}`; } return { total, diff }; };
    $$('[data-den]').forEach((i) => (i.oninput = upd)); upd();
    $('#rec').onclick = () => { const { total, diff } = upd(); const note = $('#dnote').value.trim(); const v = $('#verify').value; if (diff !== 0 && !note) { toast('Say what happened; the difference goes to Over/Short with your note', 'warn'); return; } if (st.approvals.drawerVerify && !v) { toast('Pick who verified the count', 'warn'); return; } Store.recordDrawer({ counted: total, note, verifiedBy: v }); toast(diff === 0 ? 'Count recorded, balanced' : 'Count recorded, ' + (diff > 0 ? 'over ' : 'short ') + M(Math.abs(diff)) + ' posted to Over/Short'); location.hash = '#/manager/bank'; };
  });

  // ---------- bank deposit ----------
  route('/manager/bank', (q) => {
    const f = Store.fac(fid()); const b = Store.buildBankDeposit(fid()); const drawer = Store.todayDrawer(fid()); const last = Store.lastBankDeposit(fid());
    const hist = Store.S.bankDeposits.filter((d) => d.facilityId === fid()).sort((a, c) => a.at < c.at ? 1 : -1).slice(0, 8);
    const slip = `${f.name.toUpperCase()}\nInmate Trust Fund\n${f.bank}\n\nDate: ${Store.fmtDate(Store.now().toISOString())}\nCash         ${M(b.cash)}\nChecks (${b.checkList.length})   ${M(b.checks + b.mos)}\nTOTAL        ${M(b.total)}\n\nReceipts ${b.receipts.length ? '#' + Math.min(...b.receipts.map((t) => t.receipt)) + ' to #' + Math.max(...b.receipts.map((t) => t.receipt)) : 'none'}\nPrepared: ${ses().user}\nVerified: ${drawer ? drawer.verifiedBy || 'not verified' : 'drawer not counted'}`;
    shell(h`
      <div class="help"><a href="#/manager/today">Today</a> / Bank deposit</div>
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:16px;align-items:flex-end"><div><h1>Bank deposit to the Inmate Trust Fund</h1><div class="sub">Step 3 of 5. Everything received in cash, check, or money order since the last deposit${last ? ' (' + Store.fmtWhen(last.at) + ')' : ''}. The county holds the account; this records the deposit and prints the slip.</div></div></div>
      ${raw(!drawer ? `<div class="note warn">The drawer has not been counted today. <a href="#/manager/drawer">Count it first</a> so the cash in this deposit has been verified.</div>` : drawer.diff ? `<div class="note warn">Drawer count was ${drawer.diff > 0 ? 'over' : 'short'} ${M(Math.abs(drawer.diff))} (${esc(drawer.note)}). The deposit uses what was receipted; the difference is already in Over/Short.</div>` : `<div class="note ok">Drawer count matched, verified by ${esc(drawer.verifiedBy || 'nobody')}.</div>`)}
      <div class="grid g3">
        <div class="span2" style="display:flex;flex-direction:column;gap:16px">
          <div class="card"><div class="cardh"><h2>What goes to the bank</h2></div><table><thead><tr><th>Tender</th><th>Receipts</th><th class="r">Amount</th></tr></thead><tbody>
            <tr><td>Cash</td><td>${b.receipts.filter((t) => t.tender === 'cash').length} receipts</td><td class="r">${M(b.cash)}</td></tr>
            <tr><td>Checks</td><td>${raw(b.checkList.filter((t) => t.tender === 'check').map((t) => `#${esc(t.checkNo)} ${esc(t.payer)} ${M(t.amount)}`).join(', ') || '0')}</td><td class="r">${M(b.checks)}</td></tr>
            <tr><td>Money orders</td><td>${raw(b.checkList.filter((t) => t.tender === 'money order').map((t) => `#${esc(t.checkNo)} ${M(t.amount)}`).join(', ') || '0')}</td><td class="r">${M(b.mos)}</td></tr>
            <tr style="font-weight:700;background:#f9fafc"><td>Deposit total</td><td></td><td class="r" style="font-size:18px">${M(b.total)}</td></tr></tbody></table>
            <div class="help" style="padding:10px 16px">Card and kiosk deposits settle straight to the bank by ACH and are listed separately so the statement matches.</div></div>
          <div class="card"><div class="cardh"><h2>Receipts in this deposit</h2><span class="help">${b.receipts.length}</span></div><div class="tbl"><table><thead><tr><th>Receipt</th><th>When</th><th>Inmate</th><th>Tender</th><th>By</th><th class="r">Amount</th></tr></thead><tbody>${raw(b.receipts.length ? b.receipts.slice().sort((x, y) => x.at < y.at ? 1 : -1).map((t) => `<tr><td>#${t.receipt}</td><td>${Store.fmtWhen(t.at)}</td><td><a href="#/officer/inmate?id=${t.inmateId}">${esc(Store.inmateName(Store.inmate(t.inmateId)))}</a></td><td>${esc(t.tender)}${t.checkNo ? ' #' + esc(t.checkNo) : ''}${t.hold && !t.hold.released ? ' (on hold)' : ''}</td><td>${esc(t.by)}</td><td class="r">${M(t.amount)}</td></tr>`).join('') : '<tr><td colspan="6" class="muted">Nothing waiting to be deposited.</td></tr>')}</tbody></table></div></div>
          <div class="card"><div class="cardh"><h2>Past deposits</h2></div><table><thead><tr><th>Recorded</th><th>Deposited on</th><th class="r">Total</th><th>Receipts</th><th>By</th><th>Confirmation</th></tr></thead><tbody>${raw(hist.map((d) => `<tr><td>${Store.fmtWhen(d.at)}</td><td>${d.depositedOn ? Store.fmtDate(d.depositedOn) : Store.fmtDate(d.at)}</td><td class="r">${M(d.total)}</td><td>${d.receipts.length}</td><td>${esc(d.by)}</td><td>${esc(d.confirmation || '')}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">None yet.</td></tr>')}</tbody></table></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="card pad" style="display:flex;flex-direction:column;gap:12px"><h3>Deposit slip</h3><pre class="receipt">${slip}</pre><button class="btn" onclick="window.print()">Print slip and receipt list</button></div>
          <div class="card pad" style="display:flex;flex-direction:column;gap:12px"><h3>After the bank trip</h3><label class="f">Deposited on<input id="bdDate" type="date" value="${Store.now().toISOString().slice(0, 10)}"></label><label class="f">Bank confirmation or slip number<input id="bdConf" placeholder="Optional"></label><div class="help">Once marked deposited, the receipts in it lock. A fix on any of them needs Manager approval.</div><button class="btn p" id="markDep" ${b.receipts.length ? '' : 'disabled'}>Mark as deposited</button></div>
        </div></div>`);
    $('#markDep').onclick = () => { const d = Store.markDeposited({ date: $('#bdDate').value, confirmation: $('#bdConf').value }); if (d) { toast('Deposit of ' + M(d.total) + ' recorded; ' + d.receipts.length + ' receipts locked'); render(); } };
  });

  // ---------- reconcile ----------
  route('/manager/reconcile', (q) => {
    const now = Store.now(); const months = []; for (let i = 1; i <= 4; i++) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push(Store.monthKey(d.toISOString())); }
    const month = q.m || months[0]; const r = Store.reconcile(fid(), month); const label = new Date(month + '-02').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const st = Store.settingsFor(fid());
    shell(h`
      <div class="help"><a href="#/manager/today">Today</a> / Reconcile</div>
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:16px;align-items:flex-end"><div><h1>Reconcile the Inmate Trust Fund for ${label}</h1><div class="sub">Does the money in the bank equal what the inmates are owed? Enter the bank statement balance and the page does the rest.</div></div>
        <div style="display:flex;gap:10px;align-items:center"><select id="mon" aria-label="Month">${raw(months.map((m) => { const ex = Store.S.reconciliations.find((k) => k.facilityId === fid() && k.month === m); return `<option value="${m}" ${m === month ? 'selected' : ''}>${new Date(m + '-02').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}${ex ? ' (signed)' : ''}</option>`; }).join(''))}</select><button class="btn" onclick="window.print()">Print reconciliation</button></div></div>
      ${raw(r.existing ? `<div class="note ok">Signed off by ${esc(r.existing.signedBy)} on ${Store.fmtDate(r.existing.at)} with a difference of ${M(r.existing.difference)}. You can re-sign if the numbers changed.</div>` : '')}
      <div class="grid g2">
        <div class="card"><div class="cardh"><h2>Bank side</h2></div>
          <div style="padding:16px;display:flex;flex-direction:column;gap:12px;border-bottom:1px solid #eef1f5"><label class="f">Ending balance on the bank statement, ${Store.fmtDate(r.endOf)}<input id="bank" type="number" step="0.01" class="big" value="${r.existing && r.existing.bankBalance != null ? r.existing.bankBalance : r.bankStatementDefault}"></label><div style="display:flex;gap:8px"><button class="btn s" data-imp>Import statement (CSV or PDF)</button><button class="btn s" data-imp>Attach statement</button></div></div>
          <div class="row"><span>Plus deposits made but not yet on the statement<br><span class="help">recorded after month end for days in the month</span></span><b>+ ${M(r.transit)}</b></div>
          <div class="row"><span>Less checks written but not yet cashed<br><span class="help">${r.outstanding.length} checks</span></span><b>- ${M(r.outTotal)}</b></div>
          <div class="row" style="background:#f9fafc"><span><strong>Adjusted bank balance</strong></span><b id="adj">${M(r.bankStatementDefault + r.transit - r.outTotal)}</b></div></div>
        <div class="card"><div class="cardh"><h2>Book side (what the inmates are owed)</h2></div>
          <div class="row"><span>All inmate balances on ${Store.fmtDate(r.endOf)}</span><b>${M(r.balances)}</b></div>
          <div class="row"><span>Funds on hold (checks not yet cleared)</span><b>+ ${M(r.held)}</b></div>
          <div class="row"><span>Commissary purchases not yet transferred out<br><span class="help">owed to the Sheriff's Commissary Account</span></span><b>+ ${M(r.transferDue)}</b></div>
          <div class="row" style="background:#f9fafc"><span><strong>Total owed</strong></span><b>${M(r.bookTotal)}</b></div></div>
      </div>
      <div class="card pad" id="diffBox" style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;border:2px solid #166534;background:#f3fbf6">
        <div style="flex:1 1 320px"><div class="lbl" id="diffLbl">Difference</div><div style="font-size:34px;font-weight:700" id="diff">$0.00</div><div id="diffMsg"></div></div>
        <div style="flex:1 1 320px" class="help">If there is a difference, the usual causes are a deposit recorded on the wrong day, a check cashed for a different amount, or a fix posted after the bank deposit. Start with the Adjustments report for the month.</div>
        <button class="btn p" id="sign">Sign off ${label}</button></div>
      <div class="card"><div class="cardh"><h2>Checks not yet cashed</h2>${raw(r.outstanding.some((c) => (now - new Date(c.at)) / Store.DAY > st.releases.staleDays) ? chip('Some older than ' + st.releases.staleDays + ' days', 'warn') : '')}</div>
        <table><thead><tr><th>Check</th><th>Date</th><th>Paid to</th><th>Reason</th><th class="r">Amount</th><th>Age</th><th></th></tr></thead><tbody>${raw(r.outstanding.map((c) => { const age = Math.floor((now - new Date(c.at)) / Store.DAY); return `<tr><td>#${c.id}</td><td>${Store.fmtDate(c.at)}</td><td>${esc(c.to)}</td><td>${esc(c.reason)}</td><td class="r">${M(c.amount)}</td><td>${age > st.releases.staleDays ? chip(age + ' days', 'warn') : age + ' days'}</td><td><a href="#" data-cashed="${c.id}">Mark cashed</a>${age > st.releases.staleDays ? ` <span class="muted">|</span> <a href="#/manager/releases">Follow up</a>` : ''}</td></tr>`; }).join('') || '<tr><td colspan="7" class="muted">None outstanding.</td></tr>')}</tbody></table></div>`);
    const upd = () => { const bank = parseFloat($('#bank').value) || 0; const adj = Store.round2(bank + r.transit - r.outTotal); $('#adj').textContent = M(adj); const diff = Store.round2(adj - r.bookTotal); $('#diff').textContent = M(diff); const box = $('#diffBox'); const ok = Math.abs(diff) < 0.005; box.style.borderColor = ok ? '#166534' : '#b42318'; box.style.background = ok ? '#f3fbf6' : '#fde4e1'; $('#diffLbl').style.color = ok ? '#166534' : '#9f1d12'; $('#diffMsg').innerHTML = ok ? `<span style="color:#166534">The bank and the books agree for ${label}.</span>` : `<span style="color:#9f1d12">The bank has ${diff > 0 ? 'more' : 'less'} than the books by ${M(Math.abs(diff))}. Find it before signing.</span>`; return diff; };
    $('#bank').oninput = upd; upd();
    $('#mon').onchange = (e) => { location.hash = '#/manager/reconcile?m=' + e.target.value; };
    $$('[data-imp]').forEach((b) => (b.onclick = () => toast('Statement import is not wired in the mockup; type the ending balance', 'warn')));
    $('#sign').onclick = () => { const diff = upd(); const go = () => { Store.signReconciliation(fid(), month, parseFloat($('#bank').value) || 0, diff); toast(label + ' signed off'); render(); }; if (Math.abs(diff) >= 0.005) confirmDlg('Sign with a difference?', `There is an unexplained ${M(Math.abs(diff))}. Auditors will ask about it. Sign anyway and note it?`, 'Sign anyway', go, true); else go(); };
    $$('[data-cashed]').forEach((a) => (a.onclick = (e) => { e.preventDefault(); const c = Store.S.checks.find((k) => k.id == a.dataset.cashed); c.cashed = true; c.cashedAt = now.toISOString(); Store.log('check cashed', '#' + c.id + ' ' + M(c.amount)); Store.save(); toast('Check #' + c.id + ' marked cashed'); render(); }));
  });

  // ---------- releases ----------
  route('/manager/releases', (q) => {
    const st = Store.settingsFor(fid()); const queue = Store.releaseQueue(fid()); const sel = q.id ? queue.find((k) => k.inmate.id === q.id) : queue.find((k) => k.bal.avail + k.bal.held > 0);
    const f = Store.fac(fid()); const now = Store.now();
    const stale = Store.S.checks.filter((c) => c.facilityId === fid() && !c.cashed && (now - new Date(c.at)) / Store.DAY > st.releases.staleDays);
    const closedWithBal = Store.S.inmates.filter((x) => x.facilityId === fid() && x.status === 'closed' && Store.balance(x.id).avail > 0);
    const hist = Store.facilityTx(fid()).filter((t) => t.type === 'release').sort((a, b) => a.at < b.at ? 1 : -1).slice(0, 6);
    const methods = [['card', 'Debit card', 'Loaded at the window. ' + (sel && sel.bal.held ? 'The ' + M(sel.bal.held) + ' hold is paid by check when it clears, or release the hold now.' : ''), st.releases.debitCard], ['check', 'Check', 'Printed now, two signatures required.', st.releases.check], ['cash', 'Cash from the drawer', st.releases.cash ? 'Receipted and signed for.' : 'Not allowed at this facility.', st.releases.cash], ['agency', 'Transfer to receiving agency', 'For transfers; check made out to the agency.', true]];
    shell(h`
      <div class="help"><a href="#/manager/today">Today</a> / Releases</div>
      <div><h1>Released inmates with money on account</h1><div class="sub">From the JMS release feed. An account closes only after the funds are paid out and the release form is marked signed.</div></div>
      <div class="grid g5">
        <div class="card span3"><div class="cardh"><h2>Waiting to be paid out</h2><span class="help">${queue.filter((k) => k.bal.avail + k.bal.held > 0).length} inmates, ${M(queue.reduce((s, k) => s + k.bal.avail + k.bal.held, 0))}</span></div>
          <table><thead><tr><th>Inmate</th><th>Released</th><th>Going to</th><th class="r">Owed to inmate</th><th></th></tr></thead><tbody>${raw(queue.length ? queue.map((k) => `<tr ${sel && sel.inmate.id === k.inmate.id ? 'style="background:#e3eefc"' : ''}><td><a href="#/officer/inmate?id=${k.inmate.id}"><strong>${esc(Store.inmateName(k.inmate))}</strong></a><br><span class="help">Booking ${esc(k.inmate.booking)}${k.bal.owed ? ', owes ' + M(k.bal.owed) : ''}</span></td><td>${Store.fmtWhen(k.inmate.releasedAt)}</td><td>${esc(k.inmate.releaseTo)}</td><td class="r"><strong>${M(k.bal.avail + k.bal.held)}</strong>${k.bal.held ? `<br><span class="help" style="color:#8a4b00">${M(k.bal.held)} of it on hold</span>` : ''}</td><td>${k.bal.avail + k.bal.held > 0 ? (sel && sel.inmate.id === k.inmate.id ? chip('Selected', 'warn') : `<a class="btn s" href="#/manager/releases?id=${k.inmate.id}">Pay out</a>`) : `<button class="btn s" data-close="${k.inmate.id}">Close ($0)</button>`}</td></tr>`).join('') : '<tr><td colspan="5" class="muted">Nobody waiting.</td></tr>')}</tbody></table>
          <div style="padding:12px 16px;border-top:1px solid #e3e8ef;font-size:14px" class="help">Inmates who owe the jail at release show "owes" above; the Jail Administrator can write off what cannot be collected.</div></div>
        <div class="card span2 pad" style="display:flex;flex-direction:column;gap:14px">
          ${raw(sel ? `<div><div class="lbl">Pay out</div><h2 style="margin-top:4px;font-size:20px">${esc(Store.inmateName(sel.inmate))}</h2><div class="help">${M(sel.bal.avail + sel.bal.held)} on account.${sel.bal.held ? ' ' + M(sel.bal.held) + ' is a check hold.' : ''} Going to ${esc(sel.inmate.releaseTo)}.</div></div>
            <div style="display:flex;flex-direction:column;gap:8px">${methods.map(([v, l, d, en], i) => `<label class="opt ${i === 0 ? 'on' : ''}" ${en ? '' : 'style="opacity:.5"'}><input type="radio" name="pm" value="${v}" ${i === 0 ? 'checked' : ''} ${en ? '' : 'disabled'}><span><strong>${l}${v === 'card' ? ', ' + M(sel.bal.avail) + ' now' : ''}</strong><small>${d}</small></span></label>`).join('')}</div>
            ${sel.bal.held ? `<label class="tog"><input type="checkbox" id="inclHold"><span>Release the ${M(sel.bal.held)} hold early and include it</span></label>` : ''}
            <div class="note info"><strong>Release form</strong> prints with the amount, method, and card or check number. The inmate signs it; you mark it signed below. The account closes at that point.</div>
            <label class="tog"><input type="checkbox" id="signed"><span>Inmate signed the release form</span></label>
            <div class="actions"><button class="btn" data-form>Print release form</button><button class="btn p" id="payout">Pay out and close account</button></div>` : '<div class="help">Pick an inmate from the list to pay out.</div>')}
        </div>
      </div>
      <div class="card"><div class="cardh"><h2>Unclaimed funds</h2><span class="help">Uncashed release checks and closed accounts with leftover balances</span></div>
        <table><thead><tr><th>Who</th><th>What</th><th class="r">Amount</th><th>Age</th><th>Next step</th></tr></thead><tbody>${raw(stale.map((c) => `<tr><td>${esc(c.to)}</td><td>Release check #${c.id} never cashed</td><td class="r">${M(c.amount)}</td><td>${chip(Math.floor((now - new Date(c.at)) / Store.DAY) + ' days', 'warn')}</td><td><a href="#" data-letter="${c.id}">Send letter to last address</a> <span class="muted">|</span> <a href="#" data-unclaimed="${c.id}">Add to unclaimed property filing</a></td></tr>`).join('') + closedWithBal.map((x) => `<tr><td>${esc(Store.inmateName(x))}</td><td>Closed with balance</td><td class="r">${M(Store.balance(x.id).avail)}</td><td>${Math.floor((now - new Date(x.closedAt || x.releasedAt)) / Store.DAY)} days</td><td><a href="#/officer/inmate?id=${x.id}">Open account</a></td></tr>`).join('') || '<tr><td colspan="5" class="muted">Nothing unclaimed.</td></tr>')}</tbody></table></div>
      <div class="card"><div class="cardh"><h2>Release history</h2></div><table><thead><tr><th>When</th><th>Inmate</th><th>Method</th><th class="r">Amount</th><th>Form</th><th>By</th></tr></thead><tbody>${raw(hist.map((t) => `<tr><td>${Store.fmtWhen(t.at)}</td><td>${esc(Store.inmateName(Store.inmate(t.inmateId)))}</td><td>${esc(t.method)}${t.checkNo ? ' #' + t.checkNo : ''}</td><td class="r">${M(t.amount)}</td><td>${t.formSigned ? chip('Signed', 'ok') : chip('Not signed', 'warn')}</td><td>${esc(t.by)}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">No payouts yet.</td></tr>')}</tbody></table></div>`);
    $$('.opt input[name=pm]').forEach((r) => (r.onchange = () => $$('.opt').forEach((o) => o.classList.toggle('on', $('input', o).checked))));
    const po = $('#payout'); if (po) po.onclick = () => { const m = $('input[name=pm]:checked').value; const signed = $('#signed').checked; const ih = $('#inclHold') && $('#inclHold').checked; const go = () => { const t = Store.payOut({ inmateId: sel.inmate.id, method: m, signed, includeHold: ih }); toast(M(t.amount) + ' paid out by ' + m + (signed ? '; account closed' : '; mark the form signed to close')); location.hash = '#/manager/releases'; render(); }; if (!signed) confirmDlg('Pay out without a signed form?', 'The payout posts now and the account stays open until you mark the form signed. Auditors expect a signed form for every release.', 'Pay out anyway', go, true); else go(); };
    const pf = $('[data-form]'); if (pf) pf.onclick = () => { const w = modal(h`<h2>Release of funds</h2><pre class="receipt">${f.name.toUpperCase()}\nRELEASE OF INMATE FUNDS\n\nInmate: ${Store.inmateName(sel.inmate)}\nBooking: ${sel.inmate.booking}\nReleased: ${Store.fmtDate(sel.inmate.releasedAt)} to ${sel.inmate.releaseTo}\n\nAmount: ${M(sel.bal.avail + (($('#inclHold') && $('#inclHold').checked) ? sel.bal.held : 0))}\nMethod: ${$('input[name=pm]:checked').value}\n\nI acknowledge receipt of the amount above in full.\n\nInmate signature: ______________________\nStaff: ${ses().user}   Date: ${Store.fmtDate(now.toISOString())}</pre><div class="actions"><button class="btn" data-x>Close</button><button class="btn p" onclick="window.print()">Print</button></div>`, { width: 480 }); $('[data-x]', w).onclick = close; };
    $$('[data-close]').forEach((b) => (b.onclick = () => { Store.markSigned(b.dataset.close); toast('Account closed'); render(); }));
    $$('[data-letter]').forEach((a) => (a.onclick = (e) => { e.preventDefault(); Store.log('unclaimed letter sent', 'check #' + a.dataset.letter); Store.save(); toast('Letter logged for check #' + a.dataset.letter); }));
    $$('[data-unclaimed]').forEach((a) => (a.onclick = (e) => { e.preventDefault(); const c = Store.S.checks.find((k) => k.id == a.dataset.unclaimed); c.unclaimed = true; c.cashed = true; Store.log('added to unclaimed property filing', 'check #' + c.id + ' ' + M(c.amount)); Store.save(); toast('Added to the unclaimed property filing'); render(); }));
  });

  // ---------- orders ----------
  route('/manager/orders', (q) => {
    const f = Store.fac(fid()); const carts = Store.S.carts.filter((c) => c.facilityId === fid()); const tab = q.t || 'decide';
    const dec = carts.filter((c) => c.status === 'decision'), ready = carts.filter((c) => c.status === 'ready'), posted = carts.filter((c) => c.status === 'posted').sort((a, b) => a.postedAt < b.postedAt ? 1 : -1), rejected = carts.filter((c) => c.status === 'rejected');
    const due = Store.transferDueFor(fid()); const lastT = Store.S.transfers.filter((t) => t.facilityId === fid()).sort((a, b) => a.at < b.at ? 1 : -1)[0];
    const sales = Store.facilityTx(fid()).filter((t) => t.type === 'purchase' && !t.voided && (!lastT || t.at > lastT.at)).reduce((s, t) => s + t.amount, 0);
    const refunds = Store.facilityTx(fid()).filter((t) => t.type === 'refund' && (!lastT || t.at > lastT.at)).reduce((s, t) => s + t.amount, 0);
    const st = Store.settingsFor(fid()); const needsApproval = st.approvals.transfer && ses().role === 'manager';
    const pendingT = Store.S.approvals.find((a) => a.facilityId === fid() && a.kind === 'transfer' && a.status === 'pending');
    const recentBuys = Store.facilityTx(fid()).filter((t) => t.type === 'purchase' && !t.voided).sort((a, b) => a.at < b.at ? 1 : -1).slice(0, 5);
    const cartRow = (c) => { const x = Store.inmate(c.inmateId); const b = Store.balance(x.id); return `<tr><td><a href="#/officer/inmate?id=${x.id}"><strong>${esc(Store.inmateName(x))}</strong></a><br><span class="help">${esc(x.housing)}, available ${M(b.avail)}</span></td><td>${c.items} items</td><td>${c.status === 'decision' ? `${chip(c.reason, c.reason === 'Restricted item' ? 'bad' : 'warn')} ${esc(c.detail)}` : c.decision ? chip(c.decision, 'off') + ' by ' + esc(c.decidedBy || '') : c.status === 'posted' ? 'Posted ' + Store.fmtWhen(c.postedAt) : b.avail < c.total ? chip('Short ' + M(c.total - b.avail), 'warn') + ' will post up to balance' : chip('Ready', 'ok')}</td><td class="r">${M(c.total)}</td><td style="white-space:nowrap">${c.status === 'decision' ? (c.reason === 'Restricted item' ? `<button class="btn s" data-dec="remove" data-c="${c.id}">Remove item and post</button> <button class="btn s" data-dec="reject" data-c="${c.id}">Reject</button>` : `<button class="btn s" data-dec="allow" data-c="${c.id}">Allow once</button> <button class="btn s" data-dec="trim" data-c="${c.id}">Trim to limit</button> <button class="btn s" data-dec="reject" data-c="${c.id}">Reject</button>`) : c.status === 'ready' ? `<button class="btn s" data-dec="reject" data-c="${c.id}">Hold back</button>` : ''}</td></tr>`; };
    const list = tab === 'decide' ? dec : tab === 'ready' ? ready : tab === 'posted' ? posted : rejected;
    shell(h`
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:16px;align-items:flex-end"><div><h1>Commissary orders</h1><div class="sub">Warehouse cutoff today ${f.cutoff}. Carts post automatically unless they need a decision.</div></div><button class="btn p" data-post ${ready.length ? '' : 'disabled'}>Post ${ready.length} ready cart${ready.length === 1 ? '' : 's'} to warehouse</button></div>
      <div class="card"><div class="tabs"><a class="tab ${tab === 'decide' ? 'on' : ''}" href="#/manager/orders?t=decide">Needs a decision ${raw(chip(dec.length, dec.length ? 'warn' : 'off'))}</a><a class="tab ${tab === 'ready' ? 'on' : ''}" href="#/manager/orders?t=ready">Ready to post ${raw(chip(ready.length, 'ok'))}</a><a class="tab ${tab === 'posted' ? 'on' : ''}" href="#/manager/orders?t=posted">Posted</a><a class="tab ${tab === 'rejected' ? 'on' : ''}" href="#/manager/orders?t=rejected">Rejected and held</a></div>
        <table><thead><tr><th>Inmate</th><th>Cart</th><th>${tab === 'decide' ? 'Why it stopped' : 'Status'}</th><th class="r">Total</th><th></th></tr></thead><tbody>${raw(list.length ? list.map(cartRow).join('') : `<tr><td colspan="5" class="muted">${tab === 'decide' ? 'Nothing needs a decision.' : 'Nothing here.'}</td></tr>`)}</tbody></table>
        <div class="help" style="padding:12px 16px">Every decision is recorded with your name and the reason, and shows on the inmate's account and the audit log.</div></div>
      <div class="grid g2">
        <div class="card pad" style="display:flex;flex-direction:column;gap:12px"><div style="display:flex;justify-content:space-between;align-items:center"><h2>Transfer to the Sheriff's Commissary Account</h2>${raw(due > 0 ? chip(M(due) + ' due', 'warn') : chip('Up to date', 'ok'))}</div>
          <div class="help">Inmate purchases are paid from the trust fund to the commissary account. Auditors look for this to be done on schedule and backed by a sales report. Last transfer ${lastT ? Store.fmtDate(lastT.at) + ' for ' + M(lastT.amount) : 'none'}.</div>
          <table><tbody><tr><td>Commissary sales since last transfer</td><td class="r">${M(sales)}</td></tr><tr><td>Returns and refunds in the period</td><td class="r">- ${M(refunds)}</td></tr><tr style="font-weight:700"><td>Transfer amount</td><td class="r">${M(due)}</td></tr></tbody></table>
          ${raw(pendingT ? '<div class="note warn">Sent to the Jail Administrator for approval on ' + Store.fmtWhen(pendingT.at) + '.</div>' : '')}
          <div class="actions"><button class="btn" data-sales>Print sales report</button><button class="btn p" data-transfer ${due > 0 && !pendingT ? '' : 'disabled'}>${needsApproval ? 'Send for approval' : 'Record transfer'}</button></div></div>
        <div class="card pad" style="display:flex;flex-direction:column;gap:12px"><h2>Returns and refunds</h2><div class="help">A refund puts the money back on the inmate's account and prints a credit receipt. Officers can only report the problem; refunds are a Manager action. Recent orders:</div>
          <table><tbody>${raw(recentBuys.map((t) => `<tr><td>${esc(Store.inmateName(Store.inmate(t.inmateId)))}<br><span class="help">Order #${t.orderNo}, ${Store.fmtDate(t.at)}</span></td><td class="r">${M(t.amount)}</td><td class="r"><button class="btn s" data-refund="${t.id}">Refund</button></td></tr>`).join('') || '<tr><td class="muted">No orders yet.</td></tr>')}</tbody></table></div>
      </div>`);
    $$('[data-dec]').forEach((b) => (b.onclick = () => { Store.decideCart(b.dataset.c, b.dataset.dec); toast('Recorded: ' + b.dataset.dec); render(); }));
    $('[data-post]').onclick = () => { const n = Store.postCarts(fid()); toast(n + ' carts posted to ' + f.warehouse); render(); };
    $('[data-transfer]').onclick = () => { if (needsApproval) { Store.addApproval({ kind: 'transfer', title: 'Commissary transfer ' + M(due), detail: 'Trust fund to Sheriff\'s Commissary Account for sales since ' + (lastT ? Store.fmtDate(lastT.at) : 'start') + '. Sales report attached.' }); Store.log('transfer sent for approval', M(due)); Store.save(); toast('Sent to the Jail Administrator for approval'); } else { Store.recordTransfer(fid()); toast('Transfer of ' + M(due) + ' recorded'); } render(); };
    $('[data-sales]').onclick = () => { const rows = Store.facilityTx(fid()).filter((t) => t.type === 'purchase' && !t.voided && (!lastT || t.at > lastT.at)).sort((a, b) => a.at < b.at ? 1 : -1); const w = modal(h`<h2>Commissary sales since ${lastT ? Store.fmtDate(lastT.at) : 'start'}</h2><div class="tbl"><table><thead><tr><th>Date</th><th>Inmate</th><th>Order</th><th class="r">Amount</th></tr></thead><tbody>${raw(rows.map((t) => `<tr><td>${Store.fmtDate(t.at)}</td><td>${esc(Store.inmateName(Store.inmate(t.inmateId)))}</td><td>#${t.orderNo}</td><td class="r">${M(t.amount)}</td></tr>`).join(''))}<tr style="font-weight:700"><td colspan="3">Total</td><td class="r">${M(sales)}</td></tr></tbody></table></div><div class="actions"><button class="btn" data-x>Close</button><button class="btn p" onclick="window.print()">Print</button></div>`, { width: 700 }); $('[data-x]', w).onclick = close; };
    $$('[data-refund]').forEach((b) => (b.onclick = () => { const t = Store.S.txns.find((k) => k.id === b.dataset.refund); const x = Store.inmate(t.inmateId); const w = modal(h`<h2>Refund on order #${t.orderNo}</h2><div class="help">${Store.inmateName(x)}, ${M(t.amount)} on ${Store.fmtDate(t.at)}.</div><div class="grid g2"><label class="f">Refund amount<input id="ra" type="number" step="0.01" class="big" value="${t.amount}"></label><label class="f">Reason<input id="rr" placeholder="Item not delivered"></label></div><div class="actions"><button class="btn" data-x>Cancel</button><button class="btn p" data-ok>Refund</button></div>`); $('[data-x]', w).onclick = close; $('[data-ok]', w).onclick = () => { const a = parseFloat($('#ra', w).value); if (!(a > 0)) return; Store.refund({ inmateId: x.id, amount: a, note: $('#rr', w).value || 'Refund on order #' + t.orderNo }); close(); toast('Refunded ' + M(a)); render(); }; }));
  });
})();
