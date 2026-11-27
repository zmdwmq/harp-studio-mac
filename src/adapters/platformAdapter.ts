/**
 * 平台能力适配器接口与桌面/Web 实现（遵循 ADR-002 跨平台解耦）
 */

export interface OpenedAudioFile {
  name: string;
  path?: string;
  data: ArrayBuffer;
}

export interface SaveAudioResult {
  saved: boolean;
  filePath?: string;
}

export interface OpenedProjectFile {
  name: string;
  path?: string;
  data: Uint8Array;
}

export interface IPlatformAdapter {
  readonly platformName: string;
  openAudioFile(): Promise<OpenedAudioFile | null>;
  saveAudioFile(
    defaultName: string,
    data: Uint8Array,
    format?: 'wav' | 'mp3' | 'webm'
  ): Promise<SaveAudioResult>;
  openProjectFile(): Promise<OpenedProjectFile | null>;
  saveProjectFile(defaultName: string, data: Uint8Array): Promise<SaveAudioResult>;
}

declare global {
  interface Window {
    harpDesktop?: {
      platform: string;
      openAudioFile: () => Promise<OpenedAudioFile | null>;
      saveAudioFile: (
        defaultName: string,
        data: Uint8Array,
        format?: 'wav' | 'mp3' | 'webm'
      ) => Promise<SaveAudioResult>;
      openProjectFile: () => Promise<OpenedProjectFile | null>;
      saveProjectFile: (defaultName: string, data: Uint8Array) => Promise<SaveAudioResult>;
    };
  }
}

class DesktopOrWebAdapter implements IPlatformAdapter {
  get platformName(): string {
    return window.harpDesktop?.platform ?? 'web';
  }

  async openAudioFile(): Promise<OpenedAudioFile | null> {
    if (window.harpDesktop) {
      return window.harpDesktop.openAudioFile();
    }
    // Web / 移动端预览兜底方案
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'audio/*';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        resolve({
          name: file.name,
          data: await file.arrayBuffer(),
        });
      };
      input.click();
    });
  }

  async saveAudioFile(
    defaultName: string,
    data: Uint8Array,
    format: 'wav' | 'mp3' | 'webm' = 'wav'
  ): Promise<SaveAudioResult> {
    if (window.harpDesktop) {
      return window.harpDesktop.saveAudioFile(defaultName, data, format);
    }
    const mime =
      format === 'webm' ? 'video/webm' : format === 'mp3' ? 'audio/mpeg' : 'audio/wav';
    const blob = new Blob([data.slice().buffer], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    a.click();
    URL.revokeObjectURL(url);
    return { saved: true, filePath: defaultName };
  }

  async openProjectFile(): Promise<OpenedProjectFile | null> {
    if (window.harpDesktop) {
      return window.harpDesktop.openProjectFile();
    }
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.harpproj,application/json,application/gzip';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        resolve({ name: file.name, data: new Uint8Array(await file.arrayBuffer()) });
      };
      input.click();
    });
  }

  async saveProjectFile(defaultName: string, data: Uint8Array): Promise<SaveAudioResult> {
    if (window.harpDesktop) {
      return window.harpDesktop.saveProjectFile(defaultName, data);
    }
    const blob = new Blob([data.slice().buffer], { type: 'application/gzip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    a.click();
    URL.revokeObjectURL(url);
    return { saved: true, filePath: defaultName };
  }
}

export const platformAdapter: IPlatformAdapter = new DesktopOrWebAdapter();
