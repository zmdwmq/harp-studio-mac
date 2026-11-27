/**
 * YIN 实时音高检测算法（纯 TypeScript，零平台依赖）
 * 适用于 100Hz - 3500Hz 口琴单音与压音检测
 */

export interface YinResult {
  frequency: number;
  confidence: number;
}

export function detectPitchYin(
  buffer: Float32Array,
  sampleRate: number,
  threshold = 0.15
): YinResult | null {
  const halfLen = Math.floor(buffer.length / 2);
  if (halfLen < 64) return null;

  // 1. 计算均方根音量，静音直接返回 null
  let rms = 0;
  for (let i = 0; i < buffer.length; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / buffer.length);
  if (rms < 0.008) return null;

  const yinBuffer = new Float32Array(halfLen);

  // 2. 差分函数 d(tau)
  for (let tau = 0; tau < halfLen; tau++) {
    let sum = 0;
    for (let i = 0; i < halfLen; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    yinBuffer[tau] = sum;
  }

  // 3. 累积均值归一化差分函数 CMNDF
  yinBuffer[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < halfLen; tau++) {
    runningSum += yinBuffer[tau];
    yinBuffer[tau] = runningSum > 0 ? (yinBuffer[tau] * tau) / runningSum : 1;
  }

  // 4. 搜索第一个低于阈值的局部极小值
  const minTau = Math.max(2, Math.floor(sampleRate / 3500));
  const maxTau = Math.min(halfLen - 2, Math.floor(sampleRate / 90));

  let tauEstimate = -1;
  for (let tau = minTau; tau < maxTau; tau++) {
    if (yinBuffer[tau] < threshold) {
      while (tau + 1 < maxTau && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau++;
      }
      tauEstimate = tau;
      break;
    }
  }

  if (tauEstimate === -1) return null;

  // 5. 抛物线插值提高亚采样精度
  const x0 = tauEstimate > 0 ? tauEstimate - 1 : tauEstimate;
  const x2 = tauEstimate + 1 < halfLen ? tauEstimate + 1 : tauEstimate;
  let betterTau = tauEstimate;

  if (x0 !== tauEstimate && x2 !== tauEstimate) {
    const s0 = yinBuffer[x0];
    const s1 = yinBuffer[tauEstimate];
    const s2 = yinBuffer[x2];
    const denom = 2 * (2 * s1 - s2 - s0);
    if (Math.abs(denom) > 1e-6) {
      betterTau = tauEstimate + (s2 - s0) / denom;
    }
  }

  const frequency = sampleRate / betterTau;
  const confidence = Math.max(0, Math.min(1, 1 - yinBuffer[tauEstimate]));
  return { frequency, confidence };
}
