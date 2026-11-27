import { DspPreset, DspPresetId } from './dspPresets';
import { HarmonicaKey, HarmonicaType } from './harmonicaMap';
import { encodeWav } from './wavEncoder';

export interface SerializedTrack {
  id: string;
  name: string;
  presetId: DspPresetId;
  volume: number;
  muted: boolean;
  solo: boolean;
  offsetMs?: number;
  fadeInMs?: number;
  fadeOutMs?: number;
  durationSec: number;
  wavBase64: string;
}

export interface HarpProjectFile {
  version: 1;
  savedAt: string;
  harmonicaType: HarmonicaType;
  harmonicaKey: HarmonicaKey;
  a4Hz: number;
  backingTrack: {
    name: string;
    wavBase64: string;
  } | null;
  backingParams: {
    volume: number;
    tempoRate: number;
    pitchSemitones: number;
    loopEnabled: boolean;
    loopA: number;
    loopB: number;
  };
  tracks: SerializedTrack[];
  customPresets: DspPreset[];
}

export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...sub);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function audioBufferToWavBase64(buffer: AudioBuffer): string {
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }
  const wav = encodeWav(channels, buffer.sampleRate);
  return uint8ToBase64(wav);
}

/** 使用浏览器原生 CompressionStream 将工程 JSON 压缩为 Gzip 字节流（零依赖） */
export async function compressProjectJson(jsonText: string): Promise<Uint8Array> {
  const rawBytes = new TextEncoder().encode(jsonText);
  if (typeof CompressionStream === 'undefined') {
    return rawBytes;
  }
  const cs = new CompressionStream('gzip');
  const writer = cs.writable.getWriter();
  await writer.write(rawBytes);
  await writer.close();
  const compressedBuffer = await new Response(cs.readable).arrayBuffer();
  return new Uint8Array(compressedBuffer);
}

/** 自动识别 Gzip（0x1f 0x8b）或旧版明文 JSON 并解码 */
export async function decompressProjectBytes(bytes: Uint8Array): Promise<string> {
  const isGzip = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  if (isGzip && typeof DecompressionStream !== 'undefined') {
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    await writer.write(new Uint8Array(bytes));
    await writer.close();
    const decompressedBuffer = await new Response(ds.readable).arrayBuffer();
    return new TextDecoder().decode(decompressedBuffer);
  }
  return new TextDecoder().decode(bytes);
}
