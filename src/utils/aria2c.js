const is = require("electron-is");
const path = require("path");
const { spawn } = require("child_process");
const axios = require("axios");
const getAvailablePort = require("../utils/getAvailablePort");
const sleep = require("../utils/sleep");
const bytesToSize = require("../utils/bytesToSize");
const fs = require("fs");
const { writeFile, unlink, mkdir } = require("fs/promises");
class Aria2c {
  constructor() {
    this.history = {};
    this.axios = axios.create({ timeout: 3000 });
    this.port = 26818;
    this.isStarted = false;
  }
  start = async (checkPort = true) => {
    return new Promise(async (resolve, reject) => {
      this.startIng = true; // 防止多次调用
      if (checkPort) {
        this.port = await getAvailablePort(this.port);
      }
      const appPath = process.env.appPath || path.join(__dirname, "../../");
      const assetsPath = path.join(appPath, "/static/aria2");
      const aria2Conf = path.join(assetsPath, "aria2.conf");
      let aria2Path;
      if (is.windows()) {
        aria2Path = path.join(assetsPath, "aria2c.exe");
      } else {
        aria2Path = path.join(assetsPath, "aria2c");
      }
      console.log("aria2c port", this.port);
      const sl = spawn(aria2Path, [`--conf-path=${aria2Conf}`, `--rpc-listen-port=${this.port}`]);
      sl.stdout.on("data", (data) => {
        const src = data.toString();
        if (src.indexOf("listening on TCP") >= 0) {
          this.isStarted = true;
          this.startIng = false;
          resolve();
        }
      });
      sl.on("close", (code) => {
        if (!this.isStarted) {
          reject(new Error("启动多线程下载器aria2c失败，请给予权限后重试"));
        }
        this.isStarted = false;
        this.startIng = false;
      });
    });
  };

  _download = (url, params, callback = () => {}) => {
    return new Promise(async (resolve, reject) => {
      let errorNum = 0;
      const startDownload = (res) => {
        const gid = res.result;
        const interval = setInterval(async () => {
          let statusRes;
          try {
            statusRes = await this.tellStatus(gid);
          } catch (e) {
            clearInterval(interval);
            return;
          }
          const { result, error } = statusRes;
          if (error) {
            clearInterval(interval);
            reject(error);
            return;
          }
          const res = {
            connections: result.connections,
            completedSize: bytesToSize(result.completedLength),
            totalSize: bytesToSize(result.totalLength),
            downloadSpeed: bytesToSize(result.downloadSpeed),
            percent: result.totalLength == "0" ? 0 : ((result.completedLength / result.totalLength) * 100).toFixed(2),
            status: result.status,
          };
          callback(res);
          if (result.status === "complete") {
            clearInterval(interval);
            resolve({ file: result.files[0].path });
          } else if (result.status === "error") {
            clearInterval(interval);
            if (errorNum >= 3) {
              if (params.out && params.dir) {
                const filePath = path.join(params.dir, params.out);
                if (fs.existsSync(filePath)) {
                  await unlink(filePath);
                }
                if (fs.existsSync(filePath + ".aria2")) {
                  await unlink(filePath + ".aria2");
                }
              }
              errorNum = 0;
            }
            setTimeout(() => {
              errorNum++;
              this.send("aria2.addUri", [[url], params])
                .then(startDownload)
                .catch(reject);
            }, 3000);
          }
        }, 1000);
      };
      this.send("aria2.addUri", [[url], params])
        .then(startDownload)
        .catch(reject);
    });
  };
  download = async (url, params, callback) => {
    let filePath;
    if (params.out && params.dir) {
      filePath = path.join(params.dir, params.out);
      if (fs.existsSync(filePath) && !fs.existsSync(filePath + ".download")) {
        return false;
      }
    }
    if (!this.isStarted) {
      if (this.startIng) {
        await sleep(1000);
        return await this.download(url, params, callback);
      }
      await this.start();
    }
    await mkdir(params.dir, { recursive: true });
    if (filePath) await writeFile(filePath + ".download", "");
    const res = await this._download(url, params, callback);
    if (filePath) await unlink(filePath + ".download");
    return res;
  };
  pauseAll = () => {
    return this.send("aria2.pauseAll");
  };
  unpause = (gid) => {
    return this.send("aria2.unpause", [gid]);
  };
  pause = (gid) => {
    return this.send("aria2.forcePause", [gid]);
  };
  tellStopped = () => {
    return this.send("aria2.tellStopped", [0, 100]);
  };
  tellActive = () => {
    return this.send("aria2.tellActive");
  };
  getVersion = () => {
    return this.send("aria2.getVersion");
  };
  tellStatus = (gid, keys = []) => {
    return this.send("aria2.tellStatus", [gid, keys]);
  };
  close = () => {
    if (!aria2c.isStarted) return;
    return new Promise((resolve) => {
      this.send("aria2.shutdown");
      const interval = setInterval(() => {
        if (!this.isStarted) {
          clearInterval(interval);
          resolve();
        }
      }, 10);
    });
  };
  saveSession = () => {
    return this.send("aria2.saveSession");
  };
  send = async (method, params, retry = 3) => {
    const postData = { id: 1, jsonrpc: "2.0", method, params };
    const url = `http://127.0.0.1:${this.port}/jsonrpc`;
    try {
      const { data } = await this.axios.post(url, postData);
      return data;
    } catch (e) {
      if (e.code === "ECONNREFUSED" && retry > 0) {
        await sleep(50);
        return await this.send(method, params, retry - 1);
      }
      if (method !== "aria2.shutdown") {
        throw new Error("链接aria2c失败" + method);
      }
    }
  };
}
const aria2c = new Aria2c();
module.exports = aria2c;

/**
     {
  completedLength: '56295176', // 已完成的长度
  connections: '0', // 连接数
  dir: 'E:/zsy/my/ai-tools/ai-electron/xxxx/', // 下载目录
  downloadSpeed: '0', // 下载速度
  errorCode: '0', // 错误码
  errorMessage: '', // 错误信息
  files: [
    {
      completedLength: '56295176',
      index: '1',
      length: '56295176',
      path: 'E:/zsy/my/ai-tools/ai-electron/xxxx//Miniconda3-py39_23.3.1-0-Windows-x86_64.exe',
      selected: 'true',
      uris: [Array]
    }
  ],
  gid: '5725be19f5442ec3',
  numPieces: '54',
  pieceLength: '1048576',
  status: 'complete',
  totalLength: '56295176', // 总长度
  uploadLength: '0',
  uploadSpeed: '0'
}
     */
