#!/usr/bin/env python3
"""Build GECKO Ops into one self-contained page: dist/gecko-ops.html

  python3 build.py            -> dist/gecko-ops.html (CSS, JS and the Trovical font inlined)
  GK_OUT=/some/dir python3 build.py   -> build somewhere else (parallel work, CI)

The same file runs as a claude.ai artifact (shared team data through the artifact database)
and as a plain static website (data kept in the browser until a hosted backend is plugged in).
Google Fonts (Anton, Archivo, Jomhuria) load from fonts.googleapis.com; Trovical is inlined.
"""
import os, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"
FONTS = "https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wdth,wght@62..125,100..900&family=Jomhuria&display=swap"

def order():
    out = []
    for l in (SRC / "order.txt").read_text().splitlines():
        l = l.strip()
        if not l or l.startswith("#"):
            continue
        if "*" in l:  # e.g. modules/finance_*.js, expanded in name order
            out += sorted(str(p.relative_to(SRC)) for p in SRC.glob(l))
        else:
            out.append(l)
    return out

def build():
    font = (SRC / "assets" / "trovical-italic.b64").read_text().strip()
    css = (SRC / "styles" / "tokens.css").read_text() + "\n" + (SRC / "styles" / "app.css").read_text()
    css = css.replace("__TROVICAL_ITALIC__", "data:font/otf;base64," + font)
    js = []
    for rel in order():
        code = (SRC / rel).read_text()
        if "</script" in code.lower():
            sys.exit(f"{rel}: contains '</script', which would break the inlined page")
        js.append(f"/* ---- {rel} ---- */\n{code}")
    html = f"""<title>GECKO Ops</title>
<meta name="description" content="GECKO studio operations: pipeline, projects, production, deliveries, money and the client view.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<style>
{css}
</style>
<div id="app"></div>
<script>
{chr(10).join(js)}
</script>
"""
    dist = pathlib.Path(os.environ.get("GK_OUT", ROOT / "dist"))
    out = dist / "gecko-ops.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(html)
    # Website variant: same page with a full document skeleton, ready for any static host.
    site = dist / "site"
    site.mkdir(exist_ok=True)
    (site / "index.html").write_text(
        '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        + html.replace('<div id="app"></div>', '</head>\n<body>\n<div id="app"></div>', 1)
        + "</body>\n</html>\n")
    print(f"built {out} ({out.stat().st_size // 1024} KB) and {site / 'index.html'}")

if __name__ == "__main__":
    build()
