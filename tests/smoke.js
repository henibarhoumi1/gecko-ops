// Smoke test (GK_PAGE=/path/to/site/index.html to test another build): every view renders without console errors, desktop + 400px + dark. Usage: NODE_PATH=$(npm root -g) node tests/smoke.js [outdir]
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.argv[2] || '/tmp/gk-shots';
const VIEWS = ['today','tasks','calendar','activity','dashboard','pipeline','clients','projects','production','studio','boards','deliveries','reports','finance','portal','team','settings'];
(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const errors = [];
  for (const [label, vp, scheme] of [['desk', { width: 1360, height: 900 }, 'light'], ['phone', { width: 400, height: 860 }, 'light'], ['dark', { width: 1360, height: 900 }, 'dark']]) {
    const ctx = await browser.newContext({ viewport: vp, colorScheme: scheme });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(`${label}: pageerror ${e.message}`));
    page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_FAILED/.test(m.text())) errors.push(`${label}: console ${m.text()}`); });
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await page.goto('file://' + (process.env.GK_PAGE || path.resolve(__dirname, '../dist/site/index.html')));
    await page.waitForSelector('.shell');
    for (const v of VIEWS) {
      await page.evaluate(v => GK.ui.go(v), v);
      await page.waitForTimeout(80);
      const broke = await page.$('.err');
      if (broke) errors.push(`${label}: ${v} shows error: ${await broke.innerText()}`);
      const ov = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      if (ov) errors.push(`${label}: ${v} scrolls horizontally`);
      if (label !== 'dark' || ['today','projects','finance'].includes(v)) await page.screenshot({ path: `${OUT}/${label}-${v}.png` });
    }
    await ctx.close();
  }
  await browser.close();
  console.log(errors.length ? errors.join('\n') : 'OK no errors');
})();
