const myExecSync = require("./myExecSync");
const mySpawnSync = require("./mySpawnSync");

const killexe = async (exeName) => {
  const stdout = await myExecSync(`tasklist /FI "IMAGENAME eq ${exeName}"`);
  const regex = /\s+(\d+)\s+Console/g;
  let match;
  while ((match = regex.exec(stdout)) !== null) {
    console.log(88, match[1]);
    try {
      await mySpawnSync("taskkill", ["/F", "/PID", match[1]]);
    } catch (e) {
      console.log("err", e);
    }
  }
};
module.exports = killexe;
