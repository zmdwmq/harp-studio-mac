# 音频引擎与实时 DSP 效果链设计

## 1. 信号路由架构

```text
[麦克风输入 (MediaStream)]
        │
        ▼
[AudioWorklet: 输入分析] ──► 实时电平 (RMS / Peak / Clipping) + YIN 音高/压音数据 ──► UI 线程
        │
        ├──► [Dry 干声录制缓冲] ──────────────────────────────────► 干声 WAV 轨
        │
        ▼
[口琴专属 DSP 效果链]
  1. High-Pass Filter (80Hz, 24dB/oct)  ── 消除手持震动与喷麦低频轰鸣
  2. Noise Gate / 轻量降噪               ── 抑制吸气间隙底噪
  3. Compressor (软拐点 3:1 ~ 4:1)       ── 平衡吹气强音与吸气/压音弱音
  4. Amp / Overdrive (WaveShaper + Tone) ── 布鲁斯模式启用，模拟电子管饱和
  5. Reverb (ConvolverNode / Schroeder)  ── 空间感（大厅/房间/弹簧混响）
  6. Brickwall Limiter (-0.5 dBFS)       ── 终极防爆音保护
        │
        ├──► [Wet 湿声录制缓冲 / 离线重渲染] ────────────────────► 湿声 WAV 轨
        │
        └──► [实时耳返开关 (Monitor)] ──► 扬声器/耳机输出（默认关闭，防止啸叫与延迟干扰；使用硬件监听如 AG06mk2 时保持关闭）
```

## 2. 关于 Windows 延迟与耳返策略

1. **硬件直通监听优先**：若用户使用带硬件监听的声卡（如 Yamaha AG06mk2、Focusrite Scarlett），建议关闭软件耳返，直接用声卡零延迟监听，软件仅负责伴奏播放、录音与压音可视化。
2. **软件耳返兜底**：对于普通 USB 麦克风用户，开启 `latencyHint: 'interactive'`，并在录音对齐时提供**延迟补偿滑块（ms）**，自动抵消录制轨与伴奏轨之间的系统缓冲偏移。
