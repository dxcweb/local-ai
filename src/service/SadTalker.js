const aria2c = require("../utils/aria2c");
const { download, unzip, batchDownload } = require("../utils/download");
const CondaBase = require("./CondaBase");
const path = require("path");
const fs = require("fs");
const getAvailablePort = require("../utils/getAvailablePort");
const is = require("electron-is");
const { exec } = require("child_process");
const sleep = require("../utils/sleep");
const myExecSync = require("../utils/myExecSync");
const { writeFile } = require("fs/promises");
const checkPort = require("../utils/checkPort");
const treeKill = require("tree-kill");
class SadTalker {
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
    this.pkgPath = path.join(this.libPath, "SadTalker");
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
  install = async (callback) => {
    await this.conda.install(callback);
    await this.conda.installffmpeg(callback);
  };
  //   b746106
  downloadPkg = async (callback) => {
    await download({ out: "SadTalker.zip", url: "https://ghproxy.com/https://github.com/OpenTalker/SadTalker/archive/b746106abb880b4b2e8f8188e0dbeea3f8117d3b.zip" }, callback);
  };
  move = async (callback) => {
    if (!fs.existsSync(this.pkgPath)) {
      await unzip({ out: "SadTalker.zip", toDir: this.libPath }, callback);
    }
  };
  installPkg = async (callback) => {};
  installRequirements = async (callback) => {
    const data = { id: `installRequirements`, name: "安装依赖" };
    callback(data);
    process.env.PIP_INDEX_URL = "https://pypi.mirrors.ustc.edu.cn/simple/";
    await this.conda.spawn(`pip install -r ${path.join(this.pkgPath, "requirements.txt")} --prefer-binary`, { log: true });
    data.finish = true;
    callback(data);
  };
  downloadModels = async (callback) => {
    const checkpointsPath = path.join(this.pkgPath, "checkpoints");
    const weightsPath = path.join(this.pkgPath, "gfpgan/weights");
    const downloadList = [
      {
        url: "https://ghproxy.com/https://github.com/Winfredy/SadTalker/releases/download/v0.0.2/auido2exp_00300-model.pth",
        out: "auido2exp_00300-model.pth",
        dir: checkpointsPath,
      },
      {
        url: "https://ghproxy.com/https://github.com/Winfredy/SadTalker/releases/download/v0.0.2/auido2pose_00140-model.pth",
        out: "auido2pose_00140-model.pth",
        dir: checkpointsPath,
      },
      { url: "https://ghproxy.com/https://github.com/Winfredy/SadTalker/releases/download/v0.0.2/epoch_20.pth", out: "epoch_20.pth", dir: checkpointsPath },
      {
        url: "https://ghproxy.com/https://github.com/Winfredy/SadTalker/releases/download/v0.0.2/facevid2vid_00189-model.pth.tar",
        out: "facevid2vid_00189-model.pth.tar",
        dir: checkpointsPath,
      },
      {
        url: "https://ghproxy.com/https://github.com/Winfredy/SadTalker/releases/download/v0.0.2/shape_predictor_68_face_landmarks.dat",
        out: "shape_predictor_68_face_landmarks.dat",
        dir: checkpointsPath,
      },
      { url: "https://ghproxy.com/https://github.com/Winfredy/SadTalker/releases/download/v0.0.2/wav2lip.pth", out: "wav2lip.pth", dir: checkpointsPath },
      {
        url: "https://ghproxy.com/https://github.com/Winfredy/SadTalker/releases/download/v0.0.2/mapping_00229-model.pth.tar",
        out: "mapping_00229-model.pth.tar",
        dir: checkpointsPath,
      },
      {
        url: "https://ghproxy.com/https://github.com/Winfredy/SadTalker/releases/download/v0.0.2/mapping_00109-model.pth.tar",
        out: "mapping_00109-model.pth.tar",
        dir: checkpointsPath,
      },
      { url: "https://ghproxy.com/https://github.com/Winfredy/SadTalker/releases/download/v0.0.2/BFM_Fitting.zip", out: "BFM_Fitting.zip", dir: checkpointsPath },
      { url: "https://ghproxy.com/https://github.com/Winfredy/SadTalker/releases/download/v0.0.2/hub.zip", out: "hub.zip", dir: checkpointsPath },
      { url: "https://ghproxy.com/https://github.com/xinntao/facexlib/releases/download/v0.1.0/alignment_WFLW_4HG.pth", out: "alignment_WFLW_4HG.pth", dir: weightsPath },
      {
        url: "https://ghproxy.com/https://github.com/xinntao/facexlib/releases/download/v0.1.0/detection_Resnet50_Final.pth",
        out: "detection_Resnet50_Final.pth",
        dir: weightsPath,
      },
      { url: "https://ghproxy.com/https://github.com/TencentARC/GFPGAN/releases/download/v1.3.0/GFPGANv1.4.pth", out: "GFPGANv1.4.pth", dir: weightsPath },
      { url: "https://ghproxy.com/https://github.com/xinntao/facexlib/releases/download/v0.2.2/parsing_parsenet.pth", out: "parsing_parsenet.pth", dir: weightsPath },
    ];
    await batchDownload(downloadList, callback);
    await unzip({ out: "BFM_Fitting.zip", dir: checkpointsPath }, callback);
    await unzip({ out: "hub.zip", dir: checkpointsPath }, callback);
  };
  runWebUi = async (callback) => {
    const data = { id: "start", name: "程序启动中", type: "start" };
    callback(data);
    this.port = await getAvailablePort(18878);
    const command = `python -c "import app;app.sadtalker_demo().launch(share=False,server_name='0.0.0.0', server_port=${this.port})"`;
    if (is.windows()) {
      const commandToRun = `activate ${this.conda.envName} && ${command}`;
      const script = `start "dxcweb-sad-talker" cmd.exe /K "${commandToRun}"`;

      exec(script, { env: { ...process.env }, cwd: this.pkgPath });
      const windowTitle = "dxcweb-sad-talker";
      await sleep(1000);
      const stdout = await myExecSync(`tasklist /v | findstr "${windowTitle}"`);
      let regex = /(\d+)\s+Console/;
      let match2 = stdout.match(regex);
      if (match2) {
        this.sd_pid = match2[1];
        console.log(3, "pid", this.sd_pid);
      }
    } else {
      let commandToRun = `export PATH=${this.conda.installPath}bin:$PATH && source activate  ${this.conda.envName} && export PYTORCH_ENABLE_MPS_FALLBACK=1 && cd ${this.pkgPath} && ${command}`;
      // if (os.cpus()[0].model.indexOf("Intel") >= 0) {
      //   commandToRun += " --no-half --opt-split-attention-v1 --medvram --use-cpu=all";
      // } else {
      //   commandToRun += " --use-cpu=interrogate";
      // }
      const script = `tell application "Terminal" to do script "${commandToRun}"`;
      const child = exec(`osascript -e '${script}'`, { env: { ...process.env } }, () => {});
      this.sd_pid = child.pid;
    }
    this.checkRun(callback);
  };
  checkRun = async (callback) => {
    if (!(await checkPort(this.port))) {
      this.runningCallback(callback);
    } else {
      await sleep(200);
      await this.checkRun(callback);
    }
  };
  start = async (callback) => {
    if (this.running) {
      this.runningCallback(callback);
      return;
    }
    const mark = path.join(this.pkgPath, "completed.dxc");
    if (!fs.existsSync(mark)) {
      await Promise.all([this.install(callback), this.downloadPkg(callback)]);
      await this.move(callback);
      await this.installRequirements(callback);
      await this.downloadModels(callback);
      aria2c.close();
      await writeFile(mark, "");
    }
    await this.runWebUi(callback);
  };
}
const sadTalker = new SadTalker();
module.exports = sadTalker;
