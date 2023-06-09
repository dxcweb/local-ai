const { exec } = require("child_process");
const myExecSync = (params) => {
  return new Promise((resolve, reject) => {
    exec(params, (error, stdout, stderr) => {
      if (error) {
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
  });
};

module.exports = myExecSync;
