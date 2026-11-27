/**
 * 纯 TypeScript 录音前端噪声门（Noise Gate）
 * 平滑过滤呼吸底噪、风扇声与环境底噪，支持可调阈值与保持/释放包络防止咔哒声
 */

export class NoiseGateProcessor {
  private enabled = false;
  private thresholdDb = -45;
  private gateGain = 1;
  private env = 0;
  private holdSamplesLeft = 0;

  configure(enabled: boolean, thresholdDb: number): void {
    this.enabled = enabled;
    this.thresholdDb = Math.max(-70, Math.min(-15, thresholdDb));
    if (!enabled) {
      this.gateGain = 1;
      this.env = 0;
      this.holdSamplesLeft = 0;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getThresholdDb(): number {
    return this.thresholdDb;
  }

  reset(): void {
    this.gateGain = this.enabled ? 0 : 1;
    this.env = 0;
    this.holdSamplesLeft = 0;
  }

  process(input: Float32Array, sampleRate: number): Float32Array {
    if (!this.enabled || input.length === 0) return input;

    const out = new Float32Array(input.length);
    const thresholdLin = Math.pow(10, this.thresholdDb / 20);
    const holdSamples = Math.max(1, Math.floor(sampleRate * 0.045));
    const attackCoeff = Math.exp(-1 / Math.max(1, sampleRate * 0.004));
    const releaseCoeff = Math.exp(-1 / Math.max(1, sampleRate * 0.08));
    const envCoeff = Math.exp(-1 / Math.max(1, sampleRate * 0.01));

    for (let i = 0; i < input.length; i++) {
      const s = input[i];
      const absS = Math.abs(s);
      this.env = envCoeff * this.env + (1 - envCoeff) * absS;

      if (this.env >= thresholdLin) {
        this.holdSamplesLeft = holdSamples;
        this.gateGain = attackCoeff * this.gateGain + (1 - attackCoeff) * 1.0;
      } else if (this.holdSamplesLeft > 0) {
        this.holdSamplesLeft--;
        this.gateGain = attackCoeff * this.gateGain + (1 - attackCoeff) * 1.0;
      } else {
        this.gateGain = releaseCoeff * this.gateGain;
      }

      out[i] = s * this.gateGain;
    }
    return out;
  }
}
