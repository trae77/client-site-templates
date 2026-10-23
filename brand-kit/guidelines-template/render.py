#!/usr/bin/env python3
"""Render brand guidelines (and templates) to PDF.
Usage: python3 render.py brand.json [--out guidelines.pdf]
Fills template.html with values from brand.json, computes RGB/CMYK + WCAG contrast, prints with headless Chrome/Chromium
(falls back to `npx playwright` if no Chrome is installed)."""
import json, sys, os, shutil, subprocess, argparse, html
from pathlib import Path
HERE = Path(__file__).resolve().parent

def rgb(h): h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
def cmyk(h):
    r, g, b = [x/255 for x in rgb(h)]; k = 1-max(r, g, b)
    if k == 1: return (0, 0, 0, 100)
    return tuple(round(v*100) for v in ((1-r-k)/(1-k), (1-g-k)/(1-k), (1-b-k)/(1-k), k))
def lum(h):
    c = [x/255 for x in rgb(h)]; c = [x/12.92 if x <= .03928 else ((x+.055)/1.055)**2.4 for x in c]
    return .2126*c[0]+.7152*c[1]+.0722*c[2]
def contrast(a, b): la, lb = sorted((lum(a), lum(b)), reverse=True); return (la+.05)/(lb+.05)

def find_chrome():
    for c in ("google-chrome", "chromium", "chromium-browser"):
        if shutil.which(c): return shutil.which(c)
    import glob
    g = glob.glob(os.path.expanduser("~/.cache/ms-playwright/chromium-*/chrome-linux*/chrome"))
    return g[0] if g else None

def to_pdf(html_path, pdf_path):
    ch = find_chrome()
    if ch:
        subprocess.run([ch, "--headless=new", "--no-sandbox", "--disable-gpu", "--no-pdf-header-footer",
                        "--allow-file-access-from-files", f"--print-to-pdf={pdf_path}", f"file://{html_path}"],
                       check=True, capture_output=True)
    else:
        subprocess.run(["npx", "-y", "playwright", "pdf", f"file://{html_path}", str(pdf_path)], check=True)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("brand"); ap.add_argument("--out")
    a = ap.parse_args(); bp = Path(a.brand).resolve(); b = json.loads(bp.read_text())
    kit = (bp.parent / b["kit_dir"]).resolve(); s = b["slug"]
    L = lambda layout, cw, ext="svg": (kit/f"logos/{layout}/{cw}/svg/{s}-{layout}-{cw}.svg").as_uri()
    e = html.escape
    sw = "".join(f'<div class="sw"><div class="chip" style="background:{c["hex"]}"></div><b>{e(c["name"])}</b><small>{e(c["role"])}</small>'
                 f'<code>HEX {c["hex"].upper()}<br>RGB {", ".join(map(str, rgb(c["hex"])))}<br>CMYK {" / ".join(map(str, cmyk(c["hex"])))}</code></div>'
                 for c in b["colors"])
    rows = []
    cols = b["colors"]
    for i, x in enumerate(cols):
        for y in cols[i+1:]:
            r = contrast(x["hex"], y["hex"])
            v = "AA text ✓" if r >= 4.5 else ("AA large/graphics only" if r >= 3 else "✗ don't pair for text")
            rows.append(f'<tr><td><span class="pair" style="background:{x["hex"]};color:{y["hex"]}">Aa</span></td><td>{e(x["name"])} / {e(y["name"])}</td><td>{r:.2f}:1</td><td>{v}</td></tr>')
    vals = {
        "BUSINESS_NAME": e(b["business_name"]), "TAGLINE": e(b["tagline"]), "VERSION": e(b["version"]), "DATE": e(b["date"]),
        "CONTACT": e(b["contact"]), "HEADING_FONT": e(b["heading_font"]), "BODY_FONT": e(b["body_font"]),
        "FONT_URL": "https://fonts.googleapis.com/css2?family=" + b["heading_font"].replace(" ", "+") + ":wght@400;700&family=" + b["body_font"].replace(" ", "+") + ":wght@400;600&display=swap",
        "C1": cols[0]["hex"], "C2": cols[1]["hex"] if len(cols) > 1 else cols[0]["hex"], "C3": cols[2]["hex"] if len(cols) > 2 else "#333333",
        "SWATCHES": sw, "CONTRAST_ROWS": "".join(rows),
        "ADJ": " · ".join(map(e, b["voice_adjectives"])),
        "VOICE_DO": "".join(f"<li>{e(x)}</li>" for x in b["voice_do"]), "VOICE_DONT": "".join(f"<li>{e(x)}</li>" for x in b["voice_dont"]),
    }
    for layout in ("primary", "horizontal", "stacked", "icon"):
        for cw in ("full-color", "black", "white"):
            vals[f"LOGO_{layout.upper()}_{cw.upper().replace('-', '_')}"] = L(layout, cw)
    t = (HERE/"template.html").read_text()
    for k, v in vals.items(): t = t.replace("{{"+k+"}}", v)
    outhtml = bp.parent / f"{s}-guidelines.html"; outhtml.write_text(t)
    pdf = Path(a.out).resolve() if a.out else bp.parent / f"{s}-brand-guidelines.pdf"
    to_pdf(outhtml, pdf); print("PDF:", pdf)

if __name__ == "__main__": main()
