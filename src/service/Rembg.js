const aria2c = require("../utils/aria2c");
const CondaBase = require("./CondaBase");
const path = require("path");
const { download } = require("../utils/download");
const getAvailablePort = require("../utils/getAvailablePort");
const is = require("electron-is");
const { exec } = require("child_process");
const sleep = require("../utils/sleep");
const myExecSync = require("../utils/myExecSync");
const checkPort = require("../utils/checkPort");
const treeKill = require("tree-kill");
const request = require("../utils/request");
class Rembg {
  constructor() {
    this.conda = new CondaBase({
      pythonVersion: "3.10.6",
      envName: "dxc-ai2",
      pytorchVersion: "2.0.1",
      torchvisionVersion: "0.15.2",
      torchaudioVersion: "2.0.2",
      cudaVersion: "11.8",
    });
    this.appPath = path.join(__dirname, "../../../");
    this.libPath = path.join(this.appPath, "lib");
    this.home = path.join(this.libPath, "u2net");
    process.env.U2NET_HOME = this.home;
    this.pkgPath = path.join(__dirname, "../api");
  }
  close = async () => {
    await this.conda.close();
    await aria2c.close();
    if (this.sd_pid) {
      try {
        if (is.windows()) {
          treeKill(this.sd_pid);
        } else {
          exec(`kill ${this.sd_pid + 1}`);
        }
      } catch (e) {}
    }
  };
  runningCallback = (callback) => {
    this.running = true;
    const data = { id: "running", running: true, to: "/rembg-ui", port: this.port };
    callback(data);
  };
  install = async (callback) => {
    await this.conda.install(callback);
    if (is.windows()) {
      await this.conda.pipInstall("rembg[gpu]==2.0.43", callback);
    } else {
      await this.conda.pipInstall("rembg==2.0.43", callback);
    }
    await this.conda.pipInstall("sse_starlette", callback);
  };
  downloadModel = async (callback) => {
    await Promise.all([
      download({ out: "u2net.onnx", url: "https://ghproxy.com/https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx", dir: this.home }, callback),
      download(
        { out: "u2net_human_seg.onnx", url: "https://ghproxy.com/https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net_human_seg.onnx", dir: this.home },
        callback,
      ),
      download({ out: "isnet-anime.onnx", url: "https://ghproxy.com/https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-anime.onnx", dir: this.home }, callback),
    ]);
  };
  check = async (callback) => {
    const data = { id: "check", name: "环境检查" };
    callback(data);
    let isInstalled = false;
    try {
      if(is.macOS()){
        await this.conda.exec("export KMP_DUPLICATE_LIB_OK=TRUE && rembg --version");
      }else{
        await this.conda.exec("rembg --version");
      }
      isInstalled = true;
    } catch (e) {}
    data.finish = true;
    callback(data);
    return isInstalled;
  };
  runWebUi = async (callback) => {
    const data = { id: "start", name: "程序启动中", type: "start" };
    callback(data);
    this.port = await getAvailablePort(17179);
    let command = `uvicorn main:app --port=${this.port}`;
    const windowTitle = "dxcweb-Rembg";
    if (is.windows()) {
      const commandToRun = `activate ${this.conda.envName} && ${command}`;
      const script = `start "${windowTitle}" cmd.exe /K "${commandToRun}"`;

      exec(script, { env: { ...process.env }, cwd: this.pkgPath });
    } else {
      command = command.replace(/"/g, '\\"');
      let commandToRun = `export PATH=${this.conda.installPath}bin:$PATH && source activate  ${this.conda.envName} && export U2NET_HOME=${this.home} && export KMP_DUPLICATE_LIB_OK=TRUE  && cd ${this.pkgPath} && ${command}`;
      const script = `tell application "Terminal" to do script "${commandToRun}"`;
      const child = exec(`osascript -e '${script}'`, { env: { ...process.env } }, () => {});
      this.sd_pid = child.pid;
    }
    this.checkRun(callback);
    if (is.windows()) {
      await sleep(1000);
      const stdout = await myExecSync(`tasklist /v | findstr "${windowTitle}"`);
      let regex = /(\d+)\s+Console/;
      let match2 = stdout.match(regex);
      if (match2) {
        this.sd_pid = match2[1];
      }
    }
  };
  checkRun = async (callback) => {
    if (!(await checkPort(this.port))) {
      this.runningCallback(callback);
    } else {
      await sleep(200);
      await this.checkRun(callback);
    }
  };
  handle = async (params, callback) => {
    const url = `http://127.0.0.1:${this.port}/rembg`;
    await request.sse(url, params, (res) => {
      const data = JSON.parse(res);
      callback(data);
    });
  };
  start = async (callback) => {
    if (this.running) {
      return this.runningCallback(callback);
    }
    if (!(await this.check(callback))) {
      await Promise.all([this.install(callback), this.downloadModel(callback)]);
      aria2c.close();
    }
    await this.runWebUi(callback);
  };
}

const rembg = new Rembg();
module.exports = rembg;
