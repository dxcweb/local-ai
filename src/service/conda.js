const is = require("electron-is");
const fs = require("fs");
const path = require("path");
const myExecSync = require("../utils/myExecSync");
const deleteFolderRecursive = require("../utils/deleteFolderRecursive");
const mySpawn = require("../utils/mySpawn");
const killChild = require("../utils/killChild");
const aria2c = require("../utils/aria2c");
class Conda {
  constructor() {
    // 是否检查
    this.appPath = path.join(__dirname, "../../../");
    if (is.windows()) {
      this.installName = is.x64() ? "Miniconda3-py39_23.3.1-0-Windows-x86_64.exe" : "Miniconda3-py39_4.12.0-Windows-x86.exe";
    } else if (is.macOS()) {
      this.installName = is.x64() ? "Miniconda3-py39_23.3.1-0-MacOSX-x86_64.sh" : "Miniconda3-py39_23.3.1-0-MacOSX-arm64.sh";
    }
    this.downloadDir = path.join(this.appPath, "/download/");
    this.downloadPath = path.join(this.downloadDir, this.installName);

    this.installPath = path.join(this.appPath, "/lib/miniconda3/");
    process.env.PATH = this.installPath + (is.windows() ? "condabin;" : "bin:") + process.env.PATH;
    process.env.TORCH_HOME = path.join(this.appPath, "/lib/torch-home/");
  }
  downloadMiniconda = async (callback) => {
    if (!this.installName) {
      throw new Error("当前系统不支持");
    }
    if (!fs.existsSync(this.downloadPath) || fs.existsSync(this.downloadPath + ".aria2")) {
      const data = { id: "downloadMiniconda", type: "download", name: "下载Miniconda" };
      callback(data);
      const url = `https://repo.anaconda.com/miniconda/${this.installName}`;
      await aria2c.download(url, { dir: this.downloadDir }, (res) => {
        data.data = res;
        callback(data);
      });
      data.finish = true;
      callback(data);
    }
  };
  checkMiniconda = async () => {
    let condaList;
    try {
      condaList = await myExecSync("conda env list");
    } catch (e) {
      return { error: "未找到conda", code: 1 };
    }
    if (condaList.indexOf("dxc-ai") === -1) {
      return { error: "未找到dxc-ai环境", code: 2 };
    }
    try {
      await this.exec("python -V");
    } catch (e) {
      return { error: "未找到dxc-ai环境", code: 2 };
    }
    return { code: 0 };
  };
  installMiniconda = async (callback) => {
    const data = { id: "installMiniconda", name: "Miniconda" };
    callback(data);
    const checkMiniconda = await this.checkMiniconda();
    if (checkMiniconda.code === 1) {
      if (fs.existsSync(this.installPath)) {
        try {
          await deleteFolderRecursive(this.installPath);
        } catch (err) {
          throw new Error("文件删除失败,请重启电脑后重试");
        }
      }
      let code;
      if (is.windows()) {
        code = await mySpawn(`${this.downloadPath} /S /D=${this.installPath}`, { getChild: (child) => (this.child = child) });
      } else if (is.macOS()) {
        await myExecSync(`chmod +x ${this.downloadPath}`);
        code = await mySpawn(`${this.downloadPath} -b -p ${this.installPath}`, { getChild: (child) => (this.child = child) });
      }
      if (code !== 0) {
        throw new Error("安装Miniconda失败");
      }
      this.child = null;
    }
    data.finish = true;
    callback(data);
  };
  installEnv = async (callback) => {
    const data = { id: "installEnv", name: "Miniconda运行环境" };
    callback(data);

    const checkMiniconda = await this.checkMiniconda();
    console.log(checkMiniconda);
    if (checkMiniconda.code === 2) {
      const envPath = path.join(this.appPath, "/lib/miniconda3/envs/dxc-ai");
      if (fs.existsSync(envPath)) {
        try {
          await deleteFolderRecursive(envPath);
        } catch (err) {
          throw new Error("文件删除失败,请重启电脑后重试");
        }
      }
      await myExecSync("conda create -y -n dxc-ai python=3.9");
    } else if (checkMiniconda.code === 1) {
      throw new Error("未找到conda");
    }
    data.finish = true;
    callback(data);
  };
  close = async () => {
    await aria2c.close();
    killChild(this.child);
  };
  exec = (command) => {
    const condaCommand = is.windows() ? `activate dxc-ai && ${command}` : `source activate dxc-ai && ${command}`;
    return myExecSync(condaCommand);
  };
  spawn = (command, options) => {
    const condaCommand = is.windows() ? `activate dxc-ai && ${command}` : `source activate dxc-ai && ${command}`;
    return mySpawn(condaCommand, options);
  };
  installPytorch = async (callback, delPack) => {
    const data = { id: "pytorch", name: "pytorch" };
    callback(data);
    if (delPack) {
      console.log("清理conda");
      await mySpawn("conda clean -y --packages");
      await mySpawn("conda clean -y --tarballs");
    } else {
      try {
        await this.exec('python -c "import torch; print(torch.__version__)"');
        data.finish = true;
        callback(data);
        return;
      } catch ($e) {}
    }
    let installFailed = false;
    //
    const command = is.windows()
      ? "conda install -y -n dxc-ai pytorch==1.13.1 torchvision==0.14.1 torchaudio==0.13.1 pytorch-cuda=11.7 -c pytorch -c nvidia"
      : "conda install -y -n dxc-ai pytorch==1.13.1 torchvision==0.14.1 torchaudio==0.13.1 -c pytorch";
    const code = await mySpawn(command, { log: true, getChild: (child) => (this.child = child), stderr: () => (installFailed = true) });
    if (code !== 0 && installFailed) {
      console.log("安装失败，重试");
      delPack = true;
    } else {
      delPack = false;
    }
    await this.installPytorch(callback, delPack);
  };
  install = async (callback) => {
    await this.downloadMiniconda(callback);
    await this.installMiniconda(callback);
    await this.installEnv(callback);
  };
}

const conda = new Conda();
module.exports = conda;
