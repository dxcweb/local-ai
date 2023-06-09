const { spawn } = require("child_process");
var kill = require("tree-kill");
const mySpawnSync = (command, stdout, stderr) => {
  return new Promise((resolve, reject) => {
    // if (params.length === 1 && typeof params[0] === "string") {

    // }
    const params = ["cmd.exe", ["/c", command]];
    const child = spawn(...params);
    child.stdout.on("data", (data) => {
      stdout && stdout(data.toString());
    });
    child.stderr.on("data", (data) => {
      stderr && stderr(data.toString());
    });
    child.on("close", (code) => {
      console.error(`close: ${code}`);
      if (code === 0) {
        resolve();
      } else {
        reject();
      }
    });
  });
};
module.exports = mySpawnSync;
