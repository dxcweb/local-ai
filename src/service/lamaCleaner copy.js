const path = require("path");
const fs = require("fs");
const deleteFolderRecursive = require("../utils/deleteFolderRecursive");
const is = require("electron-is");
const mySpawnSync = require("../utils/mySpawnSync");
const myExecSync = require("../utils/myExecSync");
const { spawn } = require("child_process");
const getAvailablePort = require("../utils/getAvailablePort");
const treeKill = require("tree-kill");
const sleep = require("../utils/sleep");
class LamaCleaner {
  constructor() {
    // 是否检查
    this.isCheck = false;
    const appPath = path.join(__dirname, "../../../");
    this.appPath = appPath;
    this.condaBin = path.join(appPath, "/lib/miniconda3/condabin");
    this.downloadPath = path.join(appPath, "/download/");
    this.modelPath = path.join(appPath, "/lib/torch-home/hub/checkpoints/");
    this.bigLamaPath = path.join(this.modelPath, "/big-lama.pt");
    process.env.PATH = this.condaBin + ";" + process.env.PATH;
    process.env.TORCH_HOME = path.join(appPath, "/lib/torch-home/");
    // process.env.PIP_INDEX_URL = "https://repo.huaweicloud.com/repository/pypi/simple/";
    process.env.PIP_INDEX_URL = "http://mirrors.aliyun.com/pypi/simple/";
  }
  checkMiniconda = async () => {
    let condaList;
    try {
      condaList = (await myExecSync("conda env list")).toString();
    } catch (e) {
      return { error: "未找到conda", code: 1 };
    }
    if (condaList.indexOf("dxc-ai") === -1) {
      return { error: "未找到dxc-ai环境", code: 2 };
    }
    return { code: 0 };
  };
  downloadMiniconda = async (callback) => {
    if (!fs.existsSync(this.condaBin)) {
      const data = { id: "miniconda3", type: "download", name: "依赖项1" };
      // Miniconda3 安装包
      const minicondaInstall = path.join(this.downloadPath, "/Miniconda3-py39_23.3.1-0-Windows-x86_64.exe");
      if (!fs.existsSync(minicondaInstall) || fs.existsSync(minicondaInstall + ".aria2")) {
        callback(data);
        let url;
        if (is.windows()) {
          url = "https://repo.anaconda.com/miniconda/Miniconda3-py39_23.3.1-0-Windows-x86_64.exe";
        } else if (is.macOS()) {
          url = "https://repo.anaconda.com/miniconda/Miniconda3-py39_23.3.1-0-MacOSX-x86_64.sh";
        }
        try {
          await aria2.download(url, this.downloadPath, (res) => {
            data.data = res;
            callback(data);
          });
        } catch (e) {
          callback({ globalError: "启动多线程下载器aria2失败，请给予权限后重试" });
          throw new Error("下载失败");
        }
        data.finish = true;
        callback(data);
      }
    }
  };

  downloadModel = async (callback) => {
    if (!fs.existsSync(this.bigLamaPath) || fs.existsSync(this.bigLamaPath + ".aria2")) {
      const data = { id: "big_lama", type: "download", name: "模型" };
      callback(data);
      try {
        await aria2.download(
          "https://ghproxy.com/https://github.com/Sanster/models/releases/download/add_big_lama/big-lama.pt",
          this.modelPath,
          (res) => {
            data.data = res;
            callback(data);
          },
        );
      } catch (e) {
        callback({ globalError: "启动多线程下载器aria2失败，请给予权限后重试" });
        throw new Error("下载失败");
      }
      console.log(3123);
      data.finish = true;
      callback(data);
    }
  };
  spawn = (command, stdout, stderr) => {
    return new Promise((resolve, reject) => {
      const params = ["cmd.exe", ["/c", command]];
      const child = spawn(...params);
      child.stdout.on("data", (data) => {
        stdout && stdout(data.toString());
      });
      child.stderr.on("data", (data) => {
        stderr && stderr(data.toString());
      });
      child.on("close", (code) => {
        this.child = null;
        console.error(`close: ${code}`);
        if (code === 0) {
          resolve();
        } else {
          reject();
        }
      });
      this.child = child;
    });
  };
  installMiniconda = async (callback) => {
    const data = { id: "installMiniconda", name: "依赖项1" };
    callback(data);
    const checkMiniconda = await this.checkMiniconda();
    if (checkMiniconda.code === 0) {
      data.finish = true;
      callback(data);
      return;
    }
    const installPath = path.join(this.appPath, "/lib/miniconda3");
    callback(data);
    if (checkMiniconda.code === 1) {
      const minicondaInstall = path.join(this.downloadPath, "/Miniconda3-py39_23.3.1-0-Windows-x86_64.exe");
      if (fs.existsSync(installPath)) {
        // if (is.windows()) {
        //   await killexe("_conda.exe");
        // }
        try {
          await deleteFolderRecursive(installPath);
        } catch (err) {
          data.error = "文件删除失败,请重启电脑后重试";
          callback(data);
          throw new Error("文件删除失败,请重启电脑后重试");
        }
      }
      await this.spawn(`${minicondaInstall} /S /D=${installPath}`);
      await this.installMiniconda(callback);
    } else if (checkMiniconda.code === 2) {
      const envPath = path.join(installPath, "/envs/dxc-ai");
      if (fs.existsSync(envPath)) {
        try {
          await deleteFolderRecursive(envPath);
        } catch (err) {
          data.error = "文件删除失败,请重启电脑后重试";
          callback(data);
          throw new Error("文件删除失败,请重启电脑后重试");
        }
      }
      await myExecSync("conda create -y -n dxc-ai python=3.9");
      await this.installMiniconda(callback);
    }
  };

  installPytorch = async (callback, delPack) => {
    const data = { id: "pytorch", name: "依赖项2" };
    callback(data);
    if (delPack) {
      await mySpawnSync("conda.bat clean -y --packages");
      await mySpawnSync("conda.bat clean -y --tarballs");
    } else {
      try {
        await myExecSync('conda activate dxc-ai && python -c "import torch; print(torch.__version__)"');
        data.finish = true;
        callback(data);
        return;
      } catch ($e) {}
    }
    try {
      await mySpawnSync(
        "conda.bat install -y -n dxc-ai  pytorch==1.13.1 torchvision==0.14.1 torchaudio==0.13.1 pytorch-cuda=11.7 -c pytorch -c nvidia",
      );
    } catch ($e) {
      delPack = true;
    }
    await this.installPytorch(callback, delPack);
  };
  checkLamaCleaner = async (callback) => {
    const data = { id: "installMiniconda", name: "环境检查" };
    callback && callback(data);
    let res;
    try {
      await myExecSync("activate.bat dxc-ai && pip show lama-cleaner");
      res = true;
    } catch (e) {
      res = false;
    }
    data.finish = true;
    callback && callback(data);
    return res;
  };
  installLamaCleaner = async (callback) => {
    const data = { id: "installLamaCleaner", name: "依赖项3" };
    callback(data);
    if (await this.checkLamaCleaner()) {
      data.finish = true;
      callback(data);
      return;
    }
    console.log(3333333);
    await mySpawnSync("activate.bat dxc-ai && pip install lama-cleaner", null, (data) => {
      console.log(3333, data);
    });
    await this.installLamaCleaner(callback);
  };
  task1 = async (callback) => {
    try {
      await this.downloadMiniconda(callback);
      await this.installMiniconda(callback);
      await this.installPytorch(callback);
      await this.installLamaCleaner(callback);
      this.finish1 = true;
      this.finish();
    } catch (e) {
      console.log(e);
    }
  };
  task2 = async (callback) => {
    await this.downloadModel(callback);
    this.finish2 = true;
  };
  finish = () => {
    if (this.finish1 && this.finish2) {
      this.start();
    }
  };
  run = (callback) => {
    this.running = true;
    const data = { id: "running", running: true, port: this.port };
    callback(data);
  };
  close = async () => {
    if (aria2.isStarted) {
      await aria2.close();
    }
    if (this.child) {
      treeKill(this.child.pid);
      this.child = null;
    }
  };
  startLamaCleaner = async (callback) => {
    const data = { id: "start", name: "程序启动中", type: "start" };
    callback(data);
    this.port = await getAvailablePort(14874);
    const command = `activate.bat dxc-ai && lama-cleaner --model=lama --device=cuda --port=${this.port}`;
    const params = ["cmd.exe", ["/c", command]];
    const child = spawn(...params);
    child.stdout.on("data", (data) => {
      console.log(123, data.toString());
    });
    child.stderr.on("data", (data) => {
      console.log(333, data.toString());
      if (data.toString().indexOf("Running on") >= 0) {
        this.run(callback);
      }
    });
    child.on("close", (code) => {
      console.log(777777777777);
      this.running = false;
    });
    this.child = child;
  };
  test = async (callback) => {
    const data = { id: "miniconda3", type: "download", name: "依赖项1" };
    callback(data);
    await sleep(1000);
    callback(data);
    data.finish = true;
    callback(data);
    const data2 = { id: "installMiniconda", name: "依赖项2" };
    callback(data2);
  };
  start = async (callback) => {
    await this.checkMiniconda();
    if (this.running) {
      this.run(callback);
      return;
    }
    if (await this.checkLamaCleaner(callback)) {
      this.startLamaCleaner(callback);
    } else {
      this.task1(callback);
      this.task2(callback);
    }
  };
}
const lamaCleaner = new LamaCleaner();
module.exports = lamaCleaner;
