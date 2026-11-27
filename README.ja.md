[中文](README.md) | [English](README.en.md) | **日本語**

# HarpStudio macOS · ハーモニカ録音スタジオ Mac 版

> ハーモニカ奏者のために設計された、練習・伴奏トランスポーズ・マルチトラック録音ワークステーション（macOS Apple Silicon `arm64` / Intel `x64` 対応）。

- **macOS 版ダウンロード**: 開発環境不要で実行できる最新の `.dmg` / `.zip` は [GitHub Releases](https://github.com/zmdwmq/harp-studio-mac/releases/latest) から入手できます。
  > ヒント：初回起動時に「開発元を確認できないため開けません」と表示された場合は、`HarpStudio.app` を **右クリック → 開く** で起動し、マイクアクセスを許可してください。

## 主な機能

- **音割れ防止 & ハーモニカ専用 DSP プリセット**: コンプレッサー/リミッター、リバーブに加え、フォーク、クロマチック、ブルース（真空管オーバードライブ）などのワンクリック音色プリセットを搭載。
- **折りたたみ可能なリアルタイム音程・ホール表示**: 10 ホールズ・ブルースハープ（全 12 キー）、12/14/16 穴クロマチック（C6 配列・スライド表示対応）、24 穴複音ハーモニカに対応。数字譜（簡譜）/ 音名切替および標準オクターブ / ハーモニカ表記 (-8va) 切替をサポート。
- **動的簡譜フォロー演奏 & 練習採点**: 標準簡譜のインポート、各ハーモニカ配列への自動ホール変換、カウントイン、練習スコアレポートに対応。
- **伴奏練習ツール**: 伴奏ファイルの読み込み、キー変更（トランスポーズ）、テンポ変更（音程維持）、A-B リピート練習に対応。
- **折りたたみ可能なマルチトラック録音**: マルチトラックのオーバーダビング、トラックごとの音量・パン調整、WAV / MP3 / 720p 動画書き出しに対応。
- **プラグイン拡張アーキテクチャ**: [src/core/pluginSystem.ts](src/core/pluginSystem.ts) の `HarpStudioPlugin` により、DSP 音色プリセット、カスタム配列（チューニング）、UI テーマ（`PluginTheme`）、練習曲譜（`tabs`）、メトロノームプリセット（`metronomePresets`）、クイックアクション、音程検出/録音完了フックを拡張可能。

## クイックスタート

```bash
# 依存パッケージのインストール
npm install

# Web 開発サーバー起動
npm run dev

# Electron デスクトップ開発環境起動
npm run electron:dev

# ユニットテスト実行
npm test

# プロダクションビルド
npm run build

# macOS 版 (.dmg / .zip) パッケージング（macOS 環境で実行）
npm run dist:mac
```

## プラグイン開発への参加

プラグインインターフェース `HarpStudioPlugin` は [src/core/pluginSystem.ts](src/core/pluginSystem.ts) に定義されており、以下を拡張できます：
- `presets`: カスタム DSP 音色プリセット
- `tunings`: カスタム配列（C 調基準で定義し、キーに応じて自動移調）
- `themes`: カスタム UI テーマ（`--hs-*` CSS 変数）
- `tabs`: カスタム簡譜フォロー練習曲
- `metronomePresets`: カスタムメトロノームプリセット
- `actions`: クイックアクションボタン
- `onPitchDetected` / `onRecordingComplete`: リアルタイム音程検出・録音完了フック

規約・最小テンプレート・PR チェックリストは **[プラグイン開発ガイド](docs/PLUGIN_GUIDE.md)** をご覧ください。Issue や Pull Request を歓迎します！

## ドキュメント（LLM-Wiki）

- ナレッジベース入口: [wiki/index.md](wiki/index.md)
- 変更履歴: [wiki/log.md](wiki/log.md)
- 開発・運用ガイドライン: [AGENTS.md](AGENTS.md)
- 生データアーカイブ: [raw/](raw/)

## ライセンス

[MIT](LICENSE)
