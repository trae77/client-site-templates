#!/usr/bin/env bash
# One-shot build: export logos -> guidelines PDF -> templates -> legal -> zip.
# Usage: ./make-kit.sh <master_dir> <brand.json> <out_dir> [template args e.g. --name "Jane" --phone ...]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
MASTER="$1"; BRAND="$(realpath "$2")"; OUT="$3"; shift 3
SLUG=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['slug'])" "$BRAND")
python3 "$HERE/export.py" "$MASTER" "$SLUG" --out "$OUT" 2>&1 | grep -v -E 'WARNING|dbind' || true
KIT="$(realpath "$OUT")/$SLUG-brand-kit"
[ -d "$KIT" ] || { echo "export failed"; exit 1; }
python3 "$HERE/guidelines-template/render.py" "$BRAND" --out "$KIT/guidelines/$SLUG-brand-guidelines.pdf"
python3 "$HERE/templates/render_templates.py" "$BRAND" "$@"
rm -f "$KIT/templates/business-card.html"
cp "$HERE/rights-transfer.md" "$KIT/legal/"
python3 - "$BRAND" "$KIT/fonts/FONTS.txt" <<'PY'
import json,sys;b=json.load(open(sys.argv[1]))
open(sys.argv[2],'w').write("".join(f"{f}: https://fonts.google.com/specimen/{f.replace(' ','+')} (SIL Open Font License, free for commercial use)\n" for f in (b['heading_font'],b['body_font'])))
PY
(cd "$(dirname "$KIT")" && rm -f "$SLUG-brand-kit.zip" && zip -qr "$SLUG-brand-kit.zip" "$SLUG-brand-kit")
echo "DONE: $KIT and $(dirname "$KIT")/$SLUG-brand-kit.zip"
