const { app, ipcMain, BrowserWindow } = require("electron");
const path = require("path");
const lamaCleaner = require("./lamaCleaner");
const is = require("electron-is");
const stableDiffusion = require("./StableDiffusion");
const sleep = require("../utils/sleep");
const { rename } = require("fs/promises");
const treeKill = require("tree-kill");
const { spawn } = require("child_process");
const updater = require("./updater");
const sadTalker = require("./SadTalker");

const onListener = (eventName, task) => {
  ipcMain.on(eventName, async (event) => {
    try {
      await task((data) => {
        try {
          event.sender.send(`${eventName}-status`, data);
        } catch (e) {}
      });
    } catch (e) {
      event.sender.send(`${eventName}-status`, { globalError: e.message });
      console.log(e);
    }
  });
};
const service = (mainWindow) => {
  process.env.appPath = app.getAppPath();
  process.env.condabin = path.join(process.env.appPath, "/lib/miniconda3/condabin");
  process.env.downloadPath = path.join(process.env.appPath, "/download");

  // 监听来自渲染进程的请求
  ipcMain.on("register-navigation-listener", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const sendNavigationStatus = () => {
      const canGoBack = win.webContents.canGoBack();
      const canGoForward = win.webContents.canGoForward();
      event.sender.send("navigation-status-changed", { canGoBack, canGoForward });
    };

    win.webContents.on("did-navigate", sendNavigationStatus);
    win.webContents.on("did-navigate-in-page", sendNavigationStatus);
    sendNavigationStatus();
  });

  ipcMain.on("close", () => app.quit());
  // 在应用程序退出之前执行
  app.on("before-quit", async (event) => {
    event.preventDefault();
    await lamaCleaner.close();
    await stableDiffusion.close();
    await sadTalker.close();
    app.exit();
  });

  ipcMain.on("stop-lama-cleaner", (event) => {
    lamaCleaner.close();
  });
  ipcMain.handle("checkUpdate", updater.checkUpdate);
  ipcMain.handle("update", updater.update);

  onListener("lama-cleaner", lamaCleaner.start);
  onListener("stable-diffusion", stableDiffusion.start);
  onListener("update", updater.update);
  onListener("SadTalker", sadTalker.start);
};

module.exports = service;
