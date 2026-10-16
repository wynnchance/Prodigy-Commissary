#!/usr/bin/env python3
"""Convert the design-canvas artboards (.dc.html) into plain static HTML pages.

Usage: python3 build.py <src_dir_with_dc_html> <out_dir>

- Moves <helmet> contents into <head>
- Unwraps <x-dc>
- Drops support.js and the data-dc-script block
- Rewrites links from X.dc.html to X.html
- Resolves simple {{holes}} and <sc-if> blocks for the static pages;
  OfficerDeposit gets a hand-written plain-JS version of its tender switch.
"""
import re, sys, pathlib

src = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)

for f in sorted(src.glob("*.dc.html")):
    html = f.read_text(encoding="utf-8")
    name = f.name.replace(".dc.html", ".html")

    # pull helmet into head
    helmet = re.search(r"<helmet>(.*?)</helmet>", html, re.S)
    helmet_body = helmet.group(1) if helmet else ""
    html = re.sub(r"<helmet>.*?</helmet>", "", html, flags=re.S)
    html = html.replace('<script src="./support.js"></script>', helmet_body.strip())

    # unwrap x-dc
    html = html.replace("<x-dc>", "").replace("</x-dc>", "")

    # drop the logic block
    html = re.sub(r'<script type="text/x-dc"[^>]*>.*?</script>', "", html, flags=re.S)

    # links
    html = re.sub(r'href="([A-Za-z]+)\.dc\.html"', r'href="\1.html"', html)
    html = re.sub(r'action="([A-Za-z]+)\.dc\.html"', r'action="\1.html"', html)

    if f.name == "OfficerDeposit.dc.html":
        # static defaults (check selected) + plain JS to switch tenders
        html = html.replace('class="{{cashCls}}" onClick="{{pickCash}}"', 'class="tender" data-tender="cash"')
        html = html.replace('class="{{checkCls}}" onClick="{{pickCheck}}"', 'class="tender on" data-tender="check"')
        html = html.replace('class="{{cardCls}}" onClick="{{pickCard}}"', 'class="tender" data-tender="card"')
        for key in ("isCash", "isCheck", "isCard"):
            html = re.sub(r'<sc-if value="\{\{%s\}\}"[^>]*>' % key, '<div data-pane="%s">' % key[2:].lower(), html)
        html = html.replace("</sc-if>", "</div>")
        html = html.replace("{{availAfter}}", '<span id="availAfter">$43.00</span>')
        html = html.replace("{{holdAfter}}", '<span id="holdAfter">$50.00</span>')
        html = html.replace("{{afterNote}}", '<span id="afterNote">Held until 10/23/2026. Shows on the account as on hold until then.</span>')
        html = html.replace("{{receiptLine}}", '<span id="receiptLine">Check #2211, on hold to 10/23</span>')
        script = """
<script>
(function(){
  var info = {
    cash:  {avail:'$93.00', hold:'$0.00',  note:'Cash is available to the inmate right away.', line:'Cash deposit'},
    check: {avail:'$43.00', hold:'$50.00', note:'Held until 10/23/2026. Shows on the account as on hold until then.', line:'Check #2211, on hold to 10/23'},
    card:  {avail:'$90.50', hold:'$0.00',  note:'Net of the $2.50 facility fee. Card saved for phone deposits.', line:'Debit card, Visa 4417, fee $2.50'}
  };
  function show(t){
    document.querySelectorAll('.tender').forEach(function(b){ b.classList.toggle('on', b.dataset.tender===t); });
    document.querySelectorAll('[data-pane]').forEach(function(p){ p.style.display = p.dataset.pane===t ? '' : 'none'; });
    var i = info[t];
    document.getElementById('availAfter').textContent = i.avail;
    document.getElementById('holdAfter').textContent = i.hold;
    document.getElementById('afterNote').textContent = i.note;
    document.getElementById('receiptLine').textContent = i.line;
  }
  document.querySelectorAll('.tender').forEach(function(b){ b.addEventListener('click', function(){ show(b.dataset.tender); }); });
  show('check');
})();
</script>
"""
        html = html.replace("</body>", script + "</body>")

    # any leftover holes
    html = re.sub(r"\{\{[^}]+\}\}", "", html)
    (out / name).write_text(html, encoding="utf-8")
    print("wrote", name)
