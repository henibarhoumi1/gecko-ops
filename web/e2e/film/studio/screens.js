// What happens inside the phone, step by step. Pages are real captures of the Gecko client portal (fake brand
// "Lumière Skincare"), 1170 px wide = 390 portal CSS px at 3×. All coordinates here are portal CSS px.
// Each step lasts 42 frames (sf = 0…41). plan(sf) says which page shows, how far it is scrolled (offset), where the
// pointer is (window coordinates: x, y from the top of the screen), when it taps, and what appears beside the phone.
(() => {
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const seg = (f, a, b) => clamp((f - a) / (b - a));
  const ease = (t) => (t < .5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2);
  const smooth = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  // A pointer path through keyframes [sf, x, y]; null before the first one.
  const path = (sf, keys) => {
    if (sf < keys[0][0]) return null;
    for (let i = 0; i < keys.length - 1; i++) {
      const [a, ax, ay] = keys[i], [b, bx, by] = keys[i + 1];
      if (sf <= b) { const t = smooth(seg(sf, a, b)); return [lerp(ax, bx, t), lerp(ay, by, t)]; }
    }
    const k = keys[keys.length - 1]; return [k[1], k[2]];
  };
  const tap = (sf, at) => (sf >= at && sf < at + 12 ? (sf - at) / 12 : null);
  const press = (sf, at) => sf >= at && sf < at + 3;
  const P = (n) => ({ src: `assets/screens/${n}.png`, view: `assets/screens/${n}-view.png` });

  const pages = {
    home: P('before-home'),
    scripts: P('before-scripts'),
    scriptsAfter: P('after-scripts'),
    review: { ...P('before-review-open'), video: [16, 262, 358, 239] },
    reviewAfter: { ...P('after-review-open'), video: [16, 262, 358, 239] },
    delivery: P('before-delivery'),
  };

  // Callouts sit on the right edge of the phone, half on it, half off it.
  const steps = [
    // 01 Brief & quote: the plan as agreed (what's included, the next step, the timeline), drifting slowly.
    { plan: (sf) => ({
      page: 'home', offset: lerp(1428, 1488, smooth(seg(sf, 0, 41))), cursor: null,
      call: sf >= 16 ? { text: 'Agreed in writing', t: seg(sf, 16, 24), x: 470, y: 1236, r: -3 } : null,
    }) },
    // 02 Scripts: pick a hook, scroll to Approve, tap it; the script leaves the waiting list.
    { plan: (sf) => {
      const after = sf >= 35;
      const offset = after ? 300 : sf < 20 ? lerp(380, 520, ease(seg(sf, 0, 14))) : lerp(520, 1440, ease(seg(sf, 20, 31)));
      const cursor = after ? null : path(sf, [[6, 330, 640], [15, 61, 115], [19, 61, 115], [31, 86, 329]]);
      return {
        page: after ? 'scriptsAfter' : 'scripts', offset, cursor,
        press: press(sf, 17) || press(sf, 33), tapT: tap(sf, 17) ?? tap(sf, 33),
        call: after ? { text: 'Approved', t: seg(sf, 35, 41), x: 590, y: 1010, r: -4 } : null,
      };
    } },
    // 03 Shoot: home, then the camera pushes in on the shoot line and the marker draws under it.
    { plan: (sf) => ({
      page: 'home', offset: 0, cursor: null,
      mark: { box: [14, 487, 338, 21], t: ease(seg(sf, 24, 34)) },
    }) },
    // 04 First draft: the reel plays in the player; tap at 0:04, write a note; it lands in the notes.
    { plan: (sf) => {
      const after = sf >= 34;
      return {
        page: after ? 'reviewAfter' : 'review', offset: after ? lerp(170, 360, ease(seg(sf, 34, 41))) : 0,
        cursor: after ? null : path(sf, [[6, 300, 700], [15, 63, 522]]),
        press: press(sf, 16), tapT: tap(sf, 16),
        note: sf >= 18 && sf < 38 ? { t: seg(sf, 18, 25), type: seg(sf, 21, 32), x: 470, y: 1180, out: seg(sf, 33, 38) } : null,
      };
    } },
    // 05 Final files: Delivery, the clean file is ready; tap Get the file.
    { plan: (sf) => ({
      page: 'delivery', offset: 64,
      cursor: path(sf, [[8, 330, 760], [18, 91, 403]]),
      press: press(sf, 21), tapT: tap(sf, 21),
      call: sf >= 24 ? { text: 'Final file, yours', t: seg(sf, 24, 31), x: 470, y: 1200, r: -3 } : null,
    }) },
  ];

  // Step 03 zoom: scale, and the lift that keeps the shoot line in view (phone transform-origin is its top centre).
  const zoom = { s: 1.3, y: 0 };
  window.FILM_SCREENS = { pages, steps, zoom };
})();
