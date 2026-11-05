"""Original sound design for the Gecko film, synthesised from scratch (no samples, no licences needed).

Writes audio.wav: 15.000 s, 48 kHz, stereo. Every sound is pinned to the frame of the action it belongs to (30 fps),
following the same timeline as film.html / screens.js. Music grid: one beat = 14 frames (128.57 BPM), downbeats on
128 + 14n, so cuts and taps land on the beat.
"""
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
LEN = 15 * SR
rng = np.random.default_rng(7)
L = np.zeros(LEN + SR)
R = np.zeros(LEN + SR)
SEND_L = np.zeros(LEN + SR)  # reverb send
SEND_R = np.zeros(LEN + SR)


def at(f: float) -> int:
    return int(round(f / 30 * SR))


def tt(d: float) -> np.ndarray:
    return np.arange(int(d * SR)) / SR


def place(x: np.ndarray, f: float, gain=1.0, pan=0.0, send=0.0):
    i = at(f)
    x = x * gain
    gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    n = min(len(x), len(L) - i)
    if n <= 0:
        return
    L[i:i + n] += x[:n] * gl * 1.414
    R[i:i + n] += x[:n] * gr * 1.414
    if send:
        SEND_L[i:i + n] += x[:n] * gl * send
        SEND_R[i:i + n] += x[:n] * gr * send


def butter(x, kind, f, order=2):
    b, a = signal.butter(order, np.array(f) / (SR / 2), btype=kind)
    return signal.lfilter(b, a, x)


def noise(d):
    return rng.standard_normal(int(d * SR))


def env_exp(d, k):
    return np.exp(-tt(d) * k)


def fade(x, a=0.002, r=0.01):
    n = len(x)
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return x * e


def note(n):  # MIDI to Hz
    return 440 * 2 ** ((n - 69) / 12)


# ---------- instruments ----------
def kick(gain=1.0):
    t = tt(0.5)
    fr = 48 + 95 * np.exp(-t * 32)
    ph = 2 * np.pi * np.cumsum(fr) / SR
    body = np.sin(ph) * np.exp(-t * 6.5)
    click = butter(noise(0.5), "high", 1500) * np.exp(-t * 400) * 0.25
    return fade(np.tanh((body + click) * 1.6) * 0.8 * gain)


def hat(gain=1.0, d=0.07):
    return fade(butter(noise(d), "high", 7500) * env_exp(d, 70) * 0.35 * gain)


def snap(gain=1.0):
    d = 0.25
    x = butter(noise(d), "band", [1200, 5200]) * env_exp(d, 28) * 0.55
    x += np.sin(2 * np.pi * 1850 * tt(d)) * env_exp(d, 90) * 0.25
    return fade(x * gain)


def bass(midi, d=0.42, gain=1.0):
    t = tt(d)
    f = note(midi)
    x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t) + 0.08 * np.sin(6 * np.pi * f * t)
    e = np.minimum(1, t / 0.006) * np.exp(-t * 4.2)
    return fade(butter(np.tanh(x * e * 1.3), "low", 900) * 0.55 * gain, r=0.03)


def pad(midis, d, gain=1.0, cutoff=2400):
    t = tt(d)
    out = np.zeros((2, len(t)))
    for m in midis:
        f = note(m)
        for ch, det in ((0, -1), (1, 1)):
            for c in (-7, 0, 7):
                ff = f * 2 ** ((c + det * 3) / 1200)
                out[ch] += signal.sawtooth(2 * np.pi * ff * t + rng.uniform(0, 6.28))
    e = np.minimum(1, t / 0.35) * np.minimum(1, (d - t) / 0.5).clip(0, 1)
    out = np.array([butter(o, "low", cutoff) for o in out]) * e / (3 * len(midis)) * 0.5 * gain
    return out


def pop(pitch=700, gain=1.0):
    d = 0.14
    t = tt(d)
    fr = pitch * (0.62 + 0.38 * np.exp(-t * 40))
    x = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 34)
    x += butter(noise(d), "band", [1500, 6000]) * np.exp(-t * 300) * 0.25
    return fade(x * 0.55 * gain, a=0.0005)


def click(gain=1.0):
    d = 0.06
    t = tt(d)
    x = butter(noise(d), "high", 2200) * np.exp(-t * 600) * 0.6
    x += np.sin(2 * np.pi * 3100 * t) * np.exp(-t * 260) * 0.35
    x += np.sin(2 * np.pi * 900 * t) * np.exp(-t * 120) * 0.25
    return fade(x * gain, a=0.0003)


def key(gain=1.0):
    d = 0.03
    t = tt(d)
    x = butter(noise(d), "band", [2500, 7000]) * np.exp(-t * 500) * 0.5
    x += np.sin(2 * np.pi * rng.uniform(3800, 5200) * t) * np.exp(-t * 520) * 0.18
    return fade(x * gain * rng.uniform(0.7, 1.0), a=0.0002)


def whoosh(d, f0, f1, peak=0.7, gain=1.0):
    n = int(d * SR)
    x = noise(d)
    out = np.zeros(n)
    blk = 256
    zi = None
    for i in range(0, n, blk):
        p = i / n
        fc = f0 * (f1 / f0) ** p
        lo, hi = fc / 1.6, min(fc * 1.6, SR / 2 - 100)
        b, a = signal.butter(2, [lo / (SR / 2), hi / (SR / 2)], btype="band")
        if zi is None:
            zi = signal.lfilter_zi(b, a) * 0
        y, zi = signal.lfilter(b, a, x[i:i + blk], zi=zi)
        out[i:i + blk] = y
    t = np.linspace(0, 1, n)
    e = np.where(t < peak, (t / peak) ** 2.2, np.exp(-np.clip((t - peak) / max(1 - peak, 1e-3) * 4, 0, 50)))
    return fade(out * e * 1.4 * gain)


def riser(d, gain=1.0):
    t = tt(d)
    w = whoosh(d, 300, 7000, peak=0.999, gain=0.8)
    s = np.sin(2 * np.pi * np.cumsum(220 * 4 ** (t / d)) / SR) * (t / d) ** 3 * 0.18
    return (w + s) * gain


def impact(gain=1.0, d=1.6):
    t = tt(d)
    fr = 42 + 40 * np.exp(-t * 14)
    sub = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 2.6)
    thud = butter(noise(d), "low", 700) * np.exp(-t * 14) * 0.9
    crack = butter(noise(d), "band", [1800, 7000]) * np.exp(-t * 60) * 0.35
    return fade(np.tanh((sub + thud + crack) * 1.8) * 0.9 * gain, a=0.0005, r=0.2)


def marker(d, gain=1.0):
    t = tt(d)
    x = butter(noise(d), "band", [2300, 5600])
    am = 0.75 + 0.25 * np.sin(2 * np.pi * 31 * t + 2 * np.sin(2 * np.pi * 7 * t))
    e = np.minimum(1, t / 0.03) * np.minimum(1, (d - t) / 0.05).clip(0, 1)
    return fade(x * am * e * 0.3 * gain)


def bell(midi, d=2.4, gain=1.0):
    t = tt(d)
    f = note(midi)
    x = np.zeros(len(t))
    for ratio, amp, k in ((1, 1, 2.2), (2.0, 0.45, 3.0), (2.76, 0.3, 4.5), (5.4, 0.12, 7), (8.93, 0.06, 9)):
        x += amp * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t * k)
    return fade(x * np.minimum(1, t / 0.002) * 0.28 * gain, a=0.0005, r=0.3)


def place_st(st, f, gain=1.0, send=0.0):
    i = at(f)
    n = min(st.shape[1], len(L) - i)
    L[i:i + n] += st[0, :n] * gain
    R[i:i + n] += st[1, :n] * gain
    if send:
        SEND_L[i:i + n] += st[0, :n] * gain * send
        SEND_R[i:i + n] += st[1, :n] * gain * send


# ---------- 1. chaos (0–64): pops on every fragment, a clock speeding up, a riser into the pull ----------
frags = [0, 9, 15, 20, 24, 28, 31, 34, 37, 39, 41, 43]
for i, f in enumerate(frags):
    place(pop(620 + (i % 2) * 180 + i * 18, gain=0.9 - i * 0.025), f, pan=rng.uniform(-0.6, 0.6), send=0.25)
f, step = 0.0, 7.0
while f < 62:
    place(hat(0.55 + f / 120, d=0.05), f, pan=0.25 if int(f) % 2 else -0.25)
    f += step
    step = max(2.0, step * 0.9)
place(click(0.9), 26, send=0.2)            # "Your project,"
place(click(0.9), 38, send=0.2)            # "everywhere."
place(marker(0.27, 0.8), 39)               # the pink marker
place(riser(64 / 30 - 0.7), 21, gain=0.55)
place(whoosh(0.5, 200, 3000, peak=0.97, gain=0.9), 49)  # everything pulled into one point

# ---------- 2. one link (64–128) ----------
place(impact(1.0), 64, send=0.3)
place(kick(0.9), 72)
place(click(1.0), 72, send=0.2)            # "link."
for f in (86, 100):
    place(kick(0.55), f)
place(pop(980, 0.8), 86, send=0.2)         # the address bar pops in
for i in range(1, 26):
    place(key(0.8), 90 + 20 * i / 25, pan=rng.uniform(-0.2, 0.2))
place(kick(0.7), 114)
place(click(1.1), 114, send=0.25)          # the tap
place(whoosh(0.47, 300, 5000, peak=0.85, gain=0.8), 114)   # opens into the phone
place_st(pad([55, 62, 66, 69], 0.47, gain=0.5, cutoff=1200), 114)

# ---------- 3. the journey (128–338): the groove ----------
BEAT = 14
chords = [  # (start frame, length, pad notes, bass root)
    (128, 56, [55, 59, 62, 66, 69], 43),   # Gmaj9
    (184, 56, [54, 57, 62, 64, 69], 38),   # D(add9)/F#
    (240, 56, [52, 55, 59, 62, 66], 40),   # Em9
    (296, 42, [57, 62, 64, 66, 69], 45),   # A6sus
]
for start, length, notes, root in chords:
    place_st(pad(notes, length / 30 + 0.4, gain=1.25), start, send=0.4)
    for b in range(length // BEAT):
        f = start + b * BEAT
        place(bass(root if b % 2 == 0 else root + 12, gain=0.9), f)
        place(bass(root + 7, d=0.2, gain=0.45), f + BEAT * 0.75)
for b in range(15):
    f = 128 + b * BEAT
    place(kick(0.62), f)
    place(hat(0.8), f + 7, pan=0.3)
    place(hat(0.35, d=0.04), f + 10.5, pan=-0.3)
    if b % 2 == 1:
        place(snap(0.55), f, pan=-0.1, send=0.35)
for s in range(5):  # each step: the screen slides up
    place(whoosh(0.32, 900, 4200, peak=0.35, gain=0.55), 128 + s * 42 - 2, pan=0.0)
place(pop(1180, 0.7), 144, pan=0.4, send=0.3)            # 01 "Agreed in writing"
place(click(1.0), 187, pan=-0.1, send=0.2)               # 02 picks hook A
place(click(1.1), 203, pan=-0.1, send=0.2)               # 02 taps Approve
place(bell(79, 1.2, 0.9), 205, pan=0.35)                 # 02 "Approved"
place(pop(1180, 0.6), 205, pan=0.4, send=0.3)
place(whoosh(0.66, 250, 1800, peak=0.6, gain=0.5), 218)  # 03 the camera pushes in
place(marker(0.33, 1.0), 236)                            # 03 the marker under the shoot line
place(click(1.0), 270, send=0.2)                         # 04 taps 0:04
place(pop(860, 0.7), 272, pan=0.4, send=0.3)             # 04 the note appears
for i in range(10):
    place(key(0.6), 275 + i * 1.15, pan=0.35)            # 04 typing the note
place(whoosh(0.2, 2500, 600, peak=0.3, gain=0.45), 287)  # 04 the note drops into the list
place(click(1.1), 317, send=0.2)                         # 05 taps Get the file
place(bell(86, 1.4, 0.8), 320, pan=0.35)                 # 05 "Final file, yours"
place(pop(1180, 0.6), 320, pan=0.4, send=0.3)

# ---------- 4. the end (338–450) ----------
place(impact(0.8, d=1.2), 338, send=0.35)                # cut to white: "One link."
place(click(0.9), 352, send=0.3)                         # "The whole project."
place(marker(0.55, 1.1), 356)                            # marker under it
place(whoosh(0.6, 400, 2600, peak=0.6, gain=0.35), 366)  # the rule draws
place_st(pad([55, 59, 62, 66, 69, 74], 3.3, gain=1.0, cutoff=1800), 352, send=0.5)
place(impact(0.55, d=1.5), 380, send=0.4)                # the logo lands
place(kick(0.6), 380)
for i, m in enumerate((79, 83, 86, 91)):
    place(bell(m, 2.6, 0.75 - i * 0.12), 380 + i * 2.5, pan=-0.3 + i * 0.2, send=0.6)
place(click(0.6), 394, send=0.3)                         # the handle

# ---------- reverb (Schroeder) on the send bus ----------
def reverb(x):
    out = np.zeros_like(x)
    for dly, g in ((1557, 0.84), (1617, 0.83), (1491, 0.85), (1422, 0.86)):
        y = np.zeros_like(x)
        b = np.zeros(dly + 1)
        b[0] = 1
        a = np.zeros(dly + 1)
        a[0] = 1
        a[dly] = -g
        y = signal.lfilter(b, a, x)
        out += y
    for dly, g in ((225, 0.7), (556, 0.7)):
        b = np.zeros(dly + 1)
        b[0] = -g
        b[dly] = 1
        a = np.zeros(dly + 1)
        a[0] = 1
        a[dly] = -g
        out = signal.lfilter(b, a, out)
    return butter(out, "low", 6000) * 0.12


L += reverb(SEND_L)
R += reverb(SEND_R)

# ---------- master: trim, a gentle fade at the very end, soft limit, -1 dBFS ----------
L, R = L[:LEN], R[:LEN]
fade_out = np.ones(LEN)
n = at(450) - at(432)
fade_out[at(432):] = np.linspace(1, 0, n) ** 1.5
L *= fade_out
R *= fade_out
mix = np.stack([L, R])
mix = mix - mix.mean(axis=1, keepdims=True)
peak = np.abs(mix).max()
mix = np.tanh(mix / peak * 0.9) / np.tanh(0.9)
mix *= 10 ** (-1.5 / 20)
wavfile.write("audio.wav", SR, (mix.T * 32767).astype(np.int16))
print("audio.wav", mix.shape, "peak", np.abs(mix).max())
