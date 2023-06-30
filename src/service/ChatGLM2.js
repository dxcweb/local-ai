const CondaBase = require("./CondaBase");
const path = require("path");
const aria2c = require("../utils/aria2c");
const is = require("electron-is");
const treeKill = require("tree-kill");
const { exec } = require("child_process");
const { download, unzip } = require("../utils/download");
const { existsSync } = require("fs");
const getAvailablePort = require("../utils/getAvailablePort");
const sleep = require("../utils/sleep");
const myExecSync = require("../utils/myExecSync");
const checkPort = require("../utils/checkPort");
const { cpus } = require("os");
const { writeFile } = require("fs/promises");
const os = require("os");
class ChatGLM2 {
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
    this.sourcePath = path.join(this.libPath, "ChatGLM2");
    this.modelPath = path.join(this.libPath, "chatglm2-6b");
    this.isInt4 = is.macOS() && os.totalmem() < 13927680000;
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
  downloadSource = async (callback) => {
    await download({ out: "ChatGLM2.zip", url: "https://ghproxy.com/https://github.com/THUDM/ChatGLM2-6B/archive/53f0106.zip" }, callback);
    if (!existsSync(this.sourcePath)) {
      await unzip({ out: "ChatGLM2.zip", toDir: this.libPath }, callback);
    }
  };
  installPkg = async (callback) => {
    await this.conda.pipInstall("transformers==4.30.2", callback, "aliyun");
    await this.conda.pipInstall("protobuf", callback);
    await this.conda.pipInstall("cpm_kernels", callback);
    await this.conda.pipInstall("gradio", callback);
    await this.conda.pipInstall("mdtex2html", callback);
    await this.conda.pipInstall("sentencepiece", callback);
    await this.conda.pipInstall("accelerate", callback);
    // const data = { id: "install", name: "安装依赖" };
    // callback(data);
    // await this.conda.spawn(`pip install -r ${path.join(this.sourcePath, "requirements.txt")} --prefer-binary`, { log: true });
    // data.finish = true;
    // callback(data);
  };
  downloadModels = async (callback) => {
    if (this.isInt4) {
      await download(
        {
          out: "pytorch_model.bin",
          url: "https://cloud.tsinghua.edu.cn/d/674208019e314311ab5c/files/?p=%2Fchatglm2-6b-int4%2Fpytorch_model.bin&dl=1",
          dir: this.modelPath,
        },
        callback,
      );
    } else {
      await Promise.all([
        download(
          {
            out: "pytorch_model-00001-of-00007.bin",
            url: "https://cloud.tsinghua.edu.cn/d/674208019e314311ab5c/files/?p=%2Fchatglm2-6b%2Fpytorch_model-00001-of-00007.bin&dl=1",
            dir: this.modelPath,
          },
          callback,
        ),
        download(
          {
            out: "pytorch_model-00002-of-00007.bin",
            url: "https://cloud.tsinghua.edu.cn/d/674208019e314311ab5c/files/?p=%2Fchatglm2-6b%2Fpytorch_model-00002-of-00007.bin&dl=1",
            dir: this.modelPath,
          },
          callback,
        ),
        download(
          {
            out: "pytorch_model-00003-of-00007.bin",
            url: "https://cloud.tsinghua.edu.cn/d/674208019e314311ab5c/files/?p=%2Fchatglm2-6b%2Fpytorch_model-00003-of-00007.bin&dl=1",
            dir: this.modelPath,
          },
          callback,
        ),
        download(
          {
            out: "pytorch_model-00004-of-00007.bin",
            url: "https://cloud.tsinghua.edu.cn/d/674208019e314311ab5c/files/?p=%2Fchatglm2-6b%2Fpytorch_model-00004-of-00007.bin&dl=1",
            dir: this.modelPath,
          },
          callback,
        ),
        download(
          {
            out: "pytorch_model-00005-of-00007.bin",
            url: "https://cloud.tsinghua.edu.cn/d/674208019e314311ab5c/files/?p=%2Fchatglm2-6b%2Fpytorch_model-00005-of-00007.bin&dl=1",
            dir: this.modelPath,
          },
          callback,
        ),
        download(
          {
            out: "pytorch_model-00006-of-00007.bin",
            url: "https://cloud.tsinghua.edu.cn/d/674208019e314311ab5c/files/?p=%2Fchatglm2-6b%2Fpytorch_model-00006-of-00007.bin&dl=1",
            dir: this.modelPath,
          },
          callback,
        ),
        download(
          {
            out: "pytorch_model-00007-of-00007.bin",
            url: "https://cloud.tsinghua.edu.cn/d/674208019e314311ab5c/files/?p=%2Fchatglm2-6b%2Fpytorch_model-00007-of-00007.bin&dl=1",
            dir: this.modelPath,
          },
          callback,
        ),
      ]);
    }
  };
  downloadConfig = async (callback) => {
    if (this.isInt4) {
      await download({ out: "chatglm2-6b.zip", url: "https://gitee.com/dxcweb/local-ai/releases/download/1.6.0/chatglm2-6b-int4.zip" }, callback);
      if (!existsSync(path.join(this.libPath, "chatglm2-6b"))) {
        await unzip({ out: "chatglm2-6b.zip", toDir: this.libPath }, callback);
      }
    } else {
      await download({ out: "chatglm2-6b.zip", url: "https://gitee.com/dxcweb/local-ai/releases/download/1.6.0/chatglm2-6b.zip" }, callback);
      if (!existsSync(path.join(this.libPath, "chatglm2-6b"))) {
        await unzip({ out: "chatglm2-6b.zip", toDir: this.libPath }, callback);
      }
    }
  };
  checkRun = async () => {
    if (!(await checkPort(this.port))) {
      return this.port;
    } else {
      await sleep(200);
      return await this.checkRun();
    }
  };
  runWebUi = async (quantize) => {
    const pythonPath = path.join(__dirname, "../api");
    this.port = await getAvailablePort(18000);
    let command = `python ChatGLM2.py --path=${this.modelPath} --port=${this.port}`;
    if (quantize) {
      command += ` --quantize=${quantize}`;
    }
    if (is.windows()) {
      command += ` --device=cuda`;
      const commandToRun = `activate ${this.conda.envName} && ${command}`;
      const windowTitle = "dxcweb-chat-glm2";
      const script = `start "${windowTitle}" cmd.exe /K "${commandToRun}"`;

      exec(script, { env: { ...process.env }, cwd: pythonPath });

      await sleep(1000);
      const stdout = await myExecSync(`tasklist /v | findstr "${windowTitle}"`);
      let regex = /(\d+)\s+Console/;
      let match2 = stdout.match(regex);
      if (match2) {
        this.sd_pid = match2[1];
      }
    } else {
      // command = command.replace(/"/g, '\\"');
      if (cpus()[0].model.indexOf("Intel") >= 0) {
        command += " --device=cpu";
      } else {
        command += " --device=mps";
        command = `export PYTORCH_ENABLE_MPS_FALLBACK=1 && ${command}`;
      }
      let commandToRun = `export PATH=${this.conda.installPath}bin:$PATH && source activate  ${this.conda.envName}  && cd ${pythonPath} && ${command}`;
      const script = `tell application "Terminal" to do script "${commandToRun}"`;
      const child = exec(`osascript -e '${script}'`, { env: { ...process.env } }, () => {});
      this.sd_pid = child.pid;
    }
    return await this.checkRun();
  };
  start = async (callback) => {
    const mark = path.join(this.modelPath, "completed.dxc");
    if (!existsSync(mark)) {
      await Promise.all([this.conda.install(callback), this.downloadConfig(callback)]);
      await this.installPkg(callback);
      await this.downloadModels(callback);
      aria2c.close();
      await writeFile(mark, "");
    }
    if (this.port) {
      const data = { id: "running", running: true, port: this.port };
      callback(data);
    } else {
      if (is.windows()) {
        const data = { id: "running", running: true, to: "/ChatGLM2/option" };
        callback(data);
      } else {
        const data = { id: "start", name: "程序启动中", type: "start" };
        callback(data);
        await this.runWebUi();
        callback({ id: "running", running: true, port: this.port });
      }
    }
  };
}
const chatGLM2 = new ChatGLM2();
module.exports = chatGLM2;
