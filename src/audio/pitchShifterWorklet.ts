/**
 * 立体声颗粒移调 AudioWorklet（支持实时 AudioContext 与离线 OfflineAudioContext）
 * 将移调（pitchFactor）与变速（playbackRate）彻底解耦：
 * - playbackRate = tempoRate
 * - pitchFactor = 2^(semitones/12) / tempoRate
 * 当 pitchFactor ≈ 1.0 时自动直通（零音损）
 */

const WORKLET_CODE = `
class PitchShifterProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'pitchFactor', defaultValue: 1.0, minValue: 0.25, maxValue: 4.0, automationRate: 'k-rate' }
    ];
  }

  constructor() {
    super();
    this.bufSize = 8192;
    this.windowSize = 2048;
    this.buffers = [new Float32Array(this.bufSize), new Float32Array(this.bufSize)];
    this.writeIdx = 0;
    this.phase = 0;
  }

  readInterpolated(buf, idx) {
    const size = this.bufSize;
    let i0 = Math.floor(idx);
    const frac = idx - i0;
    i0 = ((i0 % size) + size) % size;
    const i1 = (i0 + 1) % size;
    return buf[i0] * (1 - frac) + buf[i1] * frac;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || input.length === 0 || !output || output.length === 0) {
      return true;
    }

    const factor = parameters.pitchFactor[0];
    const numChannels = Math.min(2, Math.max(input.length, output.length));
    const frameCount = output[0].length;

    // 接近 1.0 时直通，避免任何相位/颗粒染色
    if (Math.abs(factor - 1.0) < 0.002) {
      for (let ch = 0; ch < output.length; ch++) {
        const src = input[Math.min(ch, input.length - 1)];
        const dst = output[ch];
        for (let i = 0; i < frameCount; i++) {
          this.buffers[Math.min(ch, 1)][(this.writeIdx + i) % this.bufSize] = src[i];
          dst[i] = src[i];
        }
      }
      this.writeIdx = (this.writeIdx + frameCount) % this.bufSize;
      return true;
    }

    const win = this.windowSize;
    // 相位步进速率：当 factor > 1（升调），读指针相对写指针加速追赶
    const phaseStep = (1 - factor) / win;

    for (let i = 0; i < frameCount; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const src = input[Math.min(ch, input.length - 1)];
        this.buffers[ch][this.writeIdx] = src[i];
      }

      const p1 = this.phase;
      const p2 = (this.phase + 0.5) % 1.0;

      // 三角交叉淡化窗（能量恒定）
      const w1 = 1 - Math.abs(2 * p1 - 1);
      const w2 = 1 - Math.abs(2 * p2 - 1);

      const delay1 = p1 * win + 32;
      const delay2 = p2 * win + 32;

      for (let ch = 0; ch < output.length; ch++) {
        const buf = this.buffers[Math.min(ch, 1)];
        const s1 = this.readInterpolated(buf, this.writeIdx - delay1);
        const s2 = this.readInterpolated(buf, this.writeIdx - delay2);
        output[ch][i] = s1 * w1 + s2 * w2;
      }

      this.writeIdx = (this.writeIdx + 1) % this.bufSize;
      this.phase = ((this.phase + phaseStep) % 1.0 + 1.0) % 1.0;
    }

    return true;
  }
}

registerProcessor('pitch-shifter-processor', PitchShifterProcessor);
`;

let cachedWorkletUrl: string | null = null;
const registeredContexts = new WeakSet<BaseAudioContext>();

function getWorkletBlobUrl(): string {
  if (!cachedWorkletUrl) {
    const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
    cachedWorkletUrl = URL.createObjectURL(blob);
  }
  return cachedWorkletUrl;
}

export async function ensurePitchShifterWorklet(ctx: BaseAudioContext): Promise<boolean> {
  if (registeredContexts.has(ctx)) return true;
  if (!('audioWorklet' in ctx) || !ctx.audioWorklet) return false;
  try {
    await ctx.audioWorklet.addModule(getWorkletBlobUrl());
    registeredContexts.add(ctx);
    return true;
  } catch {
    return false;
  }
}

export function createPitchShifterNode(
  ctx: BaseAudioContext,
  tempoRate: number,
  semitones: number
): AudioWorkletNode | null {
  if (!registeredContexts.has(ctx)) return null;
  const node = new AudioWorkletNode(ctx, 'pitch-shifter-processor', {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [2],
  });
  updatePitchShifterParams(node, tempoRate, semitones);
  return node;
}

export function updatePitchShifterParams(
  node: AudioWorkletNode,
  tempoRate: number,
  semitones: number
): void {
  const param = node.parameters.get('pitchFactor');
  if (!param) return;
  const targetPitchRatio = Math.pow(2, semitones / 12) / Math.max(0.25, tempoRate);
  param.value = Math.max(0.25, Math.min(4.0, targetPitchRatio));
}
