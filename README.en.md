[中文](README.md) | **English** | [日本語](README.ja.md)

# HarpStudio macOS

> A modern harmonica practice, backing-track transposing, and multi-track recording workstation for macOS (Apple Silicon `arm64` & Intel `x64`).

- **Download (macOS DMG / ZIP)**: Get the latest `.dmg` or `.zip` from [GitHub Releases](https://github.com/zmdwmq/harp-studio-mac/releases/latest) — no dev environment required.
  > Note: On first launch, if macOS Gatekeeper warns about an unidentified developer, **Right-click `HarpStudio.app` → Open** in Applications and grant microphone access when prompted.

## Features

- **Anti-Clipping & Harmonica DSP Presets**: Built-in compressor/limiter, reverb, and one-click presets including Bright Folk, Warm Chromatic, and Chicago Blues tube overdrive.
- **Collapsible Pitch & Hole Visualizer**: Real-time pitch detection with hole mapping for 10-hole diatonic (all 12 keys), 12/14/16-hole chromatic (including C6 tuning & slide indicators), and 24-hole tremolo harmonicas. Supports Jianpu (numbered notation) / note-name toggle and Standard / Harmonica (-8va) octave display.
- **Dynamic Jianpu Follow-Along & Practice Scoring**: Import standard Jianpu tabs, auto-map to any harmonica type/key/tuning, practice with count-in, and export score cards.
- **Backing Track Practice Tools**: Import backing tracks, transpose pitch (semitone shift), adjust playback tempo independently, and practice with A-B looping.
- **Collapsible Multi-Track Recorder**: Multi-track overdubbing with per-track volume/pan controls and WAV/MP3/720p video export.
- **Plugin Architecture**: Extensible via `HarpStudioPlugin` ([src/core/pluginSystem.ts](src/core/pluginSystem.ts)) for custom DSP presets, tunings, UI themes (`PluginTheme`), follow-along tabs (`tabs`), metronome presets (`metronomePresets`), quick actions, and pitch/recording hooks.

## Quick Start

```bash
# Install dependencies
npm install

# Start Web dev server
npm run dev

# Start Electron desktop dev environment
npm run electron:dev

# Run unit tests
npm test

# Build for production
npm run build

# Package macOS DMG / ZIP (run on macOS)
npm run dist:mac
```

## Contributing & Plugin Development

The plugin interface `HarpStudioPlugin` is defined in [src/core/pluginSystem.ts](src/core/pluginSystem.ts) and supports:
- `presets`: Custom DSP tone presets
- `tunings`: Custom harmonica tuning layouts (defined in C, auto-transposed per key)
- `themes`: Custom UI color themes (`--hs-*` CSS variables)
- `tabs`: Custom Jianpu follow-along songs
- `metronomePresets`: Custom metronome rhythm presets
- `actions`: Quick toolbar/panel actions
- `onPitchDetected` / `onRecordingComplete`: Real-time pitch & recording lifecycle hooks

See **[Plugin Development Guide](docs/PLUGIN_GUIDE.md)** for conventions, templates, and PR checklist. Issues and Pull Requests are welcome!

## Documentation (LLM-Wiki)

- Knowledge Base Index: [wiki/index.md](wiki/index.md)
- Changelog: [wiki/log.md](wiki/log.md)
- Maintenance Guidelines: [AGENTS.md](AGENTS.md)
- Raw Archive: [raw/](raw/)

## License

[MIT](LICENSE)
