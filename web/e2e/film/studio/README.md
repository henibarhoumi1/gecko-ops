# Gecko · "One link. The whole project." (15 s product film)

Vertical 1080 × 1920, 30 fps, 15.000 s, H.264 (High) + AAC 48 kHz stereo, -14 LUFS, true peak under -1.5 dBFS.

## The idea

Scattered chats, links and files pile up ("Your project, everywhere."). Everything gets pulled into one point, which
turns into one address bar, which opens into the real Gecko client portal. Five steps play inside it. It ends on one
line and the logo.

| Time | Frames | What happens |
| --- | --- | --- |
| 0.0–2.1 s | 0–64 | Chaos: 12 fragments (chat bubbles, file names, a voice note, links, reels) arrive faster and faster. "Your project, everywhere." All of it is pulled into one point. |
| 2.1–4.3 s | 64–128 | Black. "One" / "link." on the beat. The address bar types `client.gecko-creative.com`, the pointer taps it, and it opens into the phone. |
| 4.3–11.3 s | 128–338 | The real portal, five steps of 42 frames each: **Brief & quote** (the agreed plan) · **Scripts** (pick a hook, approve; the script leaves the waiting list) · **Shoot** (push in on the shoot date, marker under it) · **First draft** (the reel plays, a note at 0:04 lands in the notes) · **Final files** (Get the file). |
| 11.3–15 s | 338–450 | White. "One link. The whole project." The marker draws, the rule draws, `gecko.]` lands, then `@geckocreativestudio`. Held for 2.3 s. |

## Rules it follows

- **Real interface only.** Every phone screen is a capture of the real Gecko client portal, built from the app's own
  code. Nothing on screen is invented.
  - The data is a fake brand ("Lumière Skincare"), never a real client.
  - The screens come from `web/e2e/film` in the gecko-ops repo: `make-fixtures.sh` builds the fake data from the
    real database migrations, and `capture.mjs` takes the screens at 3× resolution.
  - The before and after states (script approved, note left) are what the database actually returns after those
    actions.
- **The motion graphics stay outside the phone.** The step titles, callouts and note card are design elements around
  the phone. They never pretend to be app features.
- **The reel in the player** is real work by Gecko's founder (Glucélia, 2026, before Gecko existed), shown as an
  example preview.
- **Gecko motion rules:**
  - scenes change on hard cuts, not fades
  - the marker draws left to right
  - no blur and no glow
  - brand palette only: black, white, pink #F4C1C4, yellow #F3DF9E and powder blue #C5DDF2
- **Instagram safe zones.** Key text stays clear of the bottom caption area and the right-hand buttons.

## How it's built

- **`film.html`:** the whole film is one page, and `render(frame)` sets every element. Nothing animates on its own, so
  every frame is exact and the same on every render. This is the Remotion approach without Remotion, which can't be
  installed here because the package registry isn't reachable.
- **`screens.js`:** what happens inside the phone at each step: which page, the scroll position, the pointer path,
  taps and callouts.
- **`render.py`:** Chromium (Playwright) renders frames 0–449 into `frames/`.
- **`sound.py`:** the full soundtrack is synthesised from scratch with NumPy and SciPy. There are no samples and no
  licences involved.
  - The music runs at 128.6 BPM (14 frames a beat), so the cuts land on the beat.
  - Each sound effect is pinned to the frame of its action.
- **`build.sh`:** sound, frames, then the ffmpeg encode (x264 `slow`, CRF 16, BT.709, AAC 192 kbps, faststart).

Rebuild: `sh build.sh` (needs Python 3 with numpy, scipy and playwright, Chromium, and ffmpeg).

## Quality checks done

- **Frame review:** contact sheets of every 4th frame, plus full-size checks of key frames. These found and fixed:
  - elements leaking between scenes
  - a blank screen between steps (now a push)
  - "One" and "link." arriving on the same beat
  - the end line running off the edge
  - see-through callouts
  - the zoom covering the title
- **Cut check:** frame-to-frame difference analysis. Every large jump is a planned cut: frames 64, 116, 256–259, 288 and
  338.
- **Audio sync:** the soundtrack decoded from the MP4 lines up with the source at 0 samples offset (ffmpeg writes the
  edit list that compensates the AAC priming delay).
- **Loudness:** measured with EBU R128: -14.2 LUFS integrated.

## Skills and tools used

| Skill / tool | Checked | Used for |
| --- | --- | --- |
| `Vincentwei1021/video-shotcraft` (13.9k stars, Apache-2.0, last commit 30 Oct 2026) | Read SKILL.md and its sound-design and aesthetic-rules references | Its rules shaped the work: real screenshots instead of hand-made UI (Q1), let key frames breathe (R1), easing and acceleration instead of constant speed (R2), a steady camera (Q3), sound pinned to frames, and the AAC delay check. Its Remotion templates weren't used because the package registry is blocked here. |
| `remotion-dev/skills` (5.5k stars, official, updated 2 Nov 2026) | Read `remotion-best-practices` | Frame-driven rendering: everything is a function of the frame number, with no CSS transitions. Applied in `film.html` without the Remotion package. |
| Anthropic frontend-design guidance | Available in this session | Type and layout decisions. |
| Playwright + Chromium, ffmpeg (libx264, aac), NumPy/SciPy | Pre-installed | Rendering, encoding, sound synthesis, analysis. |

Nothing was installed system-wide. Both skill repositories were cloned read-only to be read.
