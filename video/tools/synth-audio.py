"""Sintetiza los whooshes, el golpe y la música de la promo de Kontrola (todo propio, sin licencias)."""
# Uso: python3 tools/synth-audio.py <carpeta-de-salida>  (requiere numpy). Luego convierte a mp3/ogg con ffmpeg.
import sys, wave
import numpy as np

SR = 44100
OUT = sys.argv[1]
rng = np.random.default_rng(7)


def save(name, x, stereo=None):
    """Guarda WAV 16-bit. x: mono (n,) o estéreo (n, 2)."""
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    peak = np.max(np.abs(x)) or 1
    x = x / peak * 0.8  # deja margen para picos entre muestras
    data = (x * 32767).astype("<i2")
    with wave.open(f"{OUT}/{name}.wav", "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def stft_filter(x, gain_fn, n=1024, hop=256):
    """Filtra con una ganancia que varía en el tiempo: gain_fn(t_rel, freqs) -> ganancia."""
    win = np.hanning(n)
    out = np.zeros(len(x) + n)
    norm = np.zeros(len(x) + n)
    freqs = np.fft.rfftfreq(n, 1 / SR)
    for start in range(0, len(x) - n, hop):
        seg = x[start:start + n] * win
        spec = np.fft.rfft(seg) * gain_fn(start / len(x), freqs)
        out[start:start + n] += np.fft.irfft(spec) * win
        norm[start:start + n] += win ** 2
    return out[: len(x)] / np.maximum(norm[: len(x)], 1e-6)


# ---------------- Efectos ----------------

def whoosh(dur, f0, f1, peak_at=0.6, width=0.8):
    """Ruido con un filtro pasa-banda que barre de f0 a f1 y una envolvente que sube y cae."""
    n = int(dur * SR)
    noise = rng.standard_normal(n)

    def gain(t, freqs):
        fc = f0 * (f1 / f0) ** t
        g = np.exp(-0.5 * (np.log(np.maximum(freqs, 1) / fc) / width) ** 2)
        return g

    y = stft_filter(noise, gain)
    t = np.linspace(0, 1, n)
    env = np.where(t < peak_at, (t / peak_at) ** 2.2, np.exp(-(t - peak_at) / (1 - peak_at) * 5))
    return y * env


def impact(dur=1.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    freq = 40 + 80 * np.exp(-t * 18)
    body = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-t * 3.2)
    click = rng.standard_normal(n) * np.exp(-t * 60) * 0.5
    return np.tanh((body + click) * 1.6)


def riser(dur=1.4):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    y = whoosh(dur, 300, 7000, peak_at=0.97, width=0.6)
    tone = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (t * 2)) / SR) * 0.15 * t ** 2
    return y + tone


save("whoosh-1", whoosh(0.7, 250, 4000))
save("whoosh-2", whoosh(0.55, 4000, 400, peak_at=0.35))
save("whip", whoosh(0.35, 600, 6000, peak_at=0.55, width=0.5))
save("swoosh-low", whoosh(0.9, 120, 1500, peak_at=0.5, width=1.0))
save("impact", impact())
save("riser", riser())

# ---------------- Música ----------------
# Mezcla pensada para parlantes de celular: casi nada bajo 150 Hz se oye ahí, así que
# el peso está en medios y agudos (melodía, arpegio, pad brillante, hi-hats, palmas)
# y el bajo y el bombo llevan armónicos que sí suenan en un teléfono.

BPM = 120
BEAT = 60 / BPM
DUR = 901 / 30 + 1.5  # duración del video + cola
N = int(DUR * SR)
L = np.zeros(N)
R = np.zeros(N)


def note_hz(m):
    return 440 * 2 ** ((m - 69) / 12)


def add(buf, start_s, sig, gain=1.0):
    i = int(start_s * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i] * gain


def tone(freq, dur, harmonics, decay=None, detune=0.0, vibrato=0.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    phase = 2 * np.pi * freq * (1 + detune) * (t + vibrato * np.sin(2 * np.pi * 5.5 * t) / (2 * np.pi * 5.5))
    y = np.zeros(n)
    for k, a in harmonics:
        if freq * k < 16000:
            y += a * np.sin(phase * k)
    if decay is not None:
        y *= np.exp(-t * decay)
    a = min(n, int(0.004 * SR))
    y[:a] *= np.linspace(0, 1, a)
    y[-a:] *= np.linspace(1, 0, a)
    return y


SAW = [(k, 1 / k) for k in range(1, 24)]
SQUARE = [(k, 1 / k) for k in range(1, 24, 2)]
PLUCK = [(1, 1.0), (2, 0.5), (3, 0.35), (4, 0.2), (5, 0.12), (6, 0.08)]

# Progresión I–V–vi–IV en Fa mayor, un compás por acorde.
CHORDS = [
    (53, [65, 69, 72]),  # F
    (48, [64, 67, 72]),  # C
    (50, [65, 69, 74]),  # Dm
    (46, [65, 70, 74]),  # Bb
]
# Melodía en corcheas (None = silencio), un compás por acorde.
MELODY = [
    [77, None, 76, 77, None, 72, None, 74],
    [76, None, 74, 72, None, 67, None, 72],
    [74, None, 72, 74, None, 77, None, 81],
    [79, None, 77, 74, None, 72, 74, None],
]
BAR = 4 * BEAT

GROOVE_START = 2.5  # entra el ritmo con el logo
MELODY_START = 4.4  # entra la melodía con el registro rápido
OUTRO_START = 26.0  # escena de cierre
END = 901 / 30

kick_times = []
t0 = 0.0
bar = 0
while t0 < END + 0.5:
    root, triad = CHORDS[bar % 4]
    # Pad brillante, una octava arriba, con leve desafinación entre canales.
    for m in triad:
        env_len = int((BAR + 0.3) * SR)
        env = np.minimum(1, np.arange(env_len) / (0.2 * SR))
        add(L, t0, tone(note_hz(m + 12), BAR + 0.3, SAW) * env, 0.045)
        add(R, t0, tone(note_hz(m + 12), BAR + 0.3, SAW, detune=0.004) * env, 0.045)
    for b in range(4):
        tb = t0 + b * BEAT
        if tb >= END + 0.3:
            break
        in_groove = GROOVE_START - 0.01 <= tb < OUTRO_START
        if in_groove or (OUTRO_START <= tb < OUTRO_START + 2 * BEAT):
            kick_times.append(tb)
        if in_groove:
            # Bajo en corcheas, una octava más arriba que antes y con armónicos de sierra.
            for e in range(2):
                m = root + (12 if e == 1 and b % 2 == 1 else 0)
                bass = tone(note_hz(m), BEAT / 2 * 0.85, SAW[:12], decay=5)
                add(L, tb + e * BEAT / 2, bass, 0.10)
                add(R, tb + e * BEAT / 2, bass, 0.10)
        # Arpegio en semicorcheas, dos octavas arriba.
        arp_gain = 0.10 if in_groove else 0.08
        for s16 in range(4):
            m = triad[[0, 1, 2, 1][s16]] + 12
            pl = tone(note_hz(m), 0.3, PLUCK, decay=12)
            pan = 0.55 + 0.45 * (s16 % 2)
            add(L, tb + s16 * BEAT / 4, pl, arp_gain * pan)
            add(R, tb + s16 * BEAT / 4, pl, arp_gain * (1.55 - pan))
        # Melodía principal.
        if MELODY_START - 0.01 <= tb < OUTRO_START + 4 * BEAT:
            for e in range(2):
                m = MELODY[bar % 4][b * 2 + e]
                if m is None:
                    continue
                ld = tone(note_hz(m), BEAT * 0.9, SQUARE, decay=3.5, vibrato=0.004)
                add(L, tb + e * BEAT / 2, ld, 0.075)
                add(R, tb + e * BEAT / 2, ld, 0.075)
    t0 += BAR
    bar += 1


def hp_noise(n, smooth=2):
    x = rng.standard_normal(n + smooth)
    c = np.cumsum(x)
    lp = (c[smooth:] - c[:-smooth]) / smooth
    return x[smooth:] - lp


# Bombo: cuerpo grave + "click" de ataque que se oye en parlantes chicos.
for tk in kick_times:
    n = int(0.4 * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * np.cumsum(60 + 140 * np.exp(-t * 30)) / SR) * np.exp(-t * 9)
    click = hp_noise(n, 3) * np.exp(-t * 180) * 0.6
    k = np.tanh((body + click) * 2.2)
    add(L, tk, k, 0.24)
    add(R, tk, k, 0.24)

t = GROOVE_START
beat_i = 0
while t < OUTRO_START:
    # Hi-hats en corcheas (el contratiempo más fuerte).
    for e in range(2):
        n = int(0.05 * SR)
        hh = hp_noise(n, 2) * np.exp(-np.arange(n) / SR * 80)
        g = 0.09 if e == 1 else 0.045
        add(L, t + e * BEAT / 2, hh, g * 0.9)
        add(R, t + e * BEAT / 2, hh, g * 1.1)
    # Palmas en 2 y 4.
    if beat_i % 2 == 1:
        n = int(0.18 * SR)
        cl = hp_noise(n, 6) * np.exp(-np.arange(n) / SR * 20)
        add(L, t, cl, 0.13)
        add(R, t, cl, 0.13)
    t += BEAT
    beat_i += 1

# "Sidechain": baja el resto en cada bombo para que respire.
duck = np.ones(N)
for tk in kick_times:
    i = int(tk * SR)
    n = int(0.22 * SR)
    curve = 1 - 0.35 * np.exp(-np.arange(n) / SR * 14)
    j = min(N, i + n)
    duck[i:j] = np.minimum(duck[i:j], curve[: j - i])
L *= duck
R *= duck

t = np.arange(N) / SR
fade = np.clip(t / 0.8, 0, 1) * np.clip((END + 1.2 - t) / 2.0, 0, 1)
mix = np.stack([L * fade, R * fade], axis=1)
mix = np.tanh(mix / np.max(np.abs(mix)) * 1.2)
save("kontrola-beat", mix)
print("ok", DUR)
