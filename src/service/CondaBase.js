const is = require("electron-is");
const fs = require("fs");
const path = require("path");
const myExecSync = require("../utils/myExecSync");
const deleteFolderRecursive = require("../utils/deleteFolderRecursive");
const mySpawn = require("../utils/mySpawn");
const killChild = require("../utils/killChild");
const aria2c = require("../utils/aria2c");
const os = require("os");
const { writeFile, copyFile } = require("fs/promises");
class CondaBase {
  constructor({ envName, pythonVersion, pytorchVersion, torchvisionVersion, torchaudioVersion, cudaVersion }) {
    this.envName = envName;
    this.pythonVersion = pythonVersion;
    this.pytorchVersion = pytorchVersion;
    this.torchvisionVersion = torchvisionVersion;
    this.torchaudioVersion = torchaudioVersion;
    this.cudaVersion = cudaVersion;

    // 是否检查
    this.appPath = path.join(__dirname, "../../../");
    if (is.windows()) {
      this.installName = os.arch() === "x64" ? "Miniconda3-py39_23.3.1-0-Windows-x86_64.exe" : "Miniconda3-py39_4.12.0-Windows-x86.exe";
    } else if (is.macOS()) {
      this.installName = os.cpus()[0].model.indexOf("Intel") >= 0 ? "Miniconda3-py39_23.3.1-0-MacOSX-x86_64.sh" : "Miniconda3-py39_23.3.1-0-MacOSX-arm64.sh";
    }
    this.downloadDir = path.join(this.appPath, "/download/");
    this.downloadPath = path.join(this.downloadDir, this.installName);

    this.installPath = path.join(this.appPath, "/lib/miniconda3/");
    process.env.PATH = this.installPath + (is.windows() ? "condabin;" : "bin:") + process.env.PATH;
    process.env.TORCH_HOME = path.join(this.appPath, "/lib/torch-home/");
    process.env.PIP_INDEX_URL = "https://pypi.mirrors.ustc.edu.cn/simple/";
    this.setCondarc();
  }
  setCondarc = async () => {
    const userDir = os.homedir();
    const filePath = path.join(userDir, ".condarc");
    copyFile(path.join(__dirname, ".condarc"), filePath);
  };
  close = async () => {
    await aria2c.close();
    killChild(this.child);
  };
  checkInstallPath = () => {
    if (this.isInstallPath) return true;
    if (!fs.existsSync(this.installPath)) {
      throw new Error("未安装conda");
    }
    this.isInstallPath = true;
  };
  exec = (command) => {
    this.checkInstallPath();
    const condaCommand = is.windows() ? `activate ${this.envName} && ${command}` : `source activate ${this.envName} && ${command}`;
    return myExecSync(condaCommand);
  };
  spawn = (command, options) => {
    this.checkInstallPath();
    const condaCommand = is.windows() ? `activate ${this.envName} && ${command}` : `source activate ${this.envName} && ${command}`;
    return mySpawn(condaCommand, options);
  };

  downloadMiniconda = async (callback) => {
    if (!this.installName) {
      throw new Error("当前系统不支持");
    }
    if (!fs.existsSync(this.downloadPath) || fs.existsSync(this.downloadPath + ".aria2")) {
      const data = { id: "downloadMiniconda", type: "download", name: this.installName };
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
    if (!fs.existsSync(this.installPath)) {
      return { error: "未找到conda", code: 1 };
    }
    let condaList;
    try {
      condaList = await myExecSync("conda env list");
    } catch (e) {
      return { error: "未找到conda", code: 1 };
    }
    if (condaList.indexOf(this.envName) === -1) {
      return { error: `未找到${this.envName}环境`, code: 2 };
    }
    try {
      await this.exec("python -V");
    } catch (e) {
      return { error: `未找到${this.envName}环境`, code: 2 };
    }
    return { code: 0 };
  };
  installMiniconda = async (callback) => {
    const data = { id: "installMiniconda", name: this.installName };
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
      const envPath = path.join(this.appPath, "/lib/miniconda3/envs/", this.envName);
      if (fs.existsSync(envPath)) {
        try {
          await deleteFolderRecursive(envPath);
        } catch (err) {
          throw new Error("文件删除失败,请重启电脑后重试");
        }
      }
      await myExecSync(`conda create -y -n ${this.envName} python=${this.pythonVersion}`);
    } else if (checkMiniconda.code === 1) {
      throw new Error("未找到conda");
    }
    data.finish = true;
    callback(data);
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
      ? `conda install -y -n ${this.envName} pytorch==${this.pytorchVersion} torchvision==${this.torchvisionVersion} torchaudio==${this.torchaudioVersion} pytorch-cuda=${this.cudaVersion} -c pytorch -c nvidia`
      : `conda install -y -n ${this.envName} pytorch==${this.pytorchVersion} torchvision==${this.torchvisionVersion} torchaudio==${this.torchaudioVersion} -c pytorch`;
    const code = await mySpawn(command, { log: true, getChild: (child) => (this.child = child), stderr: () => (installFailed = true) });
    if (code !== 0 && installFailed) {
      console.log("安装失败，重试");
      delPack = true;
    } else {
      delPack = false;
    }
    await this.installPytorch(callback, delPack);
  };

  installffmpeg = async (callback) => {
    try {
      await this.exec("ffmpeg -version");
    } catch (e) {
      const data = { id: "ffmpeg", name: "ffmpeg" };
      callback(data);
      await this.exec(`conda install -y -n ${this.envName} ffmpeg`);
      data.finish = true;
      callback(data);
    }
  };
  pipInstall = async (packages, callback, image) => {
    if (typeof packages === "string") packages = [packages];

    if (image === "aliyun") {
      process.env.PIP_INDEX_URL = "http://mirrors.aliyun.com/pypi/simple/";
    } else if (image === "huawei") {
      process.env.PIP_INDEX_URL = "https://repo.huaweicloud.com/repository/pypi/simple/";
    } else {
      process.env.PIP_INDEX_URL = "https://pypi.mirrors.ustc.edu.cn/simple/";
    }

    for (let i = 0; i < packages.length; i++) {
      const pkg = packages[i];
      const data = { id: pkg, name: pkg };
      callback(data);
      const res = await this.spawn(`pip install ${pkg}  --prefer-binary`, { log: true });
      if (res !== 0) {
        throw new Error(`${pkg} 安装失败`);
      }
      data.finish = true;
      callback(data);
    }
  };
  install = async (callback) => {
    const mark = path.join(this.installPath, `${this.envName}.mark`);
    if (fs.existsSync(mark)) {
      return;
    }
    await this.downloadMiniconda(callback);
    await this.installMiniconda(callback);
    await this.installEnv(callback);
    if (this.pytorchVersion) {
      await this.installPytorch(callback);
    }
    await writeFile(mark, "");
  };
}

module.exports = CondaBase;
