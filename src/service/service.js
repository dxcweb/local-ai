const { app, ipcMain, BrowserWindow, dialog } = require("electron");
const path = require("path");
const lamaCleaner = require("./lamaCleaner");
const stableDiffusion = require("./StableDiffusion");
const updater = require("./updater");
const sadTalker = require("./SadTalker");
const rembg = require("./Rembg");
const { readdir, stat, readFile, writeFile } = require("fs/promises");
const { homedir } = require("os");
const { existsSync } = require("fs");
const chatGLM2 = require("./ChatGLM2");

const onListener = (eventName, task) => {
  ipcMain.on(eventName, async (event, params) => {
    try {
      const options = [];
      const callback = (data) => {
        try {
          event.sender.send(`${eventName}-status`, data);
        } catch (e) {}
      };
      if (params) {
        options.push(params);
      }
      options.push(callback);
      await task(...options);
    } catch (e) {
      event.sender.send(`${eventName}-status`, { globalError: e.message });
      console.log(e);
    }
  });
};
const onListenerHandle = (eventName, task) => {
  ipcMain.handle(eventName, async (event, params) => {
    try {
      const options = [];
      const callback = (data) => {
        try {
          event.sender.send(`${eventName}-status`, data);
        } catch (e) {}
      };
      if (params) {
        options.push(params);
      }
      options.push(callback);
      await task(...options);
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

  ipcMain.on("stop-lama-cleaner", (event) => {
    lamaCleaner.close();
  });
  ipcMain.handle("checkUpdate", updater.checkUpdate);
  ipcMain.handle("update", updater.update);

  onListener("lama-cleaner", lamaCleaner.start);
  onListener("stable-diffusion", stableDiffusion.start);
  onListener("update", updater.update);
  onListener("SadTalker", sadTalker.start);
  onListener("Rembg", rembg.start);
  onListenerHandle("handleRembg", rembg.handle);
  const getImagesByFolder = async (dirs, callback) => {
    for (let i = 0; i < dirs.length; i++) {
      const dir = dirs[i];
      let files = await readdir(dir);
      for (let n = 0; n < files.length; n++) {
        const file = files[n];
        const filePath = path.join(dir, file);
        const stats = await stat(filePath);
        if (stats.isDirectory()) {
          await getImagesByFolder([filePath], callback);
        } else if (stats.isFile()) {
          if (file.endsWith(".jpg") || file.endsWith(".png") || file.endsWith(".jpeg")) {
            callback(filePath);
          }
        }
      }
    }
  };
  ipcMain.handle("selectImage", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Images", extensions: ["jpg", "png", "jpeg"] }],
    });
    if (!canceled) {
      return filePaths;
    } else {
      return [];
    }
  });
  ipcMain.handle("selectImageByFolder", async (event) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["multiSelections", "openDirectory"],
    });
    if (!canceled) {
      await getImagesByFolder(filePaths, (path) => {
        event.sender.send("onSelectImage", path);
      });
    } else {
      return [];
    }
  });
  // protocol.registerFileProtocol("image", (request, callback) => {
  //   const url = request.url.replace(/^image:\/\//, "");
  //   // Decode URL to prevent errors when loading filenames with special characters
  //   const decodedUrl = decodeURI(url);
  //   try {
  //     return callback(decodedUrl);
  //   } catch (error) {
  //     console.error("ERROR: registerLocalResourceProtocol: Could not get file path:", error);
  //   }
  // });
  ipcMain.handle("getOutPath", async (event) => {
    const configPath = path.join(__dirname, "../../.outpath");
    if (existsSync(configPath)) {
      const res = await readFile(configPath, "utf-8");
      if (res) {
        return res;
      }
    }
    return path.join(homedir(), "Downloads");
  });
  ipcMain.handle("selectOutPath", async (event) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    if (!canceled) {
      const configPath = path.join(__dirname, "../../.outpath");
      await writeFile(configPath, filePaths[0]);
      return filePaths[0];
    } else {
      return null;
    }
  });
  onListener("ChatGLM2", chatGLM2.start);
  ipcMain.handle("ChatGLM2Run", async (event, quantize) => {
    return await chatGLM2.runWebUi(quantize);
  });
  // 在应用程序退出之前执行
  app.on("before-quit", async (event) => {
    event.preventDefault();
    await lamaCleaner.close();
    await stableDiffusion.close();
    await sadTalker.close();
    await rembg.close();
    await chatGLM2.close();
    app.exit();
  });
};

module.exports = service;
