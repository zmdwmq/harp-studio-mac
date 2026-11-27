import { Mp3Encoder } from '@breezystack/lamejs';

/**
 * 纯 TypeScript / JS 320kbps MP3 编码器（跨平台零原生依赖）
 */
export function encodeMp3(
  channels: Float32Array[],
  sampleRate: number,
  kbps = 320
): Uint8Array {
  const numChannels = Math.min(2, Math.max(1, channels.length));
  const leftF = channels[0];
  const rightF = numChannels === 2 ? channels[1] : channels[0];
  const length = leftF?.length ?? 0;

  const toInt16 = (src: Float32Array): Int16Array => {
    const out = new Int16Array(src.length);
    for (let i = 0; i < src.length; i++) {
      const s = Math.max(-1, Math.min(1, src[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  };

  const left = toInt16(leftF);
  const right = numChannels === 2 ? toInt16(rightF) : undefined;
  const encoder = new Mp3Encoder(numChannels, sampleRate, kbps);

  const chunkSize = 1152;
  const chunks: Uint8Array[] = [];

  for (let i = 0; i < length; i += chunkSize) {
    const lChunk = left.subarray(i, i + chunkSize);
    const mp3buf =
      numChannels === 2 && right
        ? encoder.encodeBuffer(lChunk, right.subarray(i, i + chunkSize))
        : encoder.encodeBuffer(lChunk);
    if (mp3buf.length > 0) {
      chunks.push(new Uint8Array(mp3buf));
    }
  }

  const endBuf = encoder.flush();
  if (endBuf.length > 0) {
    chunks.push(new Uint8Array(endBuf));
  }

  const totalBytes = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalBytes);
  let offset = 0;
  for (const c of chunks) {
    result.set(c, offset);
    offset += c.length;
  }
  return result;
}
