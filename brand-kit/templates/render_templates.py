#!/usr/bin/env python3
"""Render client templates from the same brand.json used by guidelines-template.
Usage: python3 render_templates.py ../guidelines-template/brand.sample.json [--name "Jane Doe" --title Owner --phone ... --email ... --web ...]
Outputs to <kit>/templates/: business-card-print.pdf (3.75x2.25in = 3.5x2 + 0.125in bleed, front+back),
email-signature.html, social PNGs (profile 800x800, FB cover 851x315, LinkedIn personal 1584x396, LinkedIn company 1128x191)."""
import json, sys, subprocess, argparse, html
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "guidelines-template"))
from render import find_chrome, to_pdf

SOCIAL = {"social-profile-800x800": (800, 800), "facebook-cover-851x315": (851, 315),
          "linkedin-personal-cover-1584x396": (1584, 396), "linkedin-company-cover-1128x191": (1128, 191)}

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("brand")
    for f, d in (("name", "Your Name"), ("title", "Owner"), ("phone", "(555) 555-5555"), ("email", "you@example.com"), ("web", "example.com")):
        ap.add_argument("--" + f, default=d)
    a = ap.parse_args(); bp = Path(a.brand).resolve(); b = json.loads(bp.read_text()); s = b["slug"]
    kit = (bp.parent / b["kit_dir"]).resolve(); out = kit / "templates"; out.mkdir(parents=True, exist_ok=True)
    e = html.escape; c1, c2 = b["colors"][0]["hex"], b["colors"][1]["hex"]
    logo = lambda l, cw: (kit / f"logos/{l}/{cw}/svg/{s}-{l}-{cw}.svg").as_uri()
    font = f'https://fonts.googleapis.com/css2?family={b["heading_font"].replace(" ","+")}:wght@700&family={b["body_font"].replace(" ","+")}:wght@400;600&display=swap'
    # --- business card: page includes bleed; keep text inside 0.125in safe zone past trim ---
    card = f"""<!doctype html><html><head><meta charset=utf-8><link href="{font}" rel=stylesheet><style>
@page{{size:3.75in 2.25in;margin:0}}body{{margin:0;font-family:'{b["body_font"]}',Arial}}
.p{{width:3.75in;height:2.25in;page-break-after:always;position:relative;overflow:hidden}}
.safe{{position:absolute;inset:.25in;display:flex;flex-direction:column;justify-content:space-between}}
.front{{background:#fff}}.front:before{{content:"";position:absolute;left:0;right:0;bottom:0;height:.3in;background:{c2}}}
.back{{background:{c1};display:flex;align-items:center;justify-content:center}}
h1{{font-family:'{b["heading_font"]}';font-size:12pt;margin:0;color:{c1}}}p{{margin:0;font-size:7.5pt;line-height:1.45;color:#333}}
</style></head><body>
<div class="p front"><div class="safe"><img src="{logo('horizontal','full-color')}" style="height:.42in;align-self:flex-start">
<div><h1>{e(a.name)}</h1><p>{e(a.title)}</p><p>{e(a.phone)} · {e(a.email)}<br>{e(a.web)}</p></div></div></div>
<div class="p back"><img src="{logo('stacked','white')}" style="height:1.05in"></div></body></html>"""
    ch = out / "business-card.html"; ch.write_text(card); to_pdf(ch, out / "business-card-print.pdf")
    # --- email signature: table layout + inline styles + hosted PNG (email clients block SVG) ---
    sig = f"""<!-- Paste into Gmail: Settings > Signature. Replace LOGO_URL with a hosted PNG (e.g. on the client's site): {s}-horizontal-full-color-500px.png -->
<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#333333;">
<tr><td style="padding-right:14px;border-right:3px solid {c2};vertical-align:middle;"><img src="LOGO_URL" alt="{e(b['business_name'])}" width="150" style="display:block;width:150px;height:auto;border:0;"></td>
<td style="padding-left:14px;vertical-align:middle;line-height:1.5;"><strong style="font-size:15px;color:{c1};">{e(a.name)}</strong><br>{e(a.title)}, {e(b['business_name'])}<br>
<a href="tel:{''.join(ch for ch in a.phone if ch.isdigit() or ch=='+')}" style="color:#333333;text-decoration:none;">{e(a.phone)}</a> · <a href="mailto:{e(a.email)}" style="color:{c1};">{e(a.email)}</a><br>
<a href="https://{e(a.web)}" style="color:{c1};font-weight:bold;text-decoration:none;">{e(a.web)}</a></td></tr></table>"""
    (out / "email-signature.html").write_text(sig)
    # --- social images ---
    chrome = find_chrome()
    for name, (w, h) in SOCIAL.items():
        if "profile" in name:
            body = f'<div style="width:{w}px;height:{h}px;background:#fff;display:flex;align-items:center;justify-content:center"><img src="{logo("icon","full-color")}" style="width:60%"></div>'
        else:  # keep logo centered-right: FB/LinkedIn overlay the profile photo bottom-left
            body = (f'<div style="width:{w}px;height:{h}px;background:{c1};display:flex;align-items:center;justify-content:flex-end;padding-right:{int(w*.08)}px;box-sizing:border-box;border-bottom:{max(6,h//30)}px solid {c2}">'
                    f'<div style="text-align:right;color:#fff;font-family:\'{b["heading_font"]}\',Arial"><img src="{logo("horizontal","white")}" style="height:{int(h*.32)}px"><div style="font-size:{int(h*.075)}px;margin-top:{int(h*.04)}px">{e(b["tagline"])}</div></div></div>')
        hp = out / f"{name}.html"; hp.write_text(f'<!doctype html><html><head><meta charset=utf-8><link href="{font}" rel=stylesheet></head><body style="margin:0">{body}</body></html>')
        subprocess.run([chrome, "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", f"--window-size={w},{h}",
                        "--virtual-time-budget=3000", f"--screenshot={out/name}.png", hp.as_uri()], check=True, capture_output=True)
        hp.unlink()
    print("Templates written to", out)

if __name__ == "__main__": main()
