const aria2c = require("./aria2c");
const path = require("path");
const fs = require("fs");
const deleteFolderRecursive = require("./deleteFolderRecursive");
const AdmZip = require("adm-zip");
const { rename } = require("fs/promises");
const downloadDir = path.join(__dirname, "../../../", "/download/");
const download = async ({ out, dir = downloadDir, url }, callback) => {
  const data = { id: out, type: "download", name: out };
  callback(data);
  await aria2c.download(url, { dir, out }, (res) => {
    data.data = res;
    callback(data);
  });
  data.finish = true;
  callback(data);
};

const batchDownload = async (downloadList, callback) => {
  const task = [];
  for (const item of downloadList) {
    task.push(download(item, callback));
  }
  await Promise.all(task);
};
const unzip = async ({ out, dir = downloadDir, toDir }, callback) => {
  if (!toDir) toDir = dir;
  const data = { id: `unzip_${out}`, name: `解压${out}` };
  callback(data);
  const target = out.replace(".zip", "");
  const to = path.join(toDir, target);
  if (fs.existsSync(to)) {
    await deleteFolderRecursive(to);
  }
  const from = path.join(dir, out);
  const zip = new AdmZip(from);
  zip.extractAllTo(dir, true);
  const firstFolder = zip.getEntries()[0].entryName.split("/")[0];
  await rename(path.join(dir, firstFolder), to);
  data.finish = true;
  callback(data);
  return to;
};

module.exports = { download, batchDownload, unzip };
