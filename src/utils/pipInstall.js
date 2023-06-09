const pipInstall = async (conda, packages, callback, image) => {
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
    const res = await conda.spawn(`pip install ${pkg}  --prefer-binary`, { log: true });
    if (res !== 0) {
      throw new Error(`${pkg} 安装失败`);
    }
    data.finish = true;
    callback(data);
  }
};
module.exports = pipInstall;
