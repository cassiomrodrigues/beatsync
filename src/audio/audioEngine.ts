import { BeatState, SoundType } from '../types';
import * as Haptics from 'expo-haptics';
import * as KeepAwake from 'expo-keep-awake';
import { Platform } from 'react-native';

// Screen Wake Lock helper for browsers / PWA (keeps display awake on stage & rehearsal)
let wakeLockSentinel: any = null;

async function requestScreenWakeLock() {
  try {
    await KeepAwake.activateKeepAwakeAsync('beatsync-playback');
  } catch {}

  if (typeof navigator !== 'undefined' && 'wakeLock' in (navigator as any)) {
    try {
      wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      wakeLockSentinel.addEventListener('release', () => {
        wakeLockSentinel = null;
      });
    } catch {}
  }
}

async function releaseScreenWakeLock() {
  try {
    KeepAwake.deactivateKeepAwake('beatsync-playback');
  } catch {}

  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
    } catch {}
    wakeLockSentinel = null;
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && audioEngine.getIsRunning()) {
      requestScreenWakeLock();
    }
  });
}

class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private isRunning: boolean = false;
  private bpm: number = 120;
  private numerator: number = 4;
  private denominator: number = 4;
  private subdivision: number = 1;
  private soundType: SoundType = 'woodblock';
  private volume: number = 0.8;
  private isMuted: boolean = false;
  private hapticsEnabled: boolean = true;
  private accentPattern: BeatState[] = ['accent', 'normal', 'normal', 'normal'];

  // Scheduling state
  private currentBeatInMeasure: number = 0;
  private currentSubdivisionIndex: number = 0;
  private nextNoteTime: number = 0;
  private timerId: any = null;
  private lookaheadMs: number = 25; // How frequently to call scheduling (ms)
  private scheduleAheadTimeSec: number = 0.1; // How far ahead to schedule audio (sec)

  // Callbacks for visual feedback
  public onBeatCallback: ((beatIndex: number, isDownbeat: boolean, beatState: BeatState) => void) | null = null;
  public onSubdivisionCallback: ((subIndex: number) => void) | null = null;

  constructor() {
    // Lazy init audio context on first user gesture
  }

  private initContextIfNeeded() {
    if (!this.audioCtx) {
      const AudioCtxClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public updateParameters(params: {
    bpm?: number;
    numerator?: number;
    denominator?: number;
    subdivision?: number;
    soundType?: SoundType;
    volume?: number;
    isMuted?: boolean;
    hapticsEnabled?: boolean;
    accentPattern?: BeatState[];
  }) {
    if (params.bpm !== undefined) this.bpm = Math.max(20, Math.min(320, params.bpm));
    if (params.numerator !== undefined) this.numerator = Math.max(1, params.numerator);
    if (params.denominator !== undefined) this.denominator = params.denominator;
    if (params.subdivision !== undefined) this.subdivision = Math.max(1, Math.min(4, params.subdivision));
    if (params.soundType !== undefined) this.soundType = params.soundType;
    if (params.volume !== undefined) this.volume = Math.max(0, Math.min(1, params.volume));
    if (params.isMuted !== undefined) this.isMuted = params.isMuted;
    if (params.hapticsEnabled !== undefined) this.hapticsEnabled = params.hapticsEnabled;
    if (params.accentPattern !== undefined) {
      this.accentPattern = params.accentPattern;
    }
  }

  public start() {
    if (this.isRunning) return;
    this.initContextIfNeeded();
    this.isRunning = true;
    this.currentBeatInMeasure = 0;
    this.currentSubdivisionIndex = 0;

    // Keep screen awake while player is running (crucial for live stage and rehearsals)
    requestScreenWakeLock();

    if (this.audioCtx) {
      this.nextNoteTime = this.audioCtx.currentTime + 0.05;
    } else {
      this.nextNoteTime = performance.now() / 1000 + 0.05;
    }

    this.timerId = setInterval(() => this.scheduler(), this.lookaheadMs);
  }

  public stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.currentBeatInMeasure = 0;
    this.currentSubdivisionIndex = 0;

    // Release screen wake lock when stopped
    releaseScreenWakeLock();
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  private scheduler() {
    if (!this.isRunning) return;

    const currentTime = this.audioCtx ? this.audioCtx.currentTime : performance.now() / 1000;

    while (this.nextNoteTime < currentTime + this.scheduleAheadTimeSec) {
      this.scheduleNote(
        this.currentBeatInMeasure,
        this.currentSubdivisionIndex,
        this.nextNoteTime
      );
      this.advanceNote();
    }
  }

  private advanceNote() {
    // Calculate interval in seconds for one subdivision
    // Quarter note time = 60 / bpm
    // If denominator is 8 (e.g. 6/8), beat unit is eighth note
    const beatUnit = 4 / this.denominator;
    const secondsPerBeat = (60.0 / this.bpm) * beatUnit;
    const secondsPerSubdivision = secondsPerBeat / this.subdivision;

    this.nextNoteTime += secondsPerSubdivision;

    this.currentSubdivisionIndex++;
    if (this.currentSubdivisionIndex >= this.subdivision) {
      this.currentSubdivisionIndex = 0;
      this.currentBeatInMeasure++;
      if (this.currentBeatInMeasure >= this.numerator) {
        this.currentBeatInMeasure = 0;
      }
    }
  }

  private scheduleNote(beatNumber: number, subIndex: number, time: number) {
    const isMainBeat = subIndex === 0;
    const isDownbeat = beatNumber === 0 && isMainBeat;
    const beatState = this.accentPattern[beatNumber] || (isDownbeat ? 'accent' : 'normal');

    // If muted beat state, skip sound
    const shouldPlaySound = !this.isMuted && beatState !== 'mute';

    if (shouldPlaySound && this.audioCtx) {
      this.synthesizeSound(beatState, isMainBeat, isDownbeat, time);
    }

    // Trigger visual/haptic callbacks at precise time
    const delayMs = Math.max(0, (time - (this.audioCtx ? this.audioCtx.currentTime : performance.now() / 1000)) * 1000);

    setTimeout(() => {
      if (!this.isRunning) return;

      if (isMainBeat) {
        if (this.onBeatCallback) {
          this.onBeatCallback(beatNumber, isDownbeat, beatState);
        }
        if (this.hapticsEnabled && Platform.OS !== 'web') {
          if (isDownbeat) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
          } else if (beatState === 'accent') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }
        }
      }

      if (this.onSubdivisionCallback) {
        this.onSubdivisionCallback(subIndex);
      }
    }, delayMs);
  }

  private synthesizeSound(
    beatState: BeatState,
    isMainBeat: boolean,
    isDownbeat: boolean,
    time: number
  ) {
    if (!this.audioCtx) return;

    let baseFreq = 800;
    let gainMultiplier = this.volume;

    if (!isMainBeat) {
      // Subdivision tick
      gainMultiplier *= 0.35;
      baseFreq = 440;
    } else if (isDownbeat || beatState === 'accent') {
      gainMultiplier *= 1.25;
      baseFreq = 1200;
    } else if (beatState === 'ghost') {
      gainMultiplier *= 0.25;
      baseFreq = 600;
    } else {
      // Normal beat
      gainMultiplier *= 0.85;
      baseFreq = 800;
    }

    switch (this.soundType) {
      case 'beep':
        this.playBeep(baseFreq, gainMultiplier, time);
        break;
      case 'woodblock':
        this.playWoodblock(baseFreq, gainMultiplier, time);
        break;
      case 'rimshot':
        this.playRimshot(gainMultiplier, time, isDownbeat);
        break;
      case 'mechanical':
        this.playMechanical(gainMultiplier, time, isDownbeat);
        break;
      default:
        this.playWoodblock(baseFreq, gainMultiplier, time);
    }
  }

  private playBeep(frequency: number, gainLevel: number, time: number) {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, time);

    gainNode.gain.setValueAtTime(0.001, time);
    gainNode.gain.linearRampToValueAtTime(gainLevel * 0.9, time + 0.003);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);

    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    osc.start(time);
    osc.stop(time + 0.07);
  }

  private playWoodblock(frequency: number, gainLevel: number, time: number) {
    if (!this.audioCtx) return;

    // Fundamental oscillator
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, time);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.4, time + 0.04);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(frequency, time);
    filter.Q.setValueAtTime(5.0, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(gainLevel * 1.0, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(time);
    osc.stop(time + 0.06);
  }

  private playRimshot(gainLevel: number, time: number, isDownbeat: boolean) {
    if (!this.audioCtx) return;

    // Body tone
    const osc = this.audioCtx.createOscillator();
    const oscGain = this.audioCtx.createGain();
    const freq = isDownbeat ? 620 : 480;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.03);

    oscGain.gain.setValueAtTime(0.001, time);
    oscGain.gain.linearRampToValueAtTime(gainLevel * 0.8, time + 0.002);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);

    osc.connect(oscGain);
    oscGain.connect(this.audioCtx.destination);
    osc.start(time);
    osc.stop(time + 0.05);

    // Noise burst for crisp click
    const bufferSize = this.audioCtx.sampleRate * 0.02;
    const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.audioCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const noiseFilter = this.audioCtx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(2500, time);

    const noiseGain = this.audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.001, time);
    noiseGain.gain.linearRampToValueAtTime(gainLevel * 0.7, time + 0.001);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.025);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.audioCtx.destination);

    whiteNoise.start(time);
    whiteNoise.stop(time + 0.03);
  }

  private playMechanical(gainLevel: number, time: number, isDownbeat: boolean) {
    if (!this.audioCtx) return;

    // Double-click sound of escapement
    const freq1 = isDownbeat ? 1400 : 950;
    const osc1 = this.audioCtx.createOscillator();
    const gain1 = this.audioCtx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq1, time);
    osc1.frequency.exponentialRampToValueAtTime(freq1 * 0.3, time + 0.015);

    gain1.gain.setValueAtTime(0.001, time);
    gain1.gain.linearRampToValueAtTime(gainLevel * 0.9, time + 0.001);
    gain1.gain.exponentialRampToValueAtTime(0.0001, time + 0.02);

    osc1.connect(gain1);
    gain1.connect(this.audioCtx.destination);
    osc1.start(time);
    osc1.stop(time + 0.025);
  }

  public playSinglePreviewSound(type: SoundType) {
    this.initContextIfNeeded();
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime + 0.01;
    const prevType = this.soundType;
    this.soundType = type;
    this.synthesizeSound('accent', true, true, now);
    this.soundType = prevType;
  }
}

export const audioEngine = new AudioEngine();
