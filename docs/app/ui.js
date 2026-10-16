/* Shared UI: router, shell, helpers, modal, toast. */
(function () {
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const h = (strings, ...vals) => strings.reduce((out, s, i) => out + s + (i < vals.length ? (vals[i] && typeof vals[i] === 'object' && '__raw' in vals[i] ? vals[i].__raw : esc(vals[i])) : ''), '');
  const raw = (s) => ({ __raw: s });
  const M = Store.money;

  const chip = (text, kind) => `<span class="chip ${kind || 'off'}">${esc(text)}</span>`;
  const chipFor = (t) => {
    if (t.voided) return chip('Voided', 'off');
    if (t.pendingApproval) return chip('Pending approval', 'warn');
    switch (t.type) {
      case 'deposit': return t.hold && !t.hold.released && new Date(t.hold.until) > Store.now() ? chip((t.tender === 'money order' ? 'Money order' : 'Check') + ', on hold', 'warn') : chip(t.tender === 'card' ? 'Card deposit' : t.tender === 'kiosk' ? 'Kiosk deposit' : t.tender === 'check' ? 'Check deposit' : t.tender === 'money order' ? 'Money order' : 'Cash deposit', 'ok');
      case 'charge': return chip('Charge', 'bad');
      case 'purchase': return chip('Purchase', 'off');
      case 'refund': return chip('Refund', 'ok');
      case 'release': return chip('Release payout', 'off');
      case 'reversal': return chip('Correction', 'warn');
      case 'writeoff': return chip('Write-off', 'off');
      case 'holdrelease': return chip('Hold released', 'ok');
      case 'overshort': return chip('Over/Short', 'bad');
      case 'transfer': return chip('Transfer', 'off');
      default: return chip(t.type, 'off');
    }
  };
  const txLabel = (t) => {
    switch (t.type) {
      case 'deposit': return (t.note || 'Deposit') + (t.checkNo ? ' #' + t.checkNo + (t.payer ? ', ' + t.payer : '') : '') + (t.cardLast4 ? ', card ending ' + t.cardLast4 : '') + (t.fee ? ', fee ' + M(t.fee) : '');
      case 'charge': return t.chargeType + (t.note ? ', ' + t.note : '');
      case 'purchase': return 'Commissary order #' + (t.orderNo || '') + (t.items ? ', ' + t.items + ' items' : '');
      default: return t.note || t.type;
    }
  };
  const txAmount = (t) => { const sign = { deposit: 1, refund: 1, holdrelease: 1, charge: -1, purchase: -1, release: -1, reversal: 1, writeoff: 0, overshort: 1, transfer: -1 }[t.type] || 0; const v = sign * t.amount; return `<span style="${v < 0 ? 'color:#9f1d12' : ''}">${M(v)}</span>`; };

  // ---------- modal + toast ----------
  function modal(html, opts) {
    close();
    const wrap = document.createElement('div'); wrap.className = 'modal-wrap'; wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true" style="max-width:${(opts && opts.width) || 640}px">${html}</div>`;
    wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
    document.body.appendChild(wrap); document.body.classList.add('has-modal');
    const first = wrap.querySelector('input,select,textarea,button'); if (first) first.focus();
    return wrap;
  }
  function close() { const w = $('.modal-wrap'); if (w) w.remove(); document.body.classList.remove('has-modal'); }
  function toast(msg, kind) { let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); } t.textContent = msg; t.className = 'toast show ' + (kind || 'ok'); clearTimeout(t._h); t._h = setTimeout(() => (t.className = 'toast'), 3200); }
  function confirmDlg(title, body, okLabel, onOk, danger) { const w = modal(h`<h2>${title}</h2><div class="help" style="font-size:15px;color:#1b2538">${raw(body)}</div><div class="actions"><button class="btn" data-x>Cancel</button><button class="btn ${danger ? 'd' : 'p'}" data-ok>${okLabel}</button></div>`); $('[data-x]', w).onclick = close; $('[data-ok]', w).onclick = () => { close(); onOk(); }; }

  // ---------- receipt ----------
  function receiptHtml(t, x) { const f = Store.fac(t.facilityId); return `<pre class="receipt">${esc(f.name.toUpperCase())}
Receipt #${t.receipt || 'n/a'}
${Store.fmtDate(t.at)} ${Store.fmtTime(t.at)}
Inmate: ${esc(Store.inmateName(x))}
Booking: ${esc(x.booking)}
${esc(txLabel(t))}
Amount: ${M(t.amount)}${t.hold && !t.hold.released ? '\nON HOLD until ' + Store.fmtDate(t.hold.until) : ''}
By: ${esc(t.by)}
${t.type === 'deposit' || t.type === 'refund' ? 'Balance after: ' + M(Store.balance(x.id).avail) : ''}</pre>`; }
  function showReceipt(t) { const x = Store.inmate(t.inmateId); const w = modal(h`<h2>Receipt #${t.receipt}</h2>${raw(receiptHtml(t, x))}<div class="actions"><button class="btn" data-x>Close</button><button class="btn p" onclick="window.print()">Print</button></div>`, { width: 420 }); $('[data-x]', w).onclick = close; }

  // ---------- shell ----------
  const ROLE_LABEL = { officer: 'Detention Officer', manager: 'Commissary Manager', admin: 'Jail Administrator', auditor: 'Auditor', prodigy: 'Prodigy Support', accounting: 'Prodigy Accounting' };
  const NAV = {
    officer: [['#/officer/home', 'Home'], ['#/officer/find', 'Find inmate'], ['#/officer/new', 'New inmate'], ['#/officer/deposit', 'Deposit'], ['#/officer/bill', 'Bill inmate'], ['#/officer/receipts', 'My receipts today']],
    manager: [['#/manager/today', 'Today'], ['#/officer/find', 'Inmates'], ['#/manager/drawer', 'Drawer'], ['#/manager/bank', 'Bank deposits'], ['#/manager/releases', 'Releases'], ['#/manager/orders', 'Orders'], ['#/manager/reconcile', 'Reconcile'], ['#/auditor/reports', 'Reports']],
    admin: [['#/admin/overview', 'Overview'], ['_', 'Operate'], ['#/officer/find', 'Inmates'], ['#/manager/today', 'Daily close-out'], ['#/manager/releases', 'Releases'], ['#/manager/orders', 'Orders'], ['#/manager/reconcile', 'Reconcile'], ['#/auditor/reports', 'Reports'], ['_', 'Manage'], ['#/admin/settings', 'Facility settings'], ['#/admin/users', 'Users and access'], ['#/admin/log', 'Activity log']],
    auditor: [['#/auditor/reports', 'Reports'], ['#/auditor/ledger', 'Ledger'], ['#/officer/find', 'Inmate accounts'], ['#/auditor/runs', 'My report history']],
    prodigy: [['#/prodigy/home', 'All facilities'], ['#/prodigy/support', 'Support queue'], ['_', 'Operate'], ['#/officer/find', 'Residents'], ['#/manager/orders', 'Orders and batches'], ['#/prodigy/finances', 'Finances'], ['#/auditor/reports', 'Reports'], ['_', 'Setup'], ['#/prodigy/facility', 'Facilities'], ['#/admin/settings', 'Jail settings'], ['#/admin/users', 'Users and access'], ['#/admin/log', 'Activity log']],
  };
  NAV.accounting = NAV.prodigy;

  function shell(contentHtml, opts) {
    const s = Store.S.session; const role = s.role; const f = Store.fac(s.facilityId);
    const isProdigy = role === 'prodigy' || role === 'accounting';
    const nav = NAV[role].map(([href, label]) => href === '_' ? `<div class="navh">${label}</div>` : `<a href="${href}" class="${location.hash.startsWith(href) ? 'on' : ''}">${label}</a>`).join('');
    const facSel = isProdigy ? `<label class="hdr-lbl">Facility <select id="facSel">${Store.S.facilities.map((k) => `<option value="${k.id}" ${k.id === s.facilityId ? 'selected' : ''}>${esc(k.name)}</option>`).join('')}</select></label>` : `<div class="hdr-fac">${esc(f.name)}</div>`;
    const viewAs = s.viewAs ? `<div class="viewas-bar">Viewing <strong>${esc(f.name)}</strong> as <strong>${ROLE_LABEL[role]}</strong> (${esc(s.user)}). Your actions are logged as Prodigy. <a href="#/prodigy/facility" data-exit-viewas>Back to Prodigy</a></div>` : '';
    document.body.innerHTML = `
<div class="app">
  <nav class="nav">
    <div class="brand"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#5aa9ff" stroke-width="2" aria-hidden="true"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 12l9 4 9-4"/><path d="M3 17l9 4 9-4"/></svg>${isProdigy ? 'Prodigy Admin' : 'Commissary'}</div>
    <div class="brand-sub">${isProdigy ? 'All facilities' : esc(f.name)}${role === 'auditor' ? '<br>Read only' : ''}</div>
    ${nav}
    <div style="flex:1"></div>
    <div class="who">${esc(s.user)}<br><span>${ROLE_LABEL[role]}</span></div>
    <a href="#/switch" class="small">Switch role</a>
  </nav>
  <main class="main">
    ${viewAs}
    <header class="hdr">
      <input type="search" id="gsearch" placeholder="${isProdigy ? 'Search residents, facilities, orders' : 'Find an inmate by name, booking, or account number'}" aria-label="Search">
      ${facSel}
      <div style="flex:1"></div>
      ${role === 'auditor' ? chip('Read only', 'teal') : `<span class="help">${Store.fmtDate(Store.now().toISOString())}</span>`}
    </header>
    <div class="content">${contentHtml}</div>
    <footer class="foot"><span>Working mockup. Data lives in this browser only.</span><a href="#" data-reset>Reset sample data</a><a href="https://github.com/wynnchance/Prodigy-Commissary">Source</a></footer>
  </main>
</div>`;
    $('#gsearch').addEventListener('keydown', (e) => { if (e.key === 'Enter') { location.hash = '#/officer/find?q=' + encodeURIComponent(e.target.value); } });
    const fs = $('#facSel'); if (fs) fs.onchange = () => { Store.setSession({ facilityId: fs.value }); render(); };
    $('[data-reset]').onclick = (e) => { e.preventDefault(); confirmDlg('Reset sample data?', 'Everything you changed in this browser goes back to the starting data.', 'Reset', () => { Store.reset(); toast('Sample data reset'); render(); }, true); };
    const ev = $('[data-exit-viewas]'); if (ev) ev.onclick = () => { Store.setSession({ role: s.viewAs.role, user: s.viewAs.user, viewAs: null }); };
    window.scrollTo(0, 0);
  }

  // ---------- router ----------
  const routes = {};
  function route(path, fn) { routes[path] = fn; }
  function parse() { const hsh = location.hash || '#/switch'; const [path, qs] = hsh.slice(1).split('?'); const q = {}; (qs || '').split('&').forEach((p) => { if (!p) return; const [k, v] = p.split('='); q[decodeURIComponent(k)] = decodeURIComponent(v || ''); }); return { path, q }; }
  function render() { const { path, q } = parse(); const fn = routes[path] || routes['/switch']; try { fn(q); } catch (e) { console.error(e); document.body.innerHTML = `<div style="padding:40px;font-family:sans-serif"><h2>Something broke on this page</h2><pre>${esc(e.stack)}</pre><a href="#/switch">Back</a></div>`; } }
  window.addEventListener('hashchange', render);
  window.addEventListener('DOMContentLoaded', () => { Store.load(); render(); });

  // ---------- role switch screen ----------
  route('/switch', () => {
    const s = Store.S;
    const roles = [
      ['officer', 'Detention Officer', 'Book inmates in, take deposits, bill, fix mistakes.', '#/officer/home'],
      ['manager', 'Commissary Manager', 'Close the day, bank deposit, releases, reconcile.', '#/manager/today'],
      ['admin', 'Jail Administrator', 'Approvals, facility settings, users, auditor logins.', '#/admin/overview'],
      ['auditor', 'Auditor', 'Report library and read-only ledger.', '#/auditor/reports'],
      ['prodigy', 'Prodigy Support', 'All facilities, view as jail staff, setup, support queue.', '#/prodigy/home'],
      ['accounting', 'Prodigy Accounting', 'Ledger, commissions, bank accounts across facilities.', '#/prodigy/finances'],
    ];
    document.body.innerHTML = `<div class="switch">
      <h1>Prodigy Commissary <span>working mockup</span></h1>
      <p class="help" style="font-size:16px">Pick who you are. The data is shared across roles, so what an officer does shows up for the manager, the auditor, and Prodigy. Change facility to see a different jail.</p>
      <div class="switch-fac"><label>Facility <select id="swFac">${s.facilities.map((f) => `<option value="${f.id}" ${f.id === s.session.facilityId ? 'selected' : ''}>${esc(f.name)}${f.installing ? ' (installing)' : ''}</option>`).join('')}</select></label></div>
      <div class="switch-grid">${roles.map(([id, name, desc, href]) => `<a class="switch-card" href="${href}" data-role="${id}"><strong>${name}</strong><span>${desc}</span></a>`).join('')}</div>
      <p class="help">Things to try: as an Officer, deposit cash for ALLEN, CHRISTOPHER WAYNE, then fix it to the other Allen. As a Manager, count the drawer and build the bank deposit. As the Jail Administrator, approve what's waiting. As the Auditor, run "Daily receipts to deposits" and see today's entries.</p>
      <footer class="foot" style="justify-content:center"><a href="#" data-reset>Reset sample data</a><a href="https://github.com/wynnchance/Prodigy-Commissary">Source</a><a href="index.html">Static screens</a></footer>
    </div>`;
    $$('.switch-card').forEach((a) => a.addEventListener('click', () => { const role = a.dataset.role; const fid = $('#swFac').value; const user = role === 'prodigy' ? 'Chance Wynn' : role === 'accounting' ? 'A. Reyes' : role === 'auditor' ? (s.staff.find((u) => u.role === 'auditor' && u.facilityId === fid) || { name: 'Kelly Marsh' }).name : Store.staffName(fid, role); Store.setSession({ role, facilityId: fid, user, viewAs: null }); }));
    $('[data-reset]').onclick = (e) => { e.preventDefault(); Store.reset(); toast('Sample data reset'); render(); };
  });

  function requireRole(roles) { const r = Store.S.session.role; if (!roles.includes(r) && r !== 'prodigy' && r !== 'accounting' && r !== 'admin') return false; return true; }
  function readOnly() { return Store.S.session.role === 'auditor'; }

  window.UI = { $, $$, esc, h, raw, M, chip, chipFor, txLabel, txAmount, modal, close, toast, confirmDlg, receiptHtml, showReceipt, shell, route, render, parse, requireRole, readOnly, ROLE_LABEL };
})();
