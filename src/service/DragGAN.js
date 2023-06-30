const treeKill = require("tree-kill");
const aria2c = require("../utils/aria2c");
const { exec } = require("child_process");
const CondaBase = require("./CondaBase");
const is = require("electron-is");
const { download, unzip } = require("../utils/download");
const path = require("path");
const fs = require("fs");
class DragGAN {
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
    this.modelPath = path.join(this.libPath, "checkpoints");
    this.pkgPath = path.join(this.libPath, "DragGAN");
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
    const data = { id: "running", running: true, port: this.port };
    callback(data);
  };
  downloadPkg = async (callback) => {
    await download({ out: "DragGAN.zip", url: "https://ghproxy.com/https://github.com/XingangPan/DragGAN/archive/651edb9.zip" }, callback);
  };
  move = async (callback) => {
    if (!fs.existsSync(this.pkgPath)) {
      await unzip({ out: "DragGAN.zip", toDir: this.libPath }, callback);
    }
  };
  install = async (callback) => {
    const data = { id: "install", name: "安装依赖" };
    callback(data);
    // await this.conda.spawn("conda install -y numpy>=1.25 click>=8.0 pillow=9.4.0 requests=2.26.0 tqdm=4.62.2 ninja=1.10.2 matplotlib=3.4.2 imageio=2.9.0", { log: true });
    // await this.conda.spawn("conda install -y cudatoolkit -c https://mirrors.aliyun.com/anaconda/cloud/nvidia/", { log: true });
    // await this.conda.spawn("conda install -y  scipy=1.11.0 -c conda-forge", { log: true });
    await this.conda.spawn(`pip install -r ${path.join(this.pkgPath, "requirements.txt")} --prefer-binary`, { log: true });
    data.finish = true;
    callback(data);
  };
  pipInstall = async (callback) => {
    await this.conda.pipInstall("imgui==2.0.0", callback);
    await this.conda.pipInstall("glfw==2.6.1", callback, "aliyun");
    await this.conda.pipInstall("gradio==3.35.2", callback, "aliyun");
    await this.conda.pipInstall("pyopengl==3.1.5", callback);
    await this.conda.pipInstall("imageio-ffmpeg==0.4.3", callback);
    await this.conda.pipInstall("pyspng-seunglab", callback);
  };
  downloadModels = async (callback) => {
    await Promise.all([
      download({ out: "stylegan2_lions_512_pytorch.pkl", url: "https://storage.googleapis.com/self-distilled-stylegan/lions_512_pytorch.pkl", dir: this.modelPath }, callback),
      download({ out: "stylegan2_dogs_1024_pytorch.pkl", url: "https://storage.googleapis.com/self-distilled-stylegan/dogs_1024_pytorch.pkl", dir: this.modelPath }, callback),
      download({ out: "stylegan2_horses_256_pytorch.pkl", url: "https://storage.googleapis.com/self-distilled-stylegan/horses_256_pytorch.pkl", dir: this.modelPath }, callback),
      download(
        { out: "stylegan2_elephants_512_pytorch.pkl", url: "https://storage.googleapis.com/self-distilled-stylegan/elephants_512_pytorch.pkl", dir: this.modelPath },
        callback,
      ),
      download(
        {
          out: "stylegan2-ffhq-512x512.pkl",
          url: "https://api.ngc.nvidia.com/v2/models/nvidia/research/stylegan2/versions/1/files/stylegan2-ffhq-512x512.pkl",
          dir: this.modelPath,
        },
        callback,
      ),
      download(
        {
          out: "stylegan2-afhqcat-512x512.pkl",
          url: "https://api.ngc.nvidia.com/v2/models/nvidia/research/stylegan2/versions/1/files/stylegan2-afhqcat-512x512.pkl",
          dir: this.modelPath,
        },
        callback,
      ),
      download({ out: "stylegan2-car-config-f.pkl", url: "http://d36zk2xti64re0.cloudfront.net/stylegan2/networks/stylegan2-car-config-f.pkl", dir: this.modelPath }, callback),
      download({ out: "stylegan2-cat-config-f.pkl", url: "http://d36zk2xti64re0.cloudfront.net/stylegan2/networks/stylegan2-cat-config-f.pkl", dir: this.modelPath }, callback),
    ]);
  };
  start = async (callback) => {
    // await this.downloadPkg(callback);
    // await this.move(callback);
    await this.install(callback);
    // await this.pipInstall(callback);
    // await this.downloadModels(callback);
    // if (this.running) {
    //   this.runningCallback(callback);
    //   return;
    // }
    // const mark = path.join(this.pkgPath, "completed.dxc");
    // if (!fs.existsSync(mark)) {
    //   await Promise.all([this.install(callback), this.downloadPkg(callback)]);
    //   await this.move(callback);
    //   await this.installRequirements(callback);
    //   await this.downloadModels(callback);
    //   aria2c.close();
    //   await writeFile(mark, "");
    // }
    // await this.runWebUi(callback);
  };
}

const dragGAN = new DragGAN();
module.exports = dragGAN;
