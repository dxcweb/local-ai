// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require("electron");

const onListener = (eventName) => {
  return (...option) => {
    let params = null;
    let callback = null;
    if (option.length === 1) {
      callback = option[0];
    } else {
      params = option[0];
      callback = option[1];
    }
    ipcRenderer.send(eventName, params);
    function handleEvent(event, data) {
      callback(data);
    }
    ipcRenderer.on(`${eventName}-status`, handleEvent);
    return () => {
      ipcRenderer.removeListener(`${eventName}-status`, handleEvent);
    };
  };
};
const onListenerHandle = (eventName) => {
  return async (...option) => {
    let params = null;
    let callback = null;
    if (option.length === 1) {
      callback = option[0];
    } else {
      params = option[0];
      callback = option[1];
    }

    function handleEvent(event, data) {
      callback(data);
    }
    ipcRenderer.on(`${eventName}-status`, handleEvent);
    await ipcRenderer.invoke(eventName, params);
    ipcRenderer.removeListener(`${eventName}-status`, handleEvent);
  };
};
contextBridge.exposeInMainWorld("electronAPI", {
  selectImage: () => ipcRenderer.invoke("selectImage"),
  selectImageByFolder: async (callback) => {
    function handleEvent(event, data) {
      callback(data);
    }
    ipcRenderer.on(`onSelectImage`, handleEvent);
    await ipcRenderer.invoke("selectImageByFolder");
    ipcRenderer.removeListener(`onSelectImage`, handleEvent);
  },
  close: () => ipcRenderer.send("close"),
  setTitle: (title) => {
    ipcRenderer.send("set-title", title);
    // const preloadPath = path.join(__dirname);
    // // 根据当前脚本的路径获取安装路径
    // const appPath = path.join(preloadPath, "../../");
    // ipcRenderer.send("log", appPath);
    return { xxx: 123 };
  },
  openFile: () => ipcRenderer.invoke("dialog:openFile"),

  handleCounter: (callback) => ipcRenderer.on("update-counter", callback),
  // 下载miniconda
  downloadMiniconda: () => ipcRenderer.send("download-miniconda"),
  // 环境检查
  checkEnv: () => ipcRenderer.invoke("check-env"),
  // 安装Lama Cleaner
  installLamaCleaner: () => ipcRenderer.send("install-lama-cleaner"),
  // hndleCounter: (callback) => ipcRenderer.on("update-counter", callback),
  registerNavigationListener: (callback) => {
    ipcRenderer.send("register-navigation-listener");
    ipcRenderer.on("navigation-status-changed", (event, status) => {
      callback(status);
    });
  },

  getVersion: () => ipcRenderer.invoke("get-version"),
  checkUpdate: () => ipcRenderer.invoke("checkUpdate"),
  getOutPath: () => ipcRenderer.invoke("getOutPath"),
  selectOutPath: () => ipcRenderer.invoke("selectOutPath"),
  update: onListener("update"),
  startLamaCleaner: onListener("lama-cleaner"),
  startStableDiffusion: onListener("stable-diffusion"),
  SadTalker: onListener("SadTalker"),
  Rembg: onListener("Rembg"),
  ChatGLM2: onListener("ChatGLM2"),
  handleRembg: onListenerHandle("handleRembg"),
  ChatGLM2Run: (quantize) => ipcRenderer.invoke("ChatGLM2Run", quantize),
});
