import { DspPreset } from '../core/dspPresets';

export interface DspChainHandle {
  input: AudioNode;
  output: AudioNode;
  applyParams(ctx: BaseAudioContext, preset: DspPreset): void;
}

/** 生成用于 ConvolverNode 的立体声混响脉冲响应 */
export function createReverbImpulse(ctx: BaseAudioContext, decaySec: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(rate * decaySec));
  const impulse = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const env = Math.pow(1 - i / length, 2.4);
      data[i] = (Math.random() * 2 - 1) * env;
    }
  }
  return impulse;
}

/** 生成布鲁斯电子管非对称软削波曲线 */
export function createTubeOverdriveCurve(amount: number): Float32Array<ArrayBuffer> {
  const samples = 1024;
  const buffer = new ArrayBuffer(samples * 4);
  const curve = new Float32Array(buffer);
  const k = amount * 40;
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    if (k <= 0.01) {
      curve[i] = x;
    } else {
      const bias = x >= 0 ? x : x * 1.15;
      curve[i] = ((1 + k) * bias) / (1 + k * Math.abs(bias));
    }
  }
  return curve;
}

/** 构建口琴专属 6 级实时/离线 DSP 效果链 */
export function createDspChain(ctx: BaseAudioContext, initialPreset: DspPreset): DspChainHandle {
  const highPass = ctx.createBiquadFilter();
  highPass.type = 'highpass';
  highPass.frequency.value = initialPreset.highPassHz;

  const lowPass = ctx.createBiquadFilter();
  lowPass.type = 'lowpass';
  lowPass.frequency.value = initialPreset.lowPassHz;

  const eqLow = ctx.createBiquadFilter();
  eqLow.type = 'lowshelf';
  eqLow.frequency.value = 220;
  eqLow.gain.value = initialPreset.eqLowDb;

  const eqMid = ctx.createBiquadFilter();
  eqMid.type = 'peaking';
  eqMid.frequency.value = initialPreset.eqMidFreq;
  eqMid.Q.value = 1.2;
  eqMid.gain.value = initialPreset.eqMidDb;

  const eqHigh = ctx.createBiquadFilter();
  eqHigh.type = 'highshelf';
  eqHigh.frequency.value = 6500;
  eqHigh.gain.value = initialPreset.eqHighDb;

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = initialPreset.compThresholdDb;
  comp.ratio.value = initialPreset.compRatio;
  comp.attack.value = 0.01;
  comp.release.value = 0.12;

  const shaper = ctx.createWaveShaper();
  shaper.curve = createTubeOverdriveCurve(initialPreset.overdriveAmount);
  shaper.oversample = '2x';

  const dryGain = ctx.createGain();
  dryGain.gain.value = 1 - initialPreset.reverbWet * 0.5;

  const wetGain = ctx.createGain();
  wetGain.gain.value = initialPreset.reverbWet;

  const convolver = ctx.createConvolver();
  convolver.buffer = createReverbImpulse(ctx, initialPreset.reverbDecaySec);

  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -0.8;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.05;

  highPass.connect(lowPass);
  lowPass.connect(eqLow);
  eqLow.connect(eqMid);
  eqMid.connect(eqHigh);
  eqHigh.connect(comp);
  comp.connect(shaper);

  shaper.connect(dryGain);
  shaper.connect(convolver);
  convolver.connect(wetGain);

  dryGain.connect(limiter);
  wetGain.connect(limiter);

  let lastDecay = initialPreset.reverbDecaySec;

  return {
    input: highPass,
    output: limiter,
    applyParams(targetCtx: BaseAudioContext, p: DspPreset) {
      highPass.frequency.value = p.highPassHz;
      lowPass.frequency.value = p.lowPassHz;
      eqLow.gain.value = p.eqLowDb;
      eqMid.frequency.value = p.eqMidFreq;
      eqMid.gain.value = p.eqMidDb;
      eqHigh.gain.value = p.eqHighDb;
      comp.threshold.value = p.compThresholdDb;
      comp.ratio.value = p.compRatio;
      shaper.curve = createTubeOverdriveCurve(p.overdriveAmount);
      dryGain.gain.value = 1 - p.reverbWet * 0.5;
      wetGain.gain.value = p.reverbWet;
      if (Math.abs(lastDecay - p.reverbDecaySec) > 0.05) {
        convolver.buffer = createReverbImpulse(targetCtx, p.reverbDecaySec);
        lastDecay = p.reverbDecaySec;
      }
    },
  };
}
