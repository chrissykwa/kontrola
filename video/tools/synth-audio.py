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


def tone(freq, dur, harmonics, decay=None, detune=0.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for k, a in harmonics:
        y += a * np.sin(2 * np.pi * freq * k * (1 + detune) * t)
    if decay is not None:
        y *= np.exp(-t * decay)
    # ataque y salida suaves para evitar clics
    a = min(n, int(0.004 * SR))
    y[:a] *= np.linspace(0, 1, a)
    y[-a:] *= np.linspace(1, 0, a)
    return y


SAW = [(k, 1 / k * np.exp(-k / 5)) for k in range(1, 14)]
SOFT = [(1, 1.0), (2, 0.35), (3, 0.12)]

# Progresión I–V–vi–IV en Fa mayor, un compás (4 tiempos) por acorde.
CHORDS = [
    (53, [65, 69, 72]),  # F
    (48, [64, 67, 72]),  # C
    (50, [65, 69, 74]),  # Dm
    (46, [65, 70, 74]),  # Bb
]
BAR = 4 * BEAT

# Secciones (segundos): intro suave, groove, cierre.
GROOVE_START = 2.5  # entra el bombo con el logo
OUTRO_START = 26.0  # escena de cierre
END = 901 / 30

kick_times = []
t0 = 0.0
bar = 0
while t0 < END + 0.5:
    root, triad = CHORDS[bar % 4]
    # Pad: tríada con armónicos suaves y leve desafinación entre canales.
    for m in triad:
        pad = tone(note_hz(m), BAR + 0.3, SAW)
        env = np.minimum(1, np.arange(len(pad)) / (0.25 * SR))
        add(L, t0, pad * env, 0.06)
        add(R, t0, tone(note_hz(m), BAR + 0.3, SAW, detune=0.003) * env, 0.06)
    for b in range(4):
        tb = t0 + b * BEAT
        if tb >= END + 0.3:
            break
        in_groove = GROOVE_START - 0.01 <= tb < OUTRO_START
        if in_groove or (tb >= OUTRO_START and tb < OUTRO_START + 2 * BEAT):
            kick_times.append(tb)
        if in_groove:
            # Bajo en corcheas, con la raíz y su octava.
            for e in range(2):
                m = root - 12 + (12 if e == 1 and b % 2 == 1 else 0)
                bass = tone(note_hz(m), BEAT / 2 * 0.9, SAW[:8], decay=4)
                add(L, tb + e * BEAT / 2, bass, 0.32)
                add(R, tb + e * BEAT / 2, bass, 0.32)
        # Arpegio en semicorcheas (más suave en la intro y el cierre).
        arp_gain = 0.11 if in_groove else 0.07
        pattern = [0, 1, 2, 1]
        for s in range(4):
            m = triad[pattern[s]] + 12
            pl = tone(note_hz(m), 0.35, SOFT, decay=14)
            pan = 0.6 + 0.4 * (s % 2)
            add(L, tb + s * BEAT / 4, pl, arp_gain * pan)
            add(R, tb + s * BEAT / 4, pl, arp_gain * (1.6 - pan))
    t0 += BAR
    bar += 1

# Batería
for tk in kick_times:
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    k = np.sin(2 * np.pi * np.cumsum(48 + 110 * np.exp(-t * 28)) / SR) * np.exp(-t * 7)
    add(L, tk, np.tanh(k * 1.5), 0.55)
    add(R, tk, np.tanh(k * 1.5), 0.55)

def hp_noise(n, smooth=8):
    x = rng.standard_normal(n + smooth)
    c = np.cumsum(x)
    lp = (c[smooth:] - c[:-smooth]) / smooth
    return x[smooth:] - lp

t = GROOVE_START
beat_i = 0
while t < OUTRO_START:
    # Hi-hat en contratiempo
    n = int(0.06 * SR)
    hh = hp_noise(n, 4) * np.exp(-np.arange(n) / SR * 70)
    add(L, t + BEAT / 2, hh, 0.07)
    add(R, t + BEAT / 2, hh, 0.09)
    # Palmas en 2 y 4
    if beat_i % 2 == 1:
        n = int(0.2 * SR)
        cl = hp_noise(n, 20) * np.exp(-np.arange(n) / SR * 22)
        add(L, t, cl, 0.16)
        add(R, t, cl, 0.16)
    t += BEAT
    beat_i += 1

# "Sidechain": baja el volumen del resto en cada bombo para que respire.
duck = np.ones(N)
for tk in kick_times:
    i = int(tk * SR)
    n = int(0.25 * SR)
    curve = 1 - 0.45 * np.exp(-np.arange(n) / SR * 14)
    j = min(N, i + n)
    duck[i:j] = np.minimum(duck[i:j], curve[: j - i])
L *= duck
R *= duck

# Fundido de entrada y salida.
t = np.arange(N) / SR
fade = np.clip(t / 0.8, 0, 1) * np.clip((END + 1.2 - t) / 2.0, 0, 1)
mix = np.stack([L * fade, R * fade], axis=1)
mix = np.tanh(mix / np.max(np.abs(mix)) * 1.3)
save("kontrola-beat", mix)
print("ok", DUR)
