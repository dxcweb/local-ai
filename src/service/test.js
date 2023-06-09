const bytesToSize = require("../utils/bytesToSize");
const getProtocol = require("../utils/getProtocol");

const getFileSize = (url) => {
  return new Promise((resolve, reject) => {
    const { _http, options } = getProtocol(url);
    options.method = "HEAD";
    _http
      .request(options, (res) => {
        const { statusCode } = res;
        if (statusCode === 200 || statusCode === 206) {
          console.log(`文件大小：${res.headers["content-length"]}`);
          resolve(res.headers["content-length"]);
        } else {
          reject(new Error("文件下载失败,错误码：" + statusCode));
        }
      })
      .end();
  });
};
const test = async (callback) => {
  const data = { id: "downloadMiniconda", type: "download", name: "下载测试" };
  callback(data);
  const url = "https://repo.anaconda.com/miniconda/Miniconda3-py39_23.3.1-0-Windows-x86_64.exe";
  const totalSize = await getFileSize(url);
  const { _http, options } = getProtocol(url);
  let completedSize = 0;
  this.response = _http.get(options, (res) => {
    const { statusCode } = res;
    if (statusCode === 200 || statusCode === 206) {
      res.on("data", (chunk) => {
        const len = chunk.byteLength;
        completedSize += len;
        data.data = {
          completedSize: bytesToSize(completedSize),
          totalSize: bytesToSize(totalSize),
          downloadSpeed: "N",
          percent: ((completedSize / totalSize) * 100).toFixed(2),
          status: "active",
        };
        callback(data);
      });
    } else {
    }
  });
};
module.exports = test;
