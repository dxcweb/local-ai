const aria2c = require("../utils/aria2c");
const getAvailablePort = require("../utils/getAvailablePort");
const killChild = require("../utils/killChild");
const is = require("electron-is");
const CondaBase = require("./CondaBase");
const pipInstall = require("../utils/pipInstall");
const path = require("path");
const fs = require("fs");
class LamaCleaner {
  constructor() {
    this.conda = new CondaBase({
      pythonVersion: "3.10.6",
      envName: "dxc-lc",
      pytorchVersion: "2.0.1",
      torchvisionVersion: "0.15.2",
      torchaudioVersion: "2.0.2",
      cudaVersion: "11.8",
    });
    const appPath = path.join(__dirname, "../../../");
    this.modelPath = path.join(appPath, "/lib/torch-home/hub/checkpoints/");
  }
  downloadModels = async (callback) => {
    const data = { id: "big_lama", type: "download", name: "模型" };
    await aria2c.download(
      "https://ghproxy.com/https://github.com/Sanster/models/releases/download/add_big_lama/big-lama.pt",
      { dir: this.modelPath, out: "big-lama.pt" },
      (res) => {
        data.data = res;
        callback(data);
      },
    );
    data.finish = true;
    callback(data);
  };
  checkLamaCleaner = async (callback) => {
    if (!fs.existsSync(this.conda.installPath)) {
      return false;
    }
    const data = { id: "installMiniconda", name: "环境检查" };
    callback && callback(data);
    let res;
    try {
      await this.conda.exec("pip show lama-cleaner");
      res = true;
    } catch (e) {
      res = false;
    }
    data.finish = true;
    callback && callback(data);
    return res;
  };
  installLamaCleaner = async (callback) => {
    await pipInstall(this.conda, "lama-cleaner==1.1.2", callback);
  };

  runningCallback = (callback) => {
    this.running = true;
    const data = { id: "running", running: true, port: this.port };
    callback(data);
  };
  startLamaCleaner = async (callback) => {
    const data = { id: "start", name: "程序启动中", type: "start" };
    callback(data);
    this.port = await getAvailablePort(14874);
    const device = is.windows() ? "cuda" : "cpu";
    const command = `lama-cleaner --model=lama --device=${device} --port=${this.port} --disable-model-switch`;
    await this.conda.spawn(command, {
      log: true,
      stderr: (data) => {
        if (data.indexOf("Running on") >= 0) {
          this.runningCallback(callback);
        }
      },
      getChild: (child) => (this.child = child),
    });
    this.running = false;
  };
  pipInstall = async (callback) => {
    const packages = [
      "opencv-python",
      "flask==2.2.3",
      "flask-socketio",
      "simple-websocket",
      "flask_cors",
      "flaskwebgui==0.3.5",
      "pydantic",
      "rich",
      "loguru",
      "yacs",
      "diffusers==0.16.1",
      "transformers==4.27.4",
      "gradio",
      "piexif==1.1.3",
      "safetensors",
      "omegaconf",
      "controlnet-aux==0.0.3",
    ];
    await pipInstall(this.conda, packages, callback);
  };
  install = async (callback) => {
    await this.conda.install(callback);
    // await this.pipInstall(callback);
    await this.installLamaCleaner(callback);
    if (is.windows()) {
      await pipInstall(this.conda, "xformers==0.0.20", callback, "huawei");
    }
  };
  close = async () => {
    await this.conda.close();
    await aria2c.close();
    killChild(this.child);
  };
  start = async (callback) => {
    if (this.running) {
      this.runningCallback(callback);
      return;
    }
    if (!(await this.checkLamaCleaner(callback))) {
      await Promise.all([this.install(callback), this.downloadModels(callback)]);
      aria2c.close();
    }
    await this.startLamaCleaner(callback);
  };
}

const lamaCleaner = new LamaCleaner();
module.exports = lamaCleaner;
