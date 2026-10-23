#!/usr/bin/env python3
"""TTA Web Dev brand-kit exporter (free tools only: Inkscape + Pillow + zip).

Usage:  python3 export.py <master_dir> <client-slug> [--out DIR]
<master_dir> must contain hand-cleaned vector masters:
  primary.svg  horizontal.svg  stacked.svg  icon.svg   (icon.svg should be square)
Rules for masters: real vector paths (no embedded rasters), true knockouts done with
compound paths / fill-rule="evenodd" (not white shapes), colors as fill="#RRGGBB".
Outputs <out>/<slug>-brand-kit/ and <slug>-brand-kit.zip.
"""
import argparse, os, re, shutil, subprocess, sys, tempfile
from pathlib import Path

LAYOUTS = ["primary", "horizontal", "stacked", "icon"]
COLORWAYS = {"full-color": None, "black": "#000000", "white": "#FFFFFF"}
PNG_WIDTHS = [500, 1000, 2000]          # logo PNGs (px wide)
ICON_PNG = [256, 512, 1024]
FAVICONS = {"favicon-16.png": 16, "favicon-32.png": 32, "apple-touch-icon-180.png": 180, "icon-512.png": 512}

def ensure_inkscape():
    if not shutil.which("inkscape"):
        print("Inkscape not found; installing via apt...")
        subprocess.run("sudo apt-get update -qq && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq inkscape", shell=True, check=True)
    v = subprocess.run(["inkscape", "--version"], capture_output=True, text=True)
    if v.returncode != 0: sys.exit("Inkscape failed to run")
    print("Using", v.stdout.strip())
    try: import PIL  # noqa
    except ImportError: subprocess.run([sys.executable, "-m", "pip", "install", "-q", "pillow"], check=True)

def recolor(svg, color):
    if color is None: return svg
    svg = re.sub(r'(fill|stroke)="(?!none)[^"]*"', lambda m: f'{m.group(1)}="{color}"', svg)
    svg = re.sub(r'(fill|stroke)\s*:\s*(?!none)[^;"]+', lambda m: f'{m.group(1)}:{color}', svg)
    return svg

def ink(src, *args):
    r = subprocess.run(["inkscape", str(src), *args], capture_output=True, text=True)
    if r.returncode != 0: sys.exit(f"Inkscape error on {src}:\n{r.stderr}")

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("master"); ap.add_argument("slug"); ap.add_argument("--out", default=".")
    a = ap.parse_args(); ensure_inkscape()
    from PIL import Image
    master = Path(a.master); out = Path(a.out).resolve(); kit = out / f"{a.slug}-brand-kit"
    missing = [l for l in LAYOUTS if not (master / f"{l}.svg").exists()]
    if missing: sys.exit(f"Missing masters: {missing}")
    if kit.exists(): shutil.rmtree(kit)
    tmp = Path(tempfile.mkdtemp())
    count = 0
    for layout in LAYOUTS:
        raw = (master / f"{layout}.svg").read_text()
        for cw, color in COLORWAYS.items():
            base = f"{a.slug}-{layout}-{cw}"
            t = tmp / f"{base}.svg"; t.write_text(recolor(raw, color))
            svgd = kit / "logos" / layout / cw / "svg"; pdfd = svgd.parent / "pdf"; pngd = svgd.parent / "png"
            for d in (svgd, pdfd, pngd): d.mkdir(parents=True, exist_ok=True)
            # text -> outlines so client files never depend on installed fonts
            ink(t, "--export-text-to-path", "--export-plain-svg", "--export-type=svg", f"--export-filename={svgd/base}.svg")
            ink(svgd / f"{base}.svg", "--export-type=pdf", f"--export-filename={pdfd/base}.pdf")
            for w in (ICON_PNG if layout == "icon" else PNG_WIDTHS):
                ink(svgd / f"{base}.svg", "--export-type=png", f"--export-width={w}", "--export-background-opacity=0", f"--export-filename={pngd/base}-{w}px.png")
            count += 1
    # favicon set from full-color icon
    fav = kit / "favicon"; fav.mkdir(parents=True)
    icon_svg = kit / "logos/icon/full-color/svg" / f"{a.slug}-icon-full-color.svg"
    for name, px in FAVICONS.items():
        ink(icon_svg, "--export-type=png", f"--export-width={px}", f"--export-height={px}", "--export-background-opacity=0", f"--export-filename={fav/name}")
    big = Image.open(fav / "icon-512.png").convert("RGBA")
    big.save(fav / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    shutil.copy(icon_svg, fav / "favicon.svg")
    (fav / "README.txt").write_text(
        '<link rel="icon" href="/favicon.ico" sizes="any">\n<link rel="icon" href="/favicon.svg" type="image/svg+xml">\n'
        '<link rel="apple-touch-icon" href="/apple-touch-icon-180.png">\n')
    for d in ("guidelines", "templates", "fonts", "legal"): (kit / d).mkdir(exist_ok=True)
    (kit / "README.txt").write_text(
        f"{a.slug} brand kit\n\nlogos/<layout>/<colorway>/svg|pdf|png\n  svg = web & editing (vector), pdf = print/sign shops (vector), png = transparent images\n"
        "  full-color = default; black = one-color/light backgrounds; white = dark backgrounds/photos\n"
        "favicon/ = website icons; guidelines/ = brand guide PDF; templates/ = business card, email signature, social;\n"
        "fonts/ = links to free Google Fonts (OFL); legal/ = ownership transfer.\n")
    z = shutil.make_archive(str(out / f"{a.slug}-brand-kit"), "zip", out, kit.name)
    shutil.rmtree(tmp)
    print(f"OK: {count} logo variants, favicon set, kit at {kit}\nZIP: {z}")

if __name__ == "__main__": main()
