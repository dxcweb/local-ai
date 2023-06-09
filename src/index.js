const { app, BrowserWindow, Menu, session } = require("electron");
const path = require("path");
const service = require("./service/service");
const sleep = require("./utils/sleep");
const is = require("electron-is");
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

const createWindow = () => {
  // session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
  //   if (details.url.indexOf("baidu.com") >= 0) {
  //     if (details.url.indexOf("%2Fweb%2Findex.html") >= 0) {
  //       console.log(11, details.url);
  //       details.url += "&xx=1";
  //     }
  //     details.requestHeaders["Referer"] = "https://local-ai.dxcweb.com/";
  //   }
  //   callback({ cancel: false, requestHeaders: details.requestHeaders });
  // });
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    titleBarStyle: "hidden",
    // width: 1200,
    // height: 800,
    width: 1500,
    height: 1000,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });
  service(mainWindow);
  if (is.macOS()) {
    // macOS
    const template = [
      {
        label: "本地AI",
        submenu: [
          { role: "undo", label: "撤销" },
          { role: "redo", label: "重做" },
          { role: "cut", label: "剪切" },
          { role: "copy", label: "复制" },
          { role: "paste", label: "粘贴" },
          { role: "selectall", label: "全选" },
          { role: "quit", label: "退出" },
        ],
      },
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  } else {
    // Windows and Linux
    mainWindow.setMenu(null);
  }
  // and load the index.html of the app.
  // mainWindow.loadFile(path.join(__dirname, "web/index.html"));
  mainWindow.loadURL("https://ai.dxcweb.com/el/?v=1.4.0");
  // mainWindow.loadURL("http://localhost:18888");

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  //在 macOS 上，点击 dock 图标时没有已打开的其他窗口时，会重新创建一个窗口
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
// 在应用程序退出之前执行

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
