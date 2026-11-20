// YUYU Shop Web Audio Synthesizer — zero-latency welcome chime & unique tactile button sounds

type SoundPreset = 'welcome' | 'cart' | 'success' | 'danger' | 'nav' | 'toggle' | 'card' | 'soft';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private lastPlayedAt: number = 0;
  private lastWelcomeAt: number = 0;

  // Pleasant C-major pentatonic frequencies across two octaves for harmonious unique button sounds
  private readonly pentatonicNotes = [
    392.0,  // G4
    440.0,  // A4
    523.25, // C5
    587.33, // D5
    659.25, // E5
    783.99, // G5
    880.0,  // A5
    1046.5, // C6
    1174.66 // D6
  ];

  constructor() {
    try {
      const saved = localStorage.getItem('yuyu_sound_enabled');
      if (saved === 'false') this.enabled = false;
    } catch {}
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean): void {
    this.enabled = val;
    try {
      localStorage.setItem('yuyu_sound_enabled', val ? 'true' : 'false');
    } catch {}
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    options: {
      type?: OscillatorType;
      duration?: number;
      volume?: number;
      delay?: number;
      slideTo?: number;
      harmonic?: number;
    } = {}
  ) {
    const ctx = this.getContext();
    if (!ctx || !this.enabled) return;

    const {
      type = 'sine',
      duration = 0.14,
      volume = 0.12,
      delay = 0,
      slideTo,
      harmonic
    } = options;

    const startTime = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, startTime);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, startTime + duration * 0.85);
    }

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);

    // Optional soft harmonic overtone for glassy/marimba warmth
    if (harmonic) {
      const overtone = ctx.createOscillator();
      const overGain = ctx.createGain();
      overtone.type = 'sine';
      overtone.frequency.setValueAtTime(freq * harmonic, startTime);
      overGain.gain.setValueAtTime(0.0001, startTime);
      overGain.gain.linearRampToValueAtTime(volume * 0.32, startTime + 0.01);
      overGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.75);
      overtone.connect(overGain);
      overGain.connect(ctx.destination);
      overtone.start(startTime);
      overtone.stop(startTime + duration);
    }
  }

  private hashString(str: string): number {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash);
  }

  /** Rich, warm multi-note crystalline welcome chime for login / entering YUYU Shop */
  public playWelcome(): void {
    if (!this.enabled) return;
    const now = performance.now();
    if (now - this.lastWelcomeAt < 1200) return;
    this.lastWelcomeAt = now;
    const notes = [
      { freq: 523.25, delay: 0.0, dur: 0.38, vol: 0.13 },   // C5
      { freq: 659.25, delay: 0.085, dur: 0.42, vol: 0.13 }, // E5
      { freq: 783.99, delay: 0.17, dur: 0.46, vol: 0.14 },  // G5
      { freq: 987.77, delay: 0.255, dur: 0.55, vol: 0.12 }, // B5
      { freq: 1046.5, delay: 0.34, dur: 0.75, vol: 0.15 }   // C6
    ];
    // Warm subtle bass pad underneath
    this.playTone(261.63, { type: 'triangle', duration: 0.85, volume: 0.07, delay: 0 });
    notes.forEach((n) => {
      this.playTone(n.freq, {
        type: 'sine',
        duration: n.dur,
        volume: n.vol,
        delay: n.delay,
        harmonic: 2
      });
    });
  }

  public playPreset(preset: SoundPreset, seed = ''): void {
    if (!this.enabled) return;
    const now = performance.now();
    if (preset !== 'welcome' && now - this.lastPlayedAt < 35) return;
    this.lastPlayedAt = now;

    if (preset === 'welcome') {
      this.playWelcome();
      return;
    }

    const idx = this.hashString(seed || preset) % this.pentatonicNotes.length;
    const baseFreq = this.pentatonicNotes[idx];

    switch (preset) {
      case 'cart': {
        // Bright ascending 2-note pop
        this.playTone(659.25, { type: 'triangle', duration: 0.1, volume: 0.12, harmonic: 2 });
        this.playTone(987.77, { type: 'sine', duration: 0.18, volume: 0.13, delay: 0.065, harmonic: 2 });
        break;
      }
      case 'success': {
        this.playTone(587.33, { type: 'sine', duration: 0.13, volume: 0.12, harmonic: 2 });
        this.playTone(880.0, { type: 'sine', duration: 0.24, volume: 0.13, delay: 0.075, harmonic: 2 });
        break;
      }
      case 'danger': {
        // Soft descending wooden pluck
        this.playTone(392.0, { type: 'triangle', duration: 0.1, volume: 0.1, slideTo: 311.13 });
        this.playTone(293.66, { type: 'sine', duration: 0.14, volume: 0.09, delay: 0.06 });
        break;
      }
      case 'nav': {
        // Resonant marimba tone unique to each navigation tab
        this.playTone(baseFreq, {
          type: 'triangle',
          duration: 0.15,
          volume: 0.11,
          harmonic: 2
        });
        break;
      }
      case 'toggle': {
        // Crisp glass switch tick with distinct pitch per toggle
        this.playTone(baseFreq * 1.15, {
          type: 'sine',
          duration: 0.09,
          volume: 0.1,
          slideTo: baseFreq * 1.32
        });
        break;
      }
      case 'card': {
        // Warm soft kalimba pluck unique to each product/item card
        this.playTone(baseFreq, {
          type: 'sine',
          duration: 0.18,
          volume: 0.1,
          harmonic: 1.5
        });
        break;
      }
      default: {
        // Distinct harmonic click per unique button label
        const waveforms: OscillatorType[] = ['sine', 'triangle'];
        const wave = waveforms[idx % waveforms.length];
        this.playTone(baseFreq, {
          type: wave,
          duration: 0.11,
          volume: 0.1,
          slideTo: baseFreq * 1.08,
          harmonic: idx % 2 === 0 ? 2 : 1.5
        });
        break;
      }
    }
  }

  /** Inspects a clicked DOM element and plays a tailored, unique sound for that specific button */
  public playForElement(el: HTMLElement | null): void {
    if (!this.enabled || !el) return;

    const label = (
      el.getAttribute('aria-label') ||
      el.textContent ||
      el.getAttribute('title') ||
      el.tagName
    )
      .trim()
      .toLowerCase();

    // Avoid overriding login submit welcome chime on the auth submit button
    if (el.getAttribute('data-sound') === 'welcome') {
      this.playWelcome();
      return;
    }

    const explicitPreset = el.getAttribute('data-sound') as SoundPreset | null;
    if (explicitPreset) {
      this.playPreset(explicitPreset, label);
      return;
    }

    if (
      label.includes('savat') ||
      label.includes('xarid') ||
      label.includes("to'lov") ||
      label.includes('rasmiylashtir') ||
      label.includes("qo'shish")
    ) {
      this.playPreset('cart', label);
      return;
    }

    if (
      label.includes("o'chir") ||
      label.includes('chiqish') ||
      label.includes('bekor') ||
      label.includes('tozalash') ||
      label.includes('rad et')
    ) {
      this.playPreset('danger', label);
      return;
    }

    if (
      label.includes('tasdiq') ||
      label.includes('saqlash') ||
      label.includes('nusxala') ||
      label.includes('yuborish')
    ) {
      this.playPreset('success', label);
      return;
    }

    if (
      el.closest('header') ||
      el.closest('nav') ||
      label.includes('asosiy') ||
      label.includes('katalog') ||
      label.includes('qidiruv') ||
      label.includes('buyurtma') ||
      label.includes('kabinet')
    ) {
      this.playPreset('nav', label);
      return;
    }

    if (
      label.includes('rejim') ||
      label.includes('ovoz') ||
      label.includes('mijoz') ||
      label.includes('admin') ||
      label.includes('kun') ||
      label.includes('bugun') ||
      label.includes('hammasi') ||
      label.includes('tovarlar') ||
      label.includes('toifa')
    ) {
      this.playPreset('toggle', label);
      return;
    }

    if (el.tagName === 'ARTICLE' || el.getAttribute('role') === 'button') {
      this.playPreset('card', label);
      return;
    }

    this.playPreset('soft', label);
  }
}

export const soundEngine = new SoundEngine();
