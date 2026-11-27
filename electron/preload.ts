import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('harpDesktop', {
  platform: process.platform,
  openAudioFile: () => ipcRenderer.invoke('dialog:openAudioFile'),
  saveAudioFile: (defaultName: string, data: Uint8Array, format?: 'wav' | 'mp3' | 'webm') =>
    ipcRenderer.invoke('dialog:saveAudioFile', { defaultName, data, format }),
  openProjectFile: () => ipcRenderer.invoke('dialog:openProjectFile'),
  saveProjectFile: (defaultName: string, data: Uint8Array) =>
    ipcRenderer.invoke('dialog:saveProjectFile', { defaultName, data }),
});
