import { app, BrowserWindow, dialog, ipcMain, systemPreferences } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const iconPath = process.env.VITE_DEV_SERVER_URL
    ? path.join(__dirname, '../public/icon.png')
    : path.join(__dirname, '../dist/icon.png');
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: '#0c0e14',
    title: 'HarpStudio · 口琴录音工坊',
    icon: iconPath,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    systemPreferences.askForMediaAccess('microphone').catch(() => {});
  }
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('dialog:openAudioFile', async () => {
  const result = await dialog.showOpenDialog({
    title: '选择伴奏音频文件',
    properties: ['openFile'],
    filters: [
      { name: '音频文件', extensions: ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac'] },
    ],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  const buffer = await fs.readFile(filePath);
  return {
    name: path.basename(filePath),
    path: filePath,
    data: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  };
});

ipcMain.handle(
  'dialog:saveAudioFile',
  async (
    _event,
    payload: { defaultName: string; data: Uint8Array; format?: 'wav' | 'mp3' | 'webm' }
  ) => {
    const isWebm = payload.format === 'webm' || payload.defaultName.endsWith('.webm');
    const isMp3 = payload.format === 'mp3' || payload.defaultName.endsWith('.mp3');
    const result = await dialog.showSaveDialog({
      title: isWebm ? '导出成品视频' : '导出成品音频',
      defaultPath: payload.defaultName,
      filters: isWebm
        ? [{ name: 'WebM 高清视频 (720p)', extensions: ['webm'] }]
        : isMp3
          ? [{ name: 'MP3 高品质音频 (320kbps)', extensions: ['mp3'] }]
          : [{ name: 'WAV 无损音频', extensions: ['wav'] }],
    });
    if (result.canceled || !result.filePath) return { saved: false };
    await fs.writeFile(result.filePath, Buffer.from(payload.data));
    return { saved: true, filePath: result.filePath };
  }
);

ipcMain.handle('dialog:openProjectFile', async () => {
  const result = await dialog.showOpenDialog({
    title: '打开 HarpStudio 工程文件',
    properties: ['openFile'],
    filters: [{ name: 'HarpStudio 工程 (*.harpproj)', extensions: ['harpproj'] }],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  const buffer = await fs.readFile(filePath);
  return {
    name: path.basename(filePath),
    path: filePath,
    data: new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength),
  };
});

ipcMain.handle(
  'dialog:saveProjectFile',
  async (_event, payload: { defaultName: string; data: Uint8Array }) => {
    const result = await dialog.showSaveDialog({
      title: '保存 HarpStudio 工程文件',
      defaultPath: payload.defaultName,
      filters: [{ name: 'HarpStudio 工程 (*.harpproj)', extensions: ['harpproj'] }],
    });
    if (result.canceled || !result.filePath) return { saved: false };
    await fs.writeFile(result.filePath, Buffer.from(payload.data));
    return { saved: true, filePath: result.filePath };
  }
);
