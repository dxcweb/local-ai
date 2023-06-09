const { spawn } = require("child_process");
const is = require("electron-is");
const baseCommand = is.windows() ? "cmd.exe" : "bash";
const c = is.windows() ? "/c" : "-c";
const mySpawn = (command, options = {}) => {
  const { stdout, stderr, getChild, log, cwd } = options;
  return new Promise((resolve) => {
    const params = [baseCommand, [c, command], { cwd }];
    const child = spawn(...params);
    if (stdout || log) {
      child.stdout.on("data", (data) => {
        log && console.log(data.toString());
        stdout && stdout(data.toString());
      });
    }
    if (stderr || log) {
      child.stderr.on("data", (data) => {
        log && console.log(2, data.toString());
        stderr && stderr(data.toString());
      });
    }

    child.on("close", (code) => {
      resolve(code);
    });
    getChild && getChild(child);
  });
};
module.exports = mySpawn;
