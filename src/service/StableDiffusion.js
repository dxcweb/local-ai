const AdmZip = require("adm-zip");
const aria2c = require("../utils/aria2c");
const CondaBase = require("./CondaBase");
const fs = require("fs");
const { writeFile, unlink } = require("fs").promises;
const path = require("path");
const { rename, readdir } = require("fs/promises");
const deleteFolderRecursive = require("../utils/deleteFolderRecursive");
const getAvailablePort = require("../utils/getAvailablePort");
const killChild = require("../utils/killChild");
const checkPort = require("../utils/checkPort");
const sleep = require("../utils/sleep");
const { exec, spawn } = require("child_process");
const is = require("electron-is");
const treeKill = require("tree-kill");
const myExecSync = require("../utils/myExecSync");
const os = require("os");
class StableDiffusion {
  constructor() {
    this.conda = new CondaBase({
      pythonVersion: "3.10.6",
      envName: "dxc-sd",
      pytorchVersion: "2.0.1",
      torchvisionVersion: "0.15.2",
      torchaudioVersion: "2.0.2",
      cudaVersion: "11.8",
    });
    // this.conda = new CondaBase({
    //   pythonVersion: "3.10.6",
    //   envName: "dxc-sd2",
    //   pytorchVersion: "2.0.0",
    //   torchvisionVersion: "0.15.0",
    //   torchaudioVersion: "2.0.0",
    //   cudaVersion: "11.8",
    // });
    this.downloadList = {
      gfpgan: "https://ghproxy.com/https://github.com/TencentARC/GFPGAN/archive/8d2447a2d918f8eba5a4a01463fd48e45126a379.zip",
      clip: "https://ghproxy.com/https://github.com/openai/CLIP/archive/d50d76daa670286dd6cacf3bcd80b5e4823fc8e1.zip",
      open_clip: "https://ghproxy.com/https://github.com/mlfoundations/open_clip/archive/bb6e834e9c70d9c27d0dc3ecedeebeaeb1ffad6b.zip",
      "stable-diffusion-stability-ai": "https://ghproxy.com/https://github.com/Stability-AI/stablediffusion/archive/cf1d67a6fd5ea1aa600c4df58e5b47da45f6bdbf.zip",
      "taming-transformers": "https://ghproxy.com/https://github.com/CompVis/taming-transformers/archive/24268930bf1dce879235a7fddd0b2355b84d7ea6.zip",
      // "k-diffusion": "https://ghproxy.com/https://github.com/crowsonkb/k-diffusion/archive/5b3af030dd83e0297272d861c19477735d0317ec.zip",
      "k-diffusion": "https://ghproxy.com/https://github.com/crowsonkb/k-diffusion/archive/51c9778f269cedb55a4d88c79c0246d35bdadb71.zip",
      CodeFormer: "https://ghproxy.com/https://github.com/sczhou/CodeFormer/archive/c5b4593074ba6214284d6acd5f1719b6c5d739af.zip",
      BLIP: "https://ghproxy.com/https://github.com/salesforce/BLIP/archive/48211a1594f1321b00f14c9f7a5b4813144b2fb9.zip",
      stable_diffusion_webui: "https://ghproxy.com/https://github.com/AUTOMATIC1111/stable-diffusion-webui/archive/refs/tags/v1.2.1.zip",
    };
    this.appPath = process.env.appPath || path.join(__dirname, "../../../");
    this.downloadDir = path.join(this.appPath, "/download/");
    this.webuiPath = path.join(this.appPath, "lib/stable_diffusion_webui");
    this.webuiDataPath = path.join(this.appPath, "lib/webui_data");

    // process.env.VENV_DIR = path.join(this.webuiPath, "venv");
  }
  download = async (key, url, callback) => {
    const file = key + ".zip";
    const data = { id: key, type: "download", name: key };
    callback(data);
    await aria2c.download(url, { dir: this.downloadDir, out: file }, (res) => {
      data.data = res;
      callback(data);
    });
    data.finish = true;
    callback(data);
  };
  batchDownload = async (callback) => {
    const task = [];
    for (const key in this.downloadList) {
      const url = this.downloadList[key];
      task.push(this.download(key, url, callback));
    }
    await Promise.all(task);
  };
  close = async () => {
    await this.conda.close();
    await aria2c.close();
    // this.child.kill()
    if (this.sd_pid) {
      try {
        if (is.windows()) {
          treeKill(this.sd_pid);
        } else {
          exec(`kill ${this.sd_pid + 1}`);
        }
      } catch (e) {}
    }

    // killChild(this.child);
  };
  unzip = async (key) => {
    const dir = path.join(this.downloadDir, key, "/");
    if (fs.existsSync(dir)) {
      await deleteFolderRecursive(dir);
    }
    const filePath = path.join(this.downloadDir, key + ".zip");
    const zip = new AdmZip(filePath);
    zip.extractAllTo(this.downloadDir, true);

    await rename(path.join(this.downloadDir, zip.getEntries()[0].entryName), dir);
    return dir;
  };
  pipInstall = async (key, callback) => {
    const data = { id: `${key}-install`, name: key };
    callback(data);
    // await this.conda.exec(`pip show ${key}`);
    const dir = await this.unzip(key);
    await this.conda.exec(`pip install ${dir} --prefer-binary`);
    await deleteFolderRecursive(dir);
    data.finish = true;
    callback(data);
  };
  batchPipInstall = async (callback) => {
    const keys = ["gfpgan", "clip", "open_clip"];
    for (const key of keys) {
      await this.pipInstall(key, callback);
    }
  };
  installPkg = async (callback) => {
    const data = { id: `installPkg`, name: "StableDiffusion" };
    callback(data);

    await this.conda.exec("pip install pyngrok==6.0.0 --prefer-binary");

    const lpips = path.join(this.webuiPath, "repositories/CodeFormer/requirements.txt");
    await this.conda.exec(`pip install -r ${lpips} --prefer-binary`);

    const webui = path.join(this.webuiPath, "requirements.txt");
    await this.conda.exec(`pip install -r ${webui} --prefer-binary`);
    if (is.windows()) {
      await this.conda.pipInstall("xformers==0.0.20", callback, "huawei");
    }
    data.finish = true;
    callback(data);
  };
  move = async (callback) => {
    const data = { id: `move`, name: "解压" };
    callback(data);
    if (!fs.existsSync(this.webuiPath)) {
      const stable_diffusion_webui = await this.unzip("stable_diffusion_webui");
      await rename(stable_diffusion_webui, this.webuiPath);

      const files = await readdir(path.join(this.webuiPath, "models"));
      const modelsPath = path.join(this.webuiDataPath, "models");
      fs.mkdirSync(modelsPath, { recursive: true });
      for (const file of files) {
        const newPath = path.join(modelsPath, file);
        if (!fs.existsSync(newPath)) {
          await rename(path.join(this.webuiPath, "models", file), newPath);
        }
      }
    }
    const repositories = path.join(this.webuiPath, "repositories");
    fs.mkdirSync(repositories, { recursive: true });
    const keys = ["stable-diffusion-stability-ai", "taming-transformers", "k-diffusion", "CodeFormer", "BLIP"];
    for (const key of keys) {
      const dir = path.join(repositories, key);
      if (!fs.existsSync(dir)) {
        const oldDir = await this.unzip(key);
        await rename(oldDir, dir);
      }
    }
    data.finish = true;
    callback(data);
  };
  // downloadModels = async (callback) => {
  //   const mark = path.join(this.webuiPath, "downloadModels.dxc");
  //   if (fs.existsSync(mark)) return;
  //   const dir = path.join(this.webuiDataPath, "models/Stable-diffusion/");
  //   const data = { id: "v1-5-pruned-emaonly.safetensors", type: "download", name: "v1-5-pruned-emaonly.safetensors" };
  //   callback(data);
  //   await aria2c.download(
  //     "https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.safetensors",
  //     { dir, out: "v1-5-pruned-emaonly.safetensors" },
  //     (res) => {
  //       data.data = res;
  //       callback(data);
  //     },
  //   );
  //   data.finish = true;
  //   callback(data);
  //   await writeFile(mark, "");
  // };
  downloadModels = async (callback) => {
    const mark = path.join(this.webuiPath, "downloadModels.dxc");
    if (fs.existsSync(mark)) return;
    const dir = path.join(this.webuiDataPath, "models/Stable-diffusion/");
    const data = { id: "XXMix_9realistic_v3.0.safetensors", type: "download", name: "XXMix_9realistic_v3.0.safetensors" };
    callback(data);
    await aria2c.download(
      "https://down.liblibai.com/web/model/2030eae609c583da58d698261dfc9b504b143a32892b252e9841577f464df4fb.safetensors",
      { dir, out: "XXMix_9realistic_v3.0.safetensors" },
      (res) => {
        data.data = res;
        callback(data);
      },
    );
    data.finish = true;
    callback(data);
    await writeFile(mark, "");
  };

  installGit = async (callback) => {
    try {
      await this.conda.exec("git --version");
    } catch (e) {
      const data = { id: "git", name: "git" };
      callback(data);
      await this.conda.exec(`conda install -y -n ${this.conda.envName} git`);
      data.finish = true;
      callback(data);
    }
  };
  install = async (callback) => {
    const mark = path.join(this.webuiPath, "completed.dxc");
    if (fs.existsSync(mark)) {
      return;
    }
    process.env.PIP_INDEX_URL = "https://pypi.mirrors.ustc.edu.cn/simple/";
    await Promise.all([this.conda.install(callback), this.batchDownload(callback)]);
    await this.batchPipInstall(callback);
    await this.move(callback);
    await this.installPkg(callback);
    await writeFile(mark, "");
  };
  checkRun = async (callback) => {
    if (!(await checkPort(this.port))) {
      this.runningCallback(callback);
    } else {
      await sleep(200);
      await this.checkRun(callback);
    }
  };
  runWebUi = async (callback) => {
    const data = { id: "start", name: "程序启动中", type: "start" };
    callback(data);
    this.port = await getAvailablePort(18778);
    const command = `python ${path.join(this.webuiPath, "webui.py")} --data-dir=${this.webuiDataPath} --port=${this.port}`;
    if (is.windows()) {
      const commandToRun = `activate dxc-sd && ${command} --xformers`;
      const script = `start "dxcweb-stable-diffusion" cmd.exe /K "${commandToRun}"`;

      exec(script, { env: { ...process.env }, cwd: this.webuiPath });
      const windowTitle = "dxcweb-stable-diffusion";
      await sleep(1000);
      const stdout = await myExecSync(`tasklist /v | findstr "${windowTitle}"`);
      let regex = /(\d+)\s+Console/;
      let match2 = stdout.match(regex);
      if (match2) {
        this.sd_pid = match2[1];
        console.log(3, "pid", this.sd_pid);
      }

      // const proc = spawn("cmd", ["/c", "start", "/B", path.join(__dirname, "xxx.bat")], {
      //   detached: true,
      //   cwd: this.webuiPath,
      //   env: {
      //     pid: process.pid,
      //   },
      // });
      // console.log(333, proc.pid);
      // proc.unref();
      // setTimeout(() => {
      //   console.log(7789798);
      //   treeKill(proc.pid);
      // }, 3000);
    } else {
      // --no-half
      let commandToRun = `export PATH=${this.conda.installPath}bin:$PATH && source activate dxc-sd && export PYTORCH_ENABLE_MPS_FALLBACK=1 && cd ${this.webuiPath} && ${command} --skip-torch-cuda-test --upcast-sampling --no-half-vae`;
      if (os.cpus()[0].model.indexOf("Intel") >= 0) {
        commandToRun += " --no-half --opt-split-attention-v1 --medvram --use-cpu=all";
      } else {
        commandToRun += " --use-cpu=interrogate";
      }
      const script = `tell application "Terminal" to do script "${commandToRun}"`;
      const child = exec(`osascript -e '${script}'`, { env: { ...process.env } }, () => {});
      this.sd_pid = child.pid;
    }
    // const command = `${path.join(this.webuiPath, "webui.bat")}`;
    // this.conda.spawn(command, {
    //   cwd: this.webuiPath,
    //   log: true,
    //   stdout: (data) => {
    //     if (data.indexOf("Running on") >= 0) {
    //       this.runningCallback(callback);
    //     }
    //   },
    //   getChild: (child) => (this.child = child),
    // });

    // const terminal = '/System/Applications/Utilities/Terminal.app/Contents/MacOS/Terminal'
    // const shFilePath = path.join(__dirname,'xxx.sh')
    //  this.child = spawn(terminal, [shFilePath,'xxx']);
    this.checkRun(callback);
  };
  runningCallback = (callback) => {
    this.running = true;
    const data = { id: "running", running: true, port: this.port };
    callback(data);
  };
  start = async (callback) => {
    if (this.running) {
      this.runningCallback(callback);
      return;
    }
    await Promise.all([this.install(callback), this.downloadModels(callback)]);
    await this.installGit(callback);
    aria2c.close();
    await this.runWebUi(callback);
  };
}

const stableDiffusion = new StableDiffusion();
module.exports = stableDiffusion;
