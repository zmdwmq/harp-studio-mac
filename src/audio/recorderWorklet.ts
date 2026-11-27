/**
 * 高优先级音频线程录音采集 AudioWorklet（替代已废弃的 ScriptProcessorNode）
 */

const RECORDER_WORKLET_CODE = `
class DryRecorderProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0] && input[0].length > 0) {
      // 复制当前 128 样本帧并发送到主线程缓冲
      this.port.postMessage(new Float32Array(input[0]));
    }
    return true;
  }
}
registerProcessor('dry-recorder-processor', DryRecorderProcessor);
`;

let cachedRecorderUrl: string | null = null;
const registeredRecorderContexts = new WeakSet<BaseAudioContext>();

function getRecorderBlobUrl(): string {
  if (!cachedRecorderUrl) {
    const blob = new Blob([RECORDER_WORKLET_CODE], { type: 'application/javascript' });
    cachedRecorderUrl = URL.createObjectURL(blob);
  }
  return cachedRecorderUrl;
}

export async function ensureRecorderWorklet(ctx: AudioContext): Promise<boolean> {
  if (registeredRecorderContexts.has(ctx)) return true;
  if (!ctx.audioWorklet) return false;
  try {
    await ctx.audioWorklet.addModule(getRecorderBlobUrl());
    registeredRecorderContexts.add(ctx);
    return true;
  } catch {
    return false;
  }
}

export function createRecorderWorkletNode(
  ctx: AudioContext,
  onChunk: (samples: Float32Array) => void
): AudioWorkletNode | null {
  if (!registeredRecorderContexts.has(ctx)) return null;
  const node = new AudioWorkletNode(ctx, 'dry-recorder-processor', {
    numberOfInputs: 1,
    numberOfOutputs: 1,
  });
  node.port.onmessage = (e: MessageEvent<Float32Array>) => {
    onChunk(e.data);
  };
  return node;
}
