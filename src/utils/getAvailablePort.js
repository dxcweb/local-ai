const checkPort = require("./checkPort");
const sleep = require("./sleep");

const getAvailablePort = async (port) => {
  if (await checkPort(port)) {
    await sleep(100);
    return port;
  }
  return await getAvailablePort(port + 1);
};
module.exports = getAvailablePort;
