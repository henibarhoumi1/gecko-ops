"""Renders film.html frame by frame (1080×1920) with Chromium.

Usage:
  python3 render.py                 # all 450 frames into frames/
  python3 render.py --every 15      # a quick look: every 15th frame into preview/
  python3 render.py --frames 120 200 260
Each frame calls render(f) in the page and screenshots it; nothing in the page animates on its own, so every frame
is exact and the same on every run.
"""
import argparse
import asyncio
import pathlib

from playwright.async_api import async_playwright

HERE = pathlib.Path(__file__).resolve().parent
TOTAL = 450


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--every", type=int, default=0)
    ap.add_argument("--frames", type=int, nargs="*")
    ap.add_argument("--workers", type=int, default=4)
    a = ap.parse_args()
    if a.frames:
        frames, out = a.frames, HERE / "preview"
    elif a.every:
        frames, out = list(range(0, TOTAL, a.every)), HERE / "preview"
    else:
        frames, out = list(range(TOTAL)), HERE / "frames"
    out.mkdir(exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--allow-file-access-from-files", "--font-render-hinting=none"])

        async def worker(chunk: list[int]) -> None:
            page = await browser.new_page(viewport={"width": 1080, "height": 1920}, device_scale_factor=1)
            errors: list[str] = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            await page.goto((HERE / "film.html").as_uri())
            await page.evaluate("window.ready")
            for f in chunk:
                await page.evaluate(f"render({f})")
                await page.evaluate("new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))")
                await page.screenshot(path=str(out / f"{f:04d}.png"))
            if errors:
                print("page errors:", errors[:5])
            await page.close()

        n = max(1, min(a.workers, len(frames)))
        chunks = [frames[i::n] for i in range(n)]
        await asyncio.gather(*(worker(c) for c in chunks))
        await browser.close()
    print(f"{len(frames)} frames -> {out}")


asyncio.run(main())
