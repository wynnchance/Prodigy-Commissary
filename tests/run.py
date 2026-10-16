"""End-to-end checks for the working mockup. Run: python3 tests/run.py [officer|manager|auditor|admin|prodigy|all]"""
import sys, re, json
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:8787/app.html'
errors = []

def go(pg, hash_):
    pg.goto(BASE + hash_); pg.wait_for_timeout(250)

def check(cond, msg):
    print(('  ok   ' if cond else '  FAIL ') + msg)
    if not cond: errors.append(msg)

def bal(pg, name):
    return pg.evaluate("n => { const x = Store.S.inmates.find(i => Store.inmateName(i)===n); return Store.balance(x.id); }", name)

def officer(pg):
    print('OFFICER')
    go(pg, '#/switch'); pg.evaluate("Store.reset()"); go(pg, '#/switch')
    pg.click('[data-role=officer]'); pg.wait_for_timeout(300)
    check('Find an inmate' in pg.inner_text('h1'), 'home loads')
    pg.fill('#findQ', 'allen'); pg.press('#findQ', 'Enter'); pg.wait_for_timeout(300)
    check(pg.locator('tbody tr').count() >= 2, 'search finds both Allens')
    b0 = bal(pg, 'ALLEN, CHRISTOPHER WAYNE')
    go(pg, '#/officer/find?q=0000042262'); pg.click('tbody tr a.btn'); pg.wait_for_timeout(300)
    check('ALLEN, CHRISTOPHER WAYNE' in pg.inner_text('h1'), 'inmate page opens')
    # cash deposit
    pg.click('a.btn.p[href*="deposit?id"]'); pg.wait_for_timeout(300)
    pg.fill('#amt', '20'); pg.click('text=Post deposit and print receipt'); pg.wait_for_timeout(400)
    b1 = bal(pg, 'ALLEN, CHRISTOPHER WAYNE'); check(abs(b1['avail'] - (b0['avail'] + 20)) < 0.01, f'cash deposit raises available {b0["avail"]} -> {b1["avail"]}')
    check(pg.locator('.modal').count() == 1 and 'Receipt' in pg.inner_text('.modal'), 'receipt modal shows')
    pg.click('.modal >> text=Close'); pg.wait_for_timeout(200)
    # check deposit with hold
    xid = pg.evaluate("Store.S.inmates.find(i=>Store.inmateName(i)==='ALLEN, CHRISTOPHER WAYNE').id")
    go(pg, f'#/officer/deposit?id={xid}&tender=check')
    pg.fill('#amt', '75'); pg.fill('#cno', '555'); pg.fill('#payer', 'Walmart'); pg.fill('#hold', '2027-01-15'); pg.click('text=Post deposit and print receipt'); pg.wait_for_timeout(400)
    b2 = bal(pg, 'ALLEN, CHRISTOPHER WAYNE'); check(abs(b2['held'] - (b1['held'] + 75)) < 0.01, 'check with hold goes to held')
    pg.click('.modal >> text=Close')
    # bill
    go(pg, f'#/officer/inmate?id={xid}&bill=1'); pg.wait_for_timeout(300)
    check(pg.locator('.modal').count() == 1, 'bill dialog opens')
    pg.select_option('#ct', 'Medical visit'); pg.wait_for_timeout(100)
    check(pg.input_value('#camt') == '8', 'medical default $8 fills')
    pg.click('text=Post charge and print receipt'); pg.wait_for_timeout(400)
    b3 = bal(pg, 'ALLEN, CHRISTOPHER WAYNE'); check(abs(b3['avail'] - (b2['avail'] - 8)) < 0.01, 'charge lowers available by 8')
    pg.click('.modal >> text=Close')
    # fix: move the $20 deposit to the other Allen
    tid = pg.evaluate("Store.S.txns.filter(t=>t.type==='deposit'&&t.amount===20&&!t.voided).slice(-1)[0].id")
    go(pg, f'#/officer/inmate?id={xid}&fix={tid}'); pg.wait_for_timeout(300)
    check(pg.locator('.modal').count() == 1, 'fix dialog opens')
    other = pg.evaluate("Store.S.inmates.find(i=>Store.inmateName(i)==='ALLEN, CHRISTOPHER M').id")
    ob0 = bal(pg, 'ALLEN, CHRISTOPHER M')
    pg.select_option('#toInm', other); pg.fill('#why', 'Picked the wrong Allen at booking'); pg.click('text=Post fix and print receipts'); pg.wait_for_timeout(400)
    b4 = bal(pg, 'ALLEN, CHRISTOPHER WAYNE'); ob1 = bal(pg, 'ALLEN, CHRISTOPHER M')
    check(abs(b4['avail'] - (b3['avail'] - 20)) < 0.01, 'move: source drops 20')
    check(abs(ob1['avail'] - (ob0['avail'] + 20)) < 0.01, 'move: target gains 20')
    n = pg.evaluate("Store.S.txns.filter(t=>t.type==='reversal').length"); check(n >= 1, 'reversal entry created')
    # fix a charge: void
    cid = pg.evaluate("Store.S.txns.filter(t=>t.type==='charge'&&!t.voided).slice(-1)[0].id")
    go(pg, f'#/officer/inmate?id={xid}&fix={cid}'); pg.wait_for_timeout(300)
    pg.check('input[name=fx][value=void]'); pg.fill('#why', 'wrong inmate billed'); pg.click('text=Post fix and print receipts'); pg.wait_for_timeout(400)
    b5 = bal(pg, 'ALLEN, CHRISTOPHER WAYNE'); check(abs(b5['avail'] - (b4['avail'] + 8)) < 0.01, 'void charge restores 8')
    # new inmate with duplicate warning
    go(pg, '#/officer/new'); pg.fill('#last', 'Holt'); pg.fill('#first', 'Samantha'); pg.fill('#dob', '1990-04-02'); pg.wait_for_timeout(200)
    check('Possible match' in pg.inner_text('#dup'), 'duplicate warning appears')
    pg.fill('#last', 'Zzyzx'); pg.fill('#first', 'Test'); pg.wait_for_timeout(100)
    check(pg.inner_text('#dup').strip() == '', 'warning clears for a new name')
    pg.click('text=Create and deposit now'); pg.wait_for_timeout(400)
    check('Deposit for ZZYZX' in pg.inner_text('h1'), 'create and deposit lands on deposit page')
    # receipts page
    go(pg, '#/officer/receipts'); check(pg.locator('tbody tr').count() >= 4, 'receipts page lists today\'s receipts')
    # note
    go(pg, f'#/officer/inmate?id={xid}'); pg.click('[data-note]'); pg.fill('#nt', 'Test note'); pg.click('text=Save note'); pg.wait_for_timeout(300)
    check('Test note' in pg.inner_text('body'), 'note saved')

def manager(pg):
    print('MANAGER')
    go(pg, '#/switch'); pg.evaluate("Store.reset()"); go(pg, '#/switch'); pg.click('[data-role=manager]'); pg.wait_for_timeout(300)
    check('Today' in pg.inner_text('h1') or 'close-out' in pg.inner_text('body').lower(), 'today page loads')
    exp = pg.evaluate("Store.drawerExpected('atoka')")
    go(pg, '#/manager/drawer'); pg.wait_for_timeout(200)
    pg.fill('[data-den="20"]', '2'); pg.fill('[data-den="5"]', '1'); pg.fill('[data-den="1"]', '3'); pg.wait_for_timeout(100)
    check('Short' in pg.inner_text('#match') or 'Over' in pg.inner_text('#match') or 'match' in pg.inner_text('#match').lower(), 'count compares to expected')
    pg.fill('#dnote', 'test'); pg.select_option('#verify', index=1); pg.click('text=Record count and continue'); pg.wait_for_timeout(400)
    check(pg.evaluate("Store.todayDrawer('atoka')") is not None, 'drawer count recorded')
    check('Bank deposit' in pg.inner_text('h1'), 'continues to bank deposit')
    n = pg.evaluate("Store.undeposited('atoka').length"); check(n >= 2, f'{n} undeposited receipts listed')
    pg.click('text=Mark as deposited'); pg.wait_for_timeout(400)
    check(pg.evaluate("Store.undeposited('atoka').length") == 0, 'all receipts marked deposited')
    go(pg, '#/manager/releases'); pg.wait_for_timeout(200)
    check(pg.locator('tbody tr').count() >= 3, 'release queue lists released inmates')
    gid = pg.evaluate("Store.S.inmates.find(i=>i.last==='GARZA').id")
    go(pg, f'#/manager/releases?id={gid}'); pg.wait_for_timeout(200)
    pg.check('#signed'); pg.check('#inclHold'); pg.click('text=Pay out and close account'); pg.wait_for_timeout(400)
    check(pg.evaluate(f"Store.inmate('{gid}').status") == 'closed', 'release payout closes the account')
    check(bal(pg, 'GARZA, MARIA E')['avail'] == 0, 'balance zero after payout')
    go(pg, '#/manager/orders'); pg.wait_for_timeout(200)
    d = pg.evaluate("Store.S.carts.filter(c=>c.facilityId==='atoka'&&c.status==='decision').length")
    if d: pg.click('[data-dec]:first-of-type'); pg.wait_for_timeout(300)
    r = pg.evaluate("Store.S.carts.filter(c=>c.facilityId==='atoka'&&c.status==='ready').length")
    pg.click('[data-post]'); pg.wait_for_timeout(400)
    check(pg.evaluate("Store.S.carts.filter(c=>c.facilityId==='atoka'&&c.status==='posted').length") == r, f'posted {r} ready carts')
    due = pg.evaluate("Store.transferDueFor('atoka')"); check(due > 0, f'transfer due {due}')
    m = pg.evaluate("Store.monthKey(new Date(new Date().getFullYear(), new Date().getMonth()-3, 1).toISOString())")
    go(pg, '#/manager/reconcile?m=' + m); pg.wait_for_timeout(300)
    check('difference' in pg.inner_text('#diffBox').lower(), 'reconciliation computes')
    check('agree' in pg.inner_text('#diffMsg'), 'books and bank agree by default')
    n0 = pg.evaluate("Store.S.reconciliations.filter(r=>r.facilityId==='atoka').length")
    pg.click('#sign'); pg.wait_for_timeout(300)
    check(pg.evaluate("Store.S.reconciliations.filter(r=>r.facilityId==='atoka').length") == n0 + 1, 'reconciliation signed')

def auditor(pg):
    print('AUDITOR')
    go(pg, '#/switch'); pg.click('[data-role=auditor]'); pg.wait_for_timeout(300)
    check('Reports' in pg.inner_text('h1'), 'library loads')
    pg.click('text=Daily receipts to deposits >> nth=0'); pg.wait_for_timeout(400)
    check(pg.locator('tbody tr').count() >= 5, 'receipts-to-deposits has rows')
    xid = pg.evaluate("Store.S.inmates.find(i=>i.facilityId==='atoka').id")
    for name in ['receipt-register', 'balances', 'releases', 'adjustments', 'disbursements', 'reconciliation', 'checks', 'charges', 'transfers', 'whodid', 'access', 'bank-deposits', 'drawer', 'commission', 'history&id=' + xid]:
        go(pg, f'#/auditor/report?r={name}'); pg.wait_for_timeout(200)
        check(pg.locator('table').count() >= 1 and 'broke' not in pg.inner_text('body'), f'report {name} renders')
    go(pg, '#/auditor/ledger'); check(pg.locator('tbody tr').count() >= 5, 'ledger renders')
    go(pg, '#/auditor/runs'); check(pg.locator('tbody tr').count() >= 5, 'report history logged')
    go(pg, '#/officer/inmate?id=' + pg.evaluate("Store.S.inmates[0].id")); check(pg.locator('text=Post deposit').count() == 0 and pg.locator('a.btn.p').count() == 0, 'auditor sees no money actions')

def admin(pg):
    print('ADMIN')
    go(pg, '#/switch'); pg.evaluate("Store.reset()"); go(pg, '#/switch'); pg.click('[data-role=admin]'); pg.wait_for_timeout(300)
    check(pg.locator('[data-ap]').count() >= 3, 'approvals waiting')
    n0 = pg.evaluate("Store.S.txns.filter(t=>t.type==='transfer').length")
    pg.click('[data-ap][data-kind=transfer][data-ok]'); pg.wait_for_timeout(300)
    check(pg.evaluate("Store.S.txns.filter(t=>t.type==='transfer').length") == n0 + 1, 'approving transfer records it')
    pg.click('[data-ap][data-kind=writeoff][data-ok]'); pg.wait_for_timeout(300)
    check(pg.evaluate("Store.S.approvals.filter(a=>a.status==='pending').length") == 1, 'two approvals done')
    go(pg, '#/admin/settings'); pg.wait_for_timeout(200)
    pg.click('#addCt'); pg.fill('#ctName', 'Haircut'); pg.fill('#ctAmt', '5'); pg.click('.modal [data-ok]'); pg.wait_for_timeout(300)
    check(pg.evaluate("Store.S.settings.atoka.chargeTypes.some(c=>c.name==='Haircut')"), 'charge type added')
    go(pg, '#/admin/settings?s=approvals'); pg.wait_for_timeout(200)
    pg.check('#apDepositOver'); pg.fill('#apDepositAmt', '50'); pg.click('[data-save=approvals]'); pg.wait_for_timeout(300)
    check(pg.evaluate("Store.S.settings.atoka.approvals.depositOver.on"), 'approval toggle saved')
    # officer deposit over 50 now needs approval
    pg.evaluate("Store.setSession({role:'officer', user:'Ofc. J. Ramirez'})")
    xid = pg.evaluate("Store.S.inmates.find(i=>i.last==='ALEXANDER').id")
    pg.evaluate(f"Store.deposit({{inmateId:'{xid}', tender:'cash', amount:60}})")
    check(pg.evaluate("Store.S.approvals.filter(a=>a.status==='pending'&&a.kind==='deposit').length") == 1, 'officer deposit over threshold queued')
    pg.evaluate("Store.setSession({role:'admin', user:'Capt. R. Hale'})")
    go(pg, '#/admin/overview'); pg.click('[data-ap][data-kind=deposit][data-ok]'); pg.wait_for_timeout(300)
    check(pg.evaluate("Store.S.txns.filter(t=>t.pendingApproval).length") == 0, 'deposit approved and available')
    go(pg, '#/admin/users'); pg.click('#addAud'); pg.fill('#auName', 'Test Auditor'); pg.fill('#auEmail', 't@x.gov'); pg.click('.modal [data-ok]'); pg.wait_for_timeout(300)
    check(pg.evaluate("Store.S.staff.some(s=>s.name==='Test Auditor')"), 'auditor login created')
    go(pg, '#/admin/log'); check(pg.locator('tbody tr').count() >= 5, 'activity log populated')

def prodigy(pg):
    print('PRODIGY')
    go(pg, '#/switch'); pg.evaluate("Store.reset()"); go(pg, '#/switch'); pg.click('[data-role=prodigy]'); pg.wait_for_timeout(300)
    check(pg.locator('tbody tr').count() >= 6, 'fleet table lists facilities')
    go(pg, '#/prodigy/support'); pg.wait_for_timeout(200)
    pg.click('[data-sup="S-2"]'); pg.wait_for_timeout(300)
    check(pg.evaluate("Store.fac('douglas').jmsStatus") == 'ok', 'retry JMS fixes feed')
    go(pg, '#/prodigy/support?t=requests'); pg.wait_for_timeout(200)
    pg.click('[data-sup="S-4"]'); pg.wait_for_timeout(300)
    check(pg.evaluate("Store.fac('atoka').cardProcessor") == True, 'connect processor works')
    go(pg, '#/prodigy/facility'); pg.wait_for_timeout(200)
    pg.click('[data-viewas=officer]'); pg.wait_for_timeout(300)
    check(pg.evaluate("Store.S.session.role") == 'officer' and pg.evaluate("!!Store.S.session.viewAs"), 'view as officer switches role')
    check('Viewing' in pg.inner_text('.viewas-bar'), 'view-as bar shown')
    pg.click('[data-exit-viewas]'); pg.wait_for_timeout(300)
    check(pg.evaluate("Store.S.session.role") == 'prodigy', 'exit view-as returns to Prodigy')
    go(pg, '#/prodigy/finances'); check(pg.locator('tbody tr').count() >= 5, 'finances ledger renders')
    pg.select_option('#facSel', 'cinci'); pg.wait_for_timeout(300)
    check(pg.evaluate("Store.S.session.facilityId") == 'cinci', 'facility selector switches')

with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1440, 'height': 900})
    pg.on('pageerror', lambda e: errors.append('JS error: ' + str(e)))
    pg.on('console', lambda m: print('  console:', m.text) if m.type == 'error' else None)
    which = sys.argv[1] if len(sys.argv) > 1 else 'all'
    go(pg, '#/switch')
    for name, fn in [('officer', officer), ('manager', manager), ('auditor', auditor), ('admin', admin), ('prodigy', prodigy)]:
        if which in ('all', name):
            try: fn(pg)
            except Exception as e: errors.append(f'{name} crashed: {e}'); print('  CRASH', e)
    b.close()
print('\n' + ('ALL PASSED' if not errors else f'{len(errors)} problem(s):\n  ' + '\n  '.join(errors)))
