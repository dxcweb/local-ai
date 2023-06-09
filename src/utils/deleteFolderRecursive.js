const { existsSync } = require("fs");

const fs = require("fs").promises;
const deleteFolderRecursive = async (path) => {
  if (existsSync(path)) {
    const files = await fs.readdir(path);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const curPath = path + "/" + file;
      if ((await fs.lstat(curPath)).isDirectory()) {
        // 递归删除子文件夹
        await deleteFolderRecursive(curPath);
      } else {
        // 删除文件
        await fs.unlink(curPath);
      }
    }
    await fs.rmdir(path);
  }
};

module.exports = deleteFolderRecursive;
