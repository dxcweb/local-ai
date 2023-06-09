const fs = require("fs");
const path = require("path");

const checkLamaCleaner = () => {
  const condabin = process.env.condabin;
  if (!fs.existsSync(condabin)) {
    // Miniconda3 安装包
    const minicondaInstall = path.join(process.env.downloadPath, "/Miniconda3-latest-Windows-x86_64.exe");
    if (!fs.existsSync(minicondaInstall)) {
      return { error: 1 };
    } else {
      return { error: 1 };
    }
  }
};
module.exports = checkLamaCleaner;
