const axios = require("axios");
const path = require("path");
const semver = require("semver");
const aria2c = require("../utils/aria2c");
const is = require("electron-is");
const { readFile } = require("fs").promises;
const fs = require("fs");
const { unlink } = require("fs/promises");
const AdmZip = require("adm-zip");
const deleteFolderRecursive = require("../utils/deleteFolderRecursive");
const { spawn } = require("child_process");
const { app } = require("electron");
const containsChinese = require("../utils/containsChinese");

class Updater {
  constructor() {
    this.appPath = path.join(__dirname, "../../");
    this.dir = path.join(this.appPath, "tmp");
    this.fileName = "update.zip";
    this.file = path.join(this.dir, this.fileName);
  }
  checkUpdate = async () => {
    if (is.windows() && containsChinese(this.appPath)) {
      return {
        isUpdate: false,
        appPath: this.appPath,
      };
    }
    const packageBuff = await readFile(path.join(this.appPath, "package.json"));
    const { version: localVersion } = JSON.parse(packageBuff.toString());
    const res = await axios.get("https://gitee.com/dxcweb/local-ai/raw/master/version");
    const { version, force, website, desc } = res.data;
    this.version = version;

    if (semver.gt(force, localVersion)) {
      return { version, force, website };
    }
    const versionDesc = [];
    for (const item of desc) {
      if (semver.gt(item.v, localVersion)) {
        versionDesc.push(item);
      }
    }
    return {
      localVersion,
      isUpdate: semver.gt(version, localVersion),
      version,
      website,
      desc: versionDesc,
    };
  };
  download = async (callback) => {
    const data = { id: "update", type: "download", name: "应用程序" };
    callback(data);

    const pkg = is.windows() ? "window-update.zip" : "mac-update.zip";
    if (fs.existsSync(this.file)) {
      await unlink(this.file);
    }
    const url = `https://gitee.com/dxcweb/local-ai/releases/download/${this.version}/${pkg}`;
    await aria2c.download(url, { dir: this.dir, out: this.fileName }, (res) => {
      data.data = res;
      callback(data);
    });
    data.finish = true;
    callback(data);
  };
  unzip = async (callback) => {
    const data = { id: "unzip", name: "应用程序", typeName: "解压中" };
    callback(data);
    const src = path.join(this.dir, "src");
    const nm = path.join(this.dir, "src");
    if (fs.existsSync(src)) {
      await deleteFolderRecursive(src);
    }
    if (fs.existsSync(nm)) {
      await deleteFolderRecursive(nm);
    }
    const zip = new AdmZip(this.file);
    zip.extractAllTo(this.dir, true, true);
  };
  runShell = async () => {
    const appPath = path.join(__dirname, "../../");
    let command;
    if (is.windows()) {
      command = path.join(appPath, "/update.bat");
      const proc = spawn("cmd", ["/c", "start", "/B", command], {
        detached: true,
        cwd: appPath,
        env: {
          pid: process.pid,
        },
      });
      proc.unref();
    } else {
      command = path.join(appPath, "/update.sh");
      const proc = spawn("bash", ["-c", command], {
        detached: true,
        cwd: appPath,
        env: {
          pid: process.pid,
        },
      });
      proc.unref();
    }
    app.exit();
  };
  update = async (callback) => {
    console.log(33333);
    await this.download(callback);
    aria2c.close();
    await this.unzip(callback);
    this.runShell();
  };
}

const updater = new Updater();
module.exports = updater;
