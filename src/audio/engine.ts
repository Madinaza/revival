/** Synthesised V8 idle. No samples, so there is nothing to license. Starts only from a user gesture. */
export class Engine {
  private ctx: AudioContext | null = null
  private out: GainNode | null = null
  private rate: AudioParam | null = null
  async start() {
    if (!this.ctx) this.build()
    await this.ctx!.resume()
    const t = this.ctx!.currentTime
    this.out!.gain.cancelScheduledValues(t); this.out!.gain.setTargetAtTime(0.16, t, 0.25)
    this.rate!.cancelScheduledValues(t); this.rate!.setValueAtTime(0.35, t); this.rate!.linearRampToValueAtTime(2.1, t + 0.5); this.rate!.setTargetAtTime(1, t + 0.6, 0.5)
  }
  rev() { if (!this.ctx || !this.rate) return; const t = this.ctx.currentTime; this.rate.cancelScheduledValues(t); this.rate.setTargetAtTime(2.9, t, 0.16); this.rate.setTargetAtTime(1, t + 0.7, 0.6) }
  stop() { if (!this.ctx || !this.out) return; const c = this.ctx; this.out.gain.setTargetAtTime(0, c.currentTime, 0.15); setTimeout(() => void c.suspend(), 700) }
  private build() {
    const c = (this.ctx = new AudioContext()), sr = c.sampleRate
    // One loop = 4 crank cycles at 700 rpm idle. Uneven bank spacing gives the cross-plane burble.
    const cyc = 120 / 700, len = Math.floor(sr * cyc * 4), buf = c.createBuffer(1, len, sr), d = buf.getChannelData(0)
    const order = [0, 0.97, 2.06, 2.95, 4.08, 4.94, 6.04, 7.02], amp = [1, 0.72, 0.94, 0.8, 1, 0.66, 0.9, 0.78]
    for (let k = 0; k < 4; k++) order.forEach((o, i) => {
      const s0 = Math.floor((k + o / 8) * cyc * sr), a = amp[i] * (0.9 + Math.random() * 0.2)
      for (let n = 0; n < sr * 0.09; n++) { const t = n / sr; d[(s0 + n) % len] += a * Math.exp(-t * 42) * (Math.sin(2 * Math.PI * 62 * t) + 0.5 * Math.sin(2 * Math.PI * 118 * t + 0.4) + 0.35 * (Math.random() * 2 - 1) * Math.exp(-t * 60)) }
    })
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true; this.rate = src.playbackRate
    const shape = c.createWaveShaper(); shape.curve = Float32Array.from({ length: 1024 }, (_, i) => Math.tanh((i / 512 - 1) * 2.2))
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 620
    const body = c.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 95; body.gain.value = 7
    this.out = c.createGain(); this.out.gain.value = 0
    src.connect(shape).connect(lp).connect(body).connect(this.out).connect(c.destination); src.start()
  }
}
export const engine = new Engine()
