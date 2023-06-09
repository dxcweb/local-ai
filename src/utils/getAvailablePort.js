const checkPort = require("./checkPort");

const getAvailablePort = async (port) => {
  if (await checkPort(port)) return port;
  return await getAvailablePort(port + 1);
};
module.exports = getAvailablePort;
