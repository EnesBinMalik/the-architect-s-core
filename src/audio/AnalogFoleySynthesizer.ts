/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Analog Foley Synthesizer — "The Architect's Core"
 * Authentic computer lab hardware acoustics synthesized via Web Audio API.
 * Dynamic fans, coil whine, mechanical relays, bit-crushing and terminal foley.
 */

class AnalogFoleySynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private fanGain: GainNode | null = null;
  private fanFilter: BiquadFilterNode | null = null;
  private fanSource: AudioBufferSourceNode | null = null;
  private coilGain: GainNode | null = null;
  private coilOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private droneOsc: OscillatorNode | null = null;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;

  public init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // 1. Procedural Fan Noise (Filtered White Noise with RPM frequency)
      this.setupFanNoise();

      // 2. High-Frequency Electronic Coil Whine
      this.setupCoilWhine();

      // 3. Silicon Ambient Sub-Drone
      this.setupAmbientDrone();

      this.isInitialized = true;
    } catch {
      // AudioContext may require user gesture
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private setupFanNoise() {
    if (!this.ctx || !this.masterGain) return;

    // Generate 2 seconds of procedural pink/white noise buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2 + white * 0.5362) * 0.11;
    }

    this.fanSource = this.ctx.createBufferSource();
    this.fanSource.buffer = noiseBuffer;
    this.fanSource.loop = true;

    this.fanFilter = this.ctx.createBiquadFilter();
    this.fanFilter.type = 'bandpass';
    this.fanFilter.frequency.setValueAtTime(320, this.ctx.currentTime);
    this.fanFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

    this.fanGain = this.ctx.createGain();
    this.fanGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    this.fanSource.connect(this.fanFilter);
    this.fanFilter.connect(this.fanGain);
    this.fanGain.connect(this.masterGain);

    this.fanSource.start();
  }

  private setupCoilWhine() {
    if (!this.ctx || !this.masterGain) return;

    this.coilOsc = this.ctx.createOscillator();
    this.coilOsc.type = 'sawtooth';
    this.coilOsc.frequency.setValueAtTime(7420, this.ctx.currentTime);

    const coilFilter = this.ctx.createBiquadFilter();
    coilFilter.type = 'highpass';
    coilFilter.frequency.setValueAtTime(6000, this.ctx.currentTime);

    this.coilGain = this.ctx.createGain();
    this.coilGain.gain.setValueAtTime(0.015, this.ctx.currentTime);

    this.coilOsc.connect(coilFilter);
    coilFilter.connect(this.coilGain);
    this.coilGain.connect(this.masterGain);

    this.coilOsc.start();
  }

  private setupAmbientDrone() {
    if (!this.ctx || !this.masterGain) return;

    this.droneOsc = this.ctx.createOscillator();
    this.droneOsc.type = 'triangle';
    this.droneOsc.frequency.setValueAtTime(55, this.ctx.currentTime); // 55Hz low hum

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

    this.droneOsc.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);

    this.droneOsc.start();
  }

  /**
   * Update fan RPM and coil whine dynamically based on CPU load and temperature
   */
  public updateHardwareLoad(cpuLoadPct: number, temperatureC: number) {
    if (!this.ctx || !this.isInitialized) return;
    const now = this.ctx.currentTime;

    // Fan pitch increases from 300Hz to 1100Hz with CPU load
    if (this.fanFilter && this.fanGain) {
      const targetFreq = 300 + (cpuLoadPct / 100) * 800 + (temperatureC > 70 ? 250 : 0);
      const targetVolume = 0.05 + (cpuLoadPct / 100) * 0.12;
      this.fanFilter.frequency.setTargetAtTime(targetFreq, now, 0.2);
      this.fanGain.gain.setTargetAtTime(this.isMuted ? 0 : targetVolume, now, 0.2);
    }

    // Coil whine fluctuates with voltage and processing spikes
    if (this.coilOsc && this.coilGain) {
      const coilFreq = 7200 + (cpuLoadPct / 100) * 1400 + Math.sin(now * 5) * 60;
      const coilVol = 0.008 + (cpuLoadPct / 100) * 0.03;
      this.coilOsc.frequency.setTargetAtTime(coilFreq, now, 0.1);
      this.coilGain.gain.setTargetAtTime(this.isMuted ? 0 : coilVol, now, 0.1);
    }
  }

  /**
   * Mechanical key click sound for terminal input
   */
  public playKeystroke() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200 + Math.random() * 300, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.035);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.045);
  }

  /**
   * Mechanical physical relay click (for 0/1 switches & bus couplers)
   */
  public playRelayClick(state: boolean) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(state ? 880 : 440, now);
    osc.frequency.exponentialRampToValueAtTime(state ? 1760 : 220, now + 0.05);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.065);
  }

  /**
   * JIT Compiler execution success (clean high-tech ascending arpeggio)
   */
  public playJitSuccess() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    frequencies.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.09, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.16);
    });
  }

  /**
   * Hardware Fault / Syntax Error / Overheat / Bit-crush burst
   */
  public playSyntaxError() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Harsh saw pulse + noise burst
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.linearRampToValueAtTime(65, now + 0.28);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

    // Distortion shaper
    const waveShaper = this.ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; ++i) {
      const x = (i * 2) / 256 - 1;
      curve[i] = ((3 + 20) * x * 20 * (Math.PI / 180)) / (Math.PI + 20 * Math.abs(x));
    }
    waveShaper.curve = curve;

    osc.connect(waveShaper);
    waveShaper.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.32);
  }

  /**
   * Laser barrier buzz & electric arc
   */
  public playLaserHum() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, now);

    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  /**
   * Teleport / elevator transit sound
   */
  public playBusTransit() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.4);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.48);
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.7, this.ctx.currentTime, 0.05);
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }
}

export const soundEngine = new AnalogFoleySynthesizer();
