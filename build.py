#!/usr/bin/env python3
"""Build GECKO Ops into one self-contained page: dist/gecko-ops.html

  python3 build.py            -> dist/gecko-ops.html (CSS, JS and the brand fonts inlined)
  GK_OUT=/some/dir python3 build.py   -> build somewhere else (parallel work, CI)

The same file runs as a claude.ai artifact (shared team data through the artifact database)
and as a plain static website (data kept in the browser until a hosted backend is plugged in).
The brand font (Familjen Grotesk; woff2 from gecko/brand/fonts) are inlined, so nothing loads from a font CDN.
"""
import base64, json, os, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"

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
    backend_url = os.environ.get("GK_SUPABASE_URL", "").strip().rstrip("/")
    backend_key = os.environ.get("GK_SUPABASE_ANON_KEY", "").strip()
    if bool(backend_url) != bool(backend_key):
        sys.exit("Set both GK_SUPABASE_URL and GK_SUPABASE_ANON_KEY, or neither.")
    if backend_url:
        local = re.match(r"^http://(localhost|127\.0\.0\.1|\[::1\])(?::[0-9]+)?$", backend_url)
        hosted = re.match(r"^https://[a-z0-9]{20}\.supabase\.co$", backend_url)
        if not (local or hosted):
            sys.exit("GK_SUPABASE_URL must be a local Supabase URL or https://<project-ref>.supabase.co")
        if backend_key.lower().startswith(("sb_secret_", "service_role")):
            sys.exit("A service-role/secret key must never be embedded in the browser build.")
        try:
            payload = backend_key.split(".")[1]
            claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
            if claims.get("role") == "service_role":
                sys.exit("A service-role key must never be embedded in the browser build.")
        except (IndexError, ValueError, json.JSONDecodeError):
            pass
    css = (SRC / "styles" / "tokens.css").read_text() + "\n" + (SRC / "styles" / "app.css").read_text()
    def font(m):
        f = SRC / "assets" / "fonts" / (m.group(1) + ".woff2")
        return "data:font/woff2;base64," + base64.b64encode(f.read_bytes()).decode()
    css = re.sub(r"__FONT_([a-z0-9-]+)__", font, css)
    js = [
        "window.GK_BACKEND_CONFIG = " + json.dumps(
            {"url": backend_url, "anonKey": backend_key},
            separators=(",", ":")
        ) + ";"
    ]
    for rel in order():
        code = (SRC / rel).read_text()
        if "</script" in code.lower():
            sys.exit(f"{rel}: contains '</script', which would break the inlined page")
        js.append(f"/* ---- {rel} ---- */\n{code}")
    html = f"""<title>Gecko Ops</title>
<meta name="description" content="Gecko's team app: sales pipeline, clients, projects, production, money, docs and the client view.">
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
